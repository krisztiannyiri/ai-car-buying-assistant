# Research: MCP Vehicle Search Layer

**Feature**: 009-mcp-vehicle-search | **Date**: 2026-08-11

## Decision 1: MCP Transport

**Decision**: HTTP — `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`

**Rationale**: The AI agent in this project is Claude running inside a Next.js API route (`app/api/chat/route.ts`). Claude is invoked via the Anthropic SDK; tool execution happens in the route handler code. The MCP server must be callable from Node.js server-side code without requiring a public URL (which the Anthropic API's `mcp_servers` feature requires) and without subprocess lifecycle management (which stdio requires). HTTP transport running on a local port satisfies both constraints and is the transport recommended for server-to-server MCP communication in the MCP SDK docs.

**Alternatives considered**:
- **stdio transport** — Rejected: requires spawning a subprocess from within the Next.js route handler on each request, which is problematic in a serverless/App Router environment and violates the Clean Code principle by mixing process management into the request handler.
- **Anthropic API `mcp_servers` beta feature** — Rejected: requires the MCP server to be publicly accessible (the Anthropic API calls it server-side), which is incompatible with a local development setup without an ngrok-style tunnel.

---

## Decision 2: MCP Server Packaging

**Decision**: MCP server code in `mcp-server/` directory at the project root, sharing the root `package.json`

**Rationale**: A separate `package.json` for the MCP server would require a separate `npm install`, independent `tsconfig.json`, and separate build pipeline — overhead that violates Minimal Dependencies (Constitution IV). Sharing the root `package.json` means one install, one `tsconfig.json` reference, and the same TypeScript version. The `mcp-server/` directory provides clean code separation without creating a separate package.

**Alternatives considered**:
- **Separate npm package (`packages/mcp-server/`)** — Rejected: over-engineered for a project of this scope; adds a monorepo tooling requirement.
- **Inline in the Next.js app** — Rejected: the MCP server is a separate long-running process; bundling it with Next.js would create import confusion and lifecycle mismatches.

---

## Decision 3: `search_cars` Tool Interface — Alignment with Existing `CarSearchPayload`

**Decision**: The `search_cars` MCP tool accepts all fields from the existing `CarSearchPayload` (minus conversation metadata: `endTrigger`, `isRefinement`, `userEmail`). These metadata fields are passed separately or defaulted.

**Rationale**: The spec's `Search Filters` entity (make, model, year range, price range, etc.) is a conceptual description of the tool's purpose. The existing `CarSearchPayload` is what n8n actually consumes, and the assumption in the spec states the n8n webhook contract remains unchanged. The existing fields cover the spec's conceptual filters (bodyTypes ≈ body type, fuelTypes ≈ fuel type, yearMin/yearMax ≈ year range, budgetMax ≈ price maximum, etc.). The fields not in the spec's conceptual list (engineDisplacements, usageContext, features, minSeats, annualMileage) are existing fields that n8n uses for filtering; removing them would require n8n changes, which is out of scope.

For the three metadata fields:
- `endTrigger` — carried in the `search_cars` tool input (Claude already sets it; needed by n8n)
- `isRefinement` — injected by the Next.js route handler from request context (not a search filter)
- `userEmail` — injected by the Next.js route handler from request context (not a search filter)

**Alternatives considered**:
- **Strict spec filter set (make, model, year, price, mileage, fuel, transmission, body)** — Rejected: requires breaking changes to the n8n workflow, which the spec explicitly prohibits.
- **Full `CarSearchPayload` passthrough including metadata** — Rejected: conflates search parameters with conversation metadata; makes the tool contract less readable and validation more complex.

---

## Decision 4: Agent Tool Rename

**Decision**: Replace the `conclude_conversation` Claude tool with `search_cars` in `app/api/chat/route.ts`; update the system prompt accordingly

**Rationale**: FR-007 requires the agent to route all vehicle search requests through the MCP server. The current `conclude_conversation` tool directly calls `fireWebhookWithRetry`, which violates this requirement. Renaming to `search_cars` aligns the tool name with the MCP interface and the spec. The system prompt's conversational flow (gather lifestyle questions → call tool when ready) is preserved; only the tool name and execution path change.

**Alternatives considered**:
- **Keep `conclude_conversation`, add `search_cars` as second tool** — Rejected: creates ambiguity about which tool to call; complicates the system prompt.
- **Keep `conclude_conversation` but change its backend execution** — Rejected: the spec explicitly names the MCP-exposed tool `search_cars`; keeping the old name would obscure the architectural change.

---

## Decision 5: Validation Strategy in the MCP Server

**Decision**: Validate using explicit type checks and range guards in `search-cars.ts` rather than a validation library

**Rationale**: Constitution IV (Minimal Dependencies) requires every new dependency to be justified. A validation library (e.g., Zod) would duplicate what TypeScript's type system already enforces at compile time for internal code paths. The validation in the MCP server needs to check value ranges (price > 0, year in realistic range, known enum values) — this is straightforward to implement in plain TypeScript. The error response must produce `{ code, message, details[] }` (per FR-003), which maps directly to conditional checks without needing a schema library.

**Alternatives considered**:
- **Zod** — Rejected: would add a new dependency. The validation rules for `CarSearchPayload` fields are simple range/enum checks implementable in ~50 lines of TypeScript.

---

## Decision 6: `lib/n8n/trigger.ts` Disposition

**Decision**: Retain `lib/n8n/trigger.ts` unchanged; remove its call from `app/api/chat/route.ts`

**Rationale**: `lib/n8n/trigger.ts` contains the `fireWebhookWithRetry` function. The MCP server will re-implement n8n forwarding internally (in `mcp-server/tools/search-cars.ts`) with the 5-second timeout (replacing the current 30-second timeout). Retaining the original file avoids the risk of losing useful reference code for the webhook retry pattern; it simply becomes unused by the chat route. The Clean Code principle (no dead code) suggests it should eventually be deleted once the MCP path is proven, but that is a post-feature cleanup, not a blocker.

**Alternatives considered**:
- **Delete `trigger.ts` immediately** — Rejected: the n8n-retry pattern in `trigger.ts` is useful reference during implementation; deletion can happen in a follow-up cleanup.
- **Reuse `trigger.ts` from the MCP server** — Rejected: the MCP server lives in `mcp-server/` and should not import from `lib/` (which is a Next.js-specific path alias); this would couple the MCP server to the Next.js project layout.
