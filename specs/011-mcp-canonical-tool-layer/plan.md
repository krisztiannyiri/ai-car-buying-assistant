# Implementation Plan: MCP as Canonical Tool Layer

**Branch**: `011-mcp-canonical-tool-layer` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-mcp-canonical-tool-layer/spec.md`

## Summary

Remove the redundant `search_cars` tool schema from `app/api/chat/route.ts` and replace it with a per-request schema fetch from the MCP server via `listTools()`. The route keeps manual tool execution (hybrid approach) so it can inject `isRefinement` and `userEmail` into every tool call. The MCP server is also cleaned up: `isRefinement`/`userEmail` are removed from the tool's `inputSchema` (they are route-level context, not AI-filled), and the unused `list_body_types` tool is deleted.

## Technical Context

**Language/Version**: TypeScript 5

**Primary Dependencies**: `@anthropic-ai/sdk` ^0.115.0, `@modelcontextprotocol/sdk` ^1.30.0, Next.js 16.3 (App Router)

**Storage**: N/A

**Testing**: None (per constitution Principle V)

**Target Platform**: Node.js (Next.js API route — server-side only)

**Project Type**: Web service

**Performance Goals**: Schema fetch is a local round-trip (same host/Docker network) — sub-10ms expected; no measurable impact on total request latency.

**Constraints**: Route must remain stateless; no shared singletons introduced.

**Scale/Scope**: Single route file, one MCP client utility, one MCP server tool file, one registry file.

## Constitution Check

_GATE: Must pass before implementation. Re-checked after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| I. Clean Code | PASS | Removing duplicate schema eliminates drift risk; `fetchMcpToolSchemas` is a named, single-responsibility function |
| II. Simple UX | PASS | No user-facing change |
| III. Responsive Design | PASS | No UI change |
| IV. Minimal Dependencies | PASS | No new dependencies; uses already-present `@modelcontextprotocol/sdk` Client API |
| V. No Automated Testing | PASS | No test files introduced |

No violations. No complexity tracking required.

## Project Structure

### Documentation (this feature)

```text
specs/011-mcp-canonical-tool-layer/
├── plan.md              ✓ this file
├── research.md          ✓ Phase 0 output
├── data-model.md        ✓ Phase 1 output
├── quickstart.md        ✓ Phase 1 output
├── contracts/           ✓ Phase 1 output
└── tasks.md               Phase 2 output (/speckit-tasks)
```

### Source Code (files changed by this feature)

```text
lib/
└── mcp/
    └── client.ts          ← add fetchMcpToolSchemas()

app/
└── api/
    └── chat/
        └── route.ts       ← remove searchCarsTool + SearchCarsInput; call fetchMcpToolSchemas()

mcp-server/
└── tools/
    ├── search-cars.ts     ← remove isRefinement + userEmail from inputSchema
    ├── list-body-types.ts ← DELETE
    └── registry.ts        ← remove registerListBodyTypesTool registration
```

**Structure Decision**: Existing Next.js App Router layout is preserved. No new directories or files are added — only edits to existing files and deletion of one obsolete file.
