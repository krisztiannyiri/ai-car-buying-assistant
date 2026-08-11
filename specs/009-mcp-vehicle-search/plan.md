# Implementation Plan: MCP Vehicle Search Layer

**Branch**: `009-mcp-vehicle-search` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-mcp-vehicle-search/spec.md`

## Summary

Add a custom MCP server as the structured vehicle search intermediary between the AI agent and the n8n workflow. The agent's `conclude_conversation` tool is replaced by a `search_cars` tool whose execution is routed through a locally-running MCP server. The MCP server validates incoming search parameters, forwards them to the existing n8n webhook, normalizes the response into a consistent envelope, and returns it to the agent. The n8n workflow and mock database are unchanged.

## Technical Context

**Language/Version**: TypeScript 5 (Node.js 20+)

**Primary Dependencies**:
- `@anthropic-ai/sdk ^0.115.0` — existing; unchanged
- `next 16.3.0` — existing; unchanged
- `@modelcontextprotocol/sdk` — new; MCP server and client implementation

**Storage**: N/A — the MCP server is stateless

**Testing**: None — Constitution Principle V prohibits all automated test frameworks

**Target Platform**: Node.js 20+ (Next.js App Router for the MCP client; standalone Node.js process for the MCP server)

**Performance Goals**: Total added latency from MCP layer ≤ 100ms; n8n call timeout enforced at 5 seconds inside the MCP server

**Constraints**: No test framework; minimal new dependencies; MCP server runs as a separate local process alongside the Next.js dev server

**Scale/Scope**: Local development; single concurrent user

## Constitution Check

| Principle | Status | Notes |
| --- | --- | --- |
| I. Clean Code | ✅ Pass | MCP server organized into discrete modules: validation, forwarding, normalization, types |
| II. Simple UX | N/A | No user-facing UI changes |
| III. Responsive Design | N/A | No UI changes |
| IV. Minimal Dependencies | ✅ Pass | One new package: `@modelcontextprotocol/sdk`. Justified: no existing capability covers MCP protocol; hand-rolling it would duplicate the spec. No other new packages. |
| V. No Automated Testing | ✅ Pass | No test files, runners, or testing utilities added |

_Post-Phase-1 re-check_: ✅ Pass — no new violations introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/009-mcp-vehicle-search/
├── plan.md                      # This file
├── research.md                  # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                # Phase 1 output
├── contracts/
│   └── search-cars-tool.md      # MCP tool contract (input/output schema)
└── tasks.md                     # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
mcp-server/
├── index.ts               # Entry point: starts HTTP MCP server on MCP_SERVER_PORT
├── tools/
│   └── search-cars.ts     # search_cars tool: validates params → calls n8n → normalizes response
└── types.ts               # Shared types: SearchFilters, VehicleResult, NormalizedResponse, ErrorEnvelope

lib/
├── mcp/
│   └── client.ts          # MCP client factory used by the Next.js API route
├── n8n/
│   └── trigger.ts         # RETAINED (not deleted); direct call removed from chat route
└── types/
    ├── chat.ts            # UNCHANGED
    ├── n8n.ts             # UNCHANGED (CarSearchPayload, SearchResultItem still used by MCP server)
    └── mcp.ts             # NEW: NormalizedResponse, ErrorEnvelope TypeScript types

app/api/chat/route.ts      # UPDATED: search_cars tool replaces conclude_conversation;
                           #          tool execution calls MCP client instead of fireWebhookWithRetry
```

**Structure Decision**: Single project (Option 1). The MCP server lives in `mcp-server/` at the project root and shares the root `package.json` to avoid a separate install step. `@modelcontextprotocol/sdk` is added to root `dependencies`. The MCP server is launched as a separate Node.js process via a new `dev:mcp` npm script.

## Complexity Tracking

No constitution violations requiring justification.
