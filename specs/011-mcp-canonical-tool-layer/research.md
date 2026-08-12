# Research: MCP as Canonical Tool Layer

## Decision 1: Schema key name conversion (MCP → Anthropic)

**Decision**: Rename `inputSchema` → `input_schema` when converting MCP tool definitions for the Anthropic API.

**Rationale**: The MCP SDK's `listTools()` returns tools with `inputSchema` (camelCase). The Anthropic SDK's `Tool` interface requires `input_schema` (snake_case). This is a one-liner rename with no structural changes needed — the rest of the schema shape is identical.

**Alternatives considered**: Casting the object with `as unknown as Anthropic.Tool` and avoiding the rename — rejected because it produces a runtime bug (Anthropic API silently ignores an unknown key).

---

## Decision 2: Schema fetching utility placement

**Decision**: Add a `fetchMcpToolSchemas(): Promise<Anthropic.Tool[]>` function to the existing `lib/mcp/client.ts` file alongside `callSearchCars`.

**Rationale**: `lib/mcp/client.ts` already owns all MCP connection logic. Keeping both fetch and execution in one module avoids a new file and keeps the MCP boundary clear. The `Client` + `StreamableHTTPClientTransport` setup pattern is identical for both operations — reuse the pattern, not a shared instance (per-call connections are stateless and already validated by `callSearchCars`).

**Alternatives considered**: A separate `lib/mcp/schema.ts` — rejected as unnecessary; the module is small and both functions share the same URL and transport setup.

---

## Decision 3: `isRefinement` / `userEmail` removal from MCP inputSchema

**Decision**: Remove `isRefinement` and `userEmail` from the `inputSchema` in `mcp-server/tools/search-cars.ts`. Keep them in the Zod parse and `executeSearchCars` signature so the route can still pass them via `callSearchCars`.

**Rationale**: These fields are route-level context, never filled by the AI. If they appear in the schema shown to Claude (after the schema fetch), Claude might try to fill them or include them in the tool call, which would be incorrect. Removing them from `inputSchema` means Claude never sees them, while the MCP server still accepts and uses them when the route injects them via `callSearchCars`.

**Alternatives considered**: Filtering them out in the adapter (`fetchMcpToolSchemas`) — rejected because the fix belongs at the source (MCP tool definition), not the consumer.

---

## Decision 4: `list_body_types` removal

**Decision**: Delete `mcp-server/tools/list-body-types.ts` and remove its registration from `mcp-server/tools/registry.ts`.

**Rationale**: The tool is a hardcoded static list that duplicates a constant already defined inside `search-cars.ts` (`KNOWN_BODY_TYPES`). It is never called from the chat route and serves no user-facing function in the current flow. Keeping it means it gets included in the `listTools()` result and passed to Claude, which could distract the model. Removing it simplifies the registry and the tool context.

**Alternatives considered**: Keeping it for potential future use — rejected per constitution Principle IV (Minimal Dependencies / no speculative code) and Principle I (dead code must be removed).

---

## Decision 5: MCP client connection lifecycle for schema fetching

**Decision**: `fetchMcpToolSchemas` creates a new MCP `Client` + `StreamableHTTPClientTransport` per request, connects, calls `listTools()`, then closes in a `finally` block — identical lifecycle to `callSearchCars`.

**Rationale**: The MCP server is stateless and local (same host/Docker network). Per-request connections are cheap, already proven by `callSearchCars`, and keep the route handler stateless. No shared singleton is introduced.

**Alternatives considered**: Singleton MCP client shared across requests — rejected because it introduces connection lifecycle complexity (reconnect on failure, stale connection handling) with no meaningful latency benefit for a local service.

---

## Decision 6: Error handling for failed schema fetch

**Decision**: If `fetchMcpToolSchemas()` throws, the error propagates to the route's outer `try/catch`, which maps it to a 503 `connection` or 502 `api_error` response — the same pattern already used for Anthropic API errors.

**Rationale**: A schema fetch failure means no tool can be passed to Claude, making the request impossible. Failing fast with a clear error is correct. No stale fallback.

**Alternatives considered**: Returning an empty tool list on fetch failure (so the request proceeds without tools) — rejected because Claude would then never call `search_cars`, producing a broken user experience silently.
