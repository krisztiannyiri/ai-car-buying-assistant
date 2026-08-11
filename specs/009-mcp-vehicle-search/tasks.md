---
description: 'Task list for 009-mcp-vehicle-search'
---

# Tasks: MCP Vehicle Search Layer

**Input**: Design documents from `/specs/009-mcp-vehicle-search/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: Not included — Constitution Principle V prohibits all automated test frameworks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

All paths are relative to the repository root (`/home/krisztianyiri/ai-car-buying-assistant/`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependency, create directory skeleton, and define shared TypeScript types.

- [x] T001 Add `@modelcontextprotocol/sdk` to `dependencies` in `package.json` and add `"dev:mcp": "npx ts-node mcp-server/index.ts"` (or `tsx`) to `scripts`; run `npm install`
- [x] T002 Create `mcp-server/` directory and `mcp-server/tools/` subdirectory at the repository root
- [x] T003 [P] Create `lib/types/mcp.ts` defining `NormalizedResponse` (fields: `results: VehicleResult[]`, `totalCount: number`) and `ErrorEnvelope` (fields: `code: string`, `message: string`, `details: string[]`) — types align with `contracts/search-cars-tool.md`
- [x] T004 [P] Create `mcp-server/types.ts` defining `SearchFilters` (all fields from `contracts/search-cars-tool.md` input schema) and `VehicleResult` (fields: `id`, `make`, `model`, `bodyType`, `year`, `price`, `sourceUrl` — from `data-model.md`)

**Checkpoint**: Dependency installed, directories created, shared types defined. Ready for foundational infrastructure.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core MCP server process and client factory that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `mcp-server/index.ts`: start an HTTP MCP server using `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` on `process.env.MCP_SERVER_PORT ?? 3001`; no tools registered yet — server starts and responds to capability negotiation
- [x] T006 Create `lib/mcp/client.ts`: export a factory function that creates and connects an MCP `Client` (from `@modelcontextprotocol/sdk`) to `process.env.MCP_SERVER_URL`; export a typed `callSearchCars(filters: SearchFilters): Promise<NormalizedResponse | ErrorEnvelope>` wrapper
- [x] T007 [P] Document the three new environment variables in `.env.example` (or `.env.local.example` if that file exists): `MCP_SERVER_PORT=3001`, `MCP_SERVER_URL=http://localhost:3001/mcp`, `N8N_WEBHOOK_AUTH_TOKEN=` (empty by default)

**Checkpoint**: MCP server starts, MCP client connects. Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Structured Vehicle Search via MCP (Priority: P1) 🎯 MVP

**Goal**: End-to-end vehicle search flows through the MCP server — agent calls `search_cars`, MCP server forwards to n8n, normalizes results, returns to agent. The direct `fireWebhookWithRetry` call is removed from the chat route.

**Independent Test**: Open the chat interface, complete a conversation until the agent triggers a search, confirm vehicle results appear. Verify the MCP server terminal shows no output (successful request — no log per FR-012) and the n8n execution log shows one new execution.

### Implementation for User Story 1

- [x] T008 [US1] Implement n8n forwarding in `mcp-server/tools/search-cars.ts`: accept validated `SearchFilters` plus injected `isRefinement: boolean` and `userEmail: string | null`; build `CarSearchPayload` (from `lib/types/n8n.ts`) by spreading `SearchFilters` and merging metadata; POST to `process.env.N8N_WEBHOOK_CAR_SEARCH_URL` using `fetch` with `AbortSignal.timeout(5000)`; map fetch/network errors → `ErrorEnvelope { code: 'N8N_UNREACHABLE' }`, non-2xx status → `ErrorEnvelope { code: 'N8N_ERROR', details: [HTTP status] }`, timeout → `ErrorEnvelope { code: 'TIMEOUT' }`
- [x] T009 [US1] Implement response normalization in `mcp-server/tools/search-cars.ts`: parse n8n JSON response; map each `SearchResultItem` to `VehicleResult` (synthesize `id` as `"${make}-${model}-${year}"` since n8n does not return an explicit id yet); if response body shape is unexpected (missing `results` array or items missing required fields), emit a `console.warn` log identifying the mismatched fields per FR-012 and return a partial `NormalizedResponse` with whatever was parseable; return `NormalizedResponse { results: VehicleResult[], totalCount: number }`
- [x] T010 [US1] Implement optional auth header injection in `mcp-server/tools/search-cars.ts`: read `process.env.N8N_WEBHOOK_AUTH_TOKEN`; if non-empty, add `Authorization: Bearer <token>` to the fetch headers (FR-011)
- [x] T011 [US1] Register `search_cars` tool in `mcp-server/index.ts`: call `server.tool('search_cars', <description>, <inputSchema>)` using the JSON Schema from `contracts/search-cars-tool.md`; the handler calls the function from `mcp-server/tools/search-cars.ts` and returns the result
- [x] T012 [US1] Update `app/api/chat/route.ts` tool definition: rename `conclude_conversation` to `search_cars` in `const searchCarsTool: Anthropic.Tool`; update `name`, `description`, and `input_schema` to match `contracts/search-cars-tool.md` (remove `endTrigger` being Claude's only way to end the conversation — it is now part of the search_cars input); update all references in `buildSystemPrompt` that mention `conclude_conversation`
- [x] T013 [US1] Update `app/api/chat/route.ts` tool execution: in the `content_block_stop` handler where `toolUseName === 'search_cars'`, replace the `fireWebhookWithRetry(webhookUrl, payload)` call with `callSearchCars({ ...toolInput, isRefinement, userEmail })` from `lib/mcp/client.ts`; map the returned `NormalizedResponse | ErrorEnvelope` to the existing `WebhookEvent` structure so the `__WEBHOOK_EVENT__` stream marker and `ChatInterface` remain unchanged

**Checkpoint**: User Story 1 fully functional. A complete end-to-end search delivers results through the MCP layer. Direct n8n calls are gone from `route.ts`.

---

## Phase 4: User Story 2 — Invalid Search Parameters Rejected at MCP Layer (Priority: P2)

**Goal**: Malformed `search_cars` inputs are caught and rejected by the MCP server before any n8n call is made, returning a structured `ErrorEnvelope` with `code: VALIDATION_ERROR`.

**Independent Test**: Send `search_cars` calls with bad params (e.g., `budgetMax: -500`, `yearMin: 2025, yearMax: 2018`, unknown body type). Confirm: (a) MCP server logs the failure (FR-012), (b) n8n receives no new execution, (c) the agent receives a structured error — not a crash.

### Implementation for User Story 2

- [x] T014 [US2] Implement `validateSearchFilters(filters: SearchFilters): ErrorEnvelope | null` in `mcp-server/tools/search-cars.ts`: check all rules from `contracts/search-cars-tool.md` — `budgetMax` > 0 if present; each `bodyTypes` element in the known set; each `fuelTypes` element in the known set; each `engineDisplacements` element in the known set; `yearMin` and `yearMax` in [1900, currentYear+1] if present, and `yearMin` ≤ `yearMax` if both present; `minSeats` ≥ 1 if present; each `features[].name` non-empty; return `ErrorEnvelope { code: 'VALIDATION_ERROR', message: '...', details: ['fieldName: reason', ...] }` listing all failing fields, or `null` if all valid
- [x] T015 [US2] Integrate validation in `mcp-server/tools/search-cars.ts` handler: call `validateSearchFilters` before any n8n forwarding; on non-null result, emit `console.error` log identifying the invalid fields per FR-012, then return the `ErrorEnvelope` immediately (early return, no n8n call made)

**Checkpoint**: User Stories 1 and 2 both work independently. Invalid inputs are rejected at the MCP boundary.

---

## Phase 5: User Story 3 — MCP Server Supports Future Tool Additions (Priority: P3)

**Goal**: The MCP server's tool registration is structured so a second tool can be added without touching `search-cars.ts` or any server core infrastructure.

**Independent Test**: Register a stub second tool (`list_body_types`), restart only the MCP server, confirm both tools appear in the tool manifest and `search_cars` still works end-to-end.

### Implementation for User Story 3

- [x] T016 [P] [US3] Refactor `mcp-server/index.ts`: extract tool registration into a `registerTools(server: McpServer): void` function (or equivalent array-driven loop); each tool is registered by calling `server.tool(...)` once — adding a new tool means appending one more `server.tool(...)` call without modifying the HTTP server setup, transport, or port logic
- [x] T017 [P] [US3] Create `mcp-server/tools/list-body-types.ts`: implement a stub tool that accepts no arguments and returns the static list of known body types from `data-model.md`; register it in `mcp-server/index.ts` via the pattern established in T016

**Checkpoint**: All three user stories independently functional. Adding a third tool in the future requires only a new file in `mcp-server/tools/` and one line in `mcp-server/index.ts`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Launch configuration, compliance verification, and quickstart validation.

- [x] T018 [P] Add MCP server launch to `docker-compose.yml` as a `mcp-server` service (if n8n is already a service there), or confirm `npm run dev:mcp` is the sole canonical launch path and document it in `README.md`
- [x] T019 Verify FR-007 compliance: search `app/api/chat/route.ts` for any remaining direct reference to `N8N_WEBHOOK_CAR_SEARCH_URL` or `fireWebhookWithRetry` — confirm zero matches
- [x] T020 Run all validation scenarios from `quickstart.md`: SC-001 end-to-end search, SC-002 invalid param rejection (two variants), SC-003 consistent response format (results / no results / timeout), SC-004 new tool addition, FR-011 auth header, FR-012 logging behaviour

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (types needed for T005, T006) — **blocks all user stories**
- **User Story Phases (3–5)**: All depend on Phase 2 completion; stories can proceed sequentially in priority order (P1 → P2 → P3) or in parallel if staffed
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2); no dependency on US2 or US3
- **US2 (P2)**: Depends on Foundational (Phase 2); validation code lives in the same file as US1's forwarding logic — implement US1 first so the file structure exists before adding validation
- **US3 (P3)**: Depends on Foundational (Phase 2); T016 refactors `index.ts` which T011 (US1) must have already touched — implement US1 first

### Within Each User Story

- T008, T009, T010 (US1) are logically sequential within `search-cars.ts` — implement in order
- T012 before T013 (both in `route.ts`) — rename tool definition before changing execution path
- T014 before T015 (US2) — implement validation function before integrating it
- T016 before T017 (US3) — establish registry pattern before adding stub tool

### Parallel Opportunities

- T003 and T004 (Phase 1) can run in parallel — different files
- T016 and T017 (US3) are marked [P] but both touch `index.ts` via T016; T017 adds a new file — sequential is safer, both are fast
- T018 and T019 (Polish) can run in parallel — different files

---

## Parallel Example: User Story 1

```
# Phase 1 parallel setup:
Task T003: Create lib/types/mcp.ts
Task T004: Create mcp-server/types.ts

# US1 sequential implementation (same file — mcp-server/tools/search-cars.ts):
Task T008 → Task T009 → Task T010 → Task T011

# US1 route update (same file — app/api/chat/route.ts):
Task T012 → Task T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T007)
3. Complete Phase 3: User Story 1 (T008–T013)
4. **STOP and VALIDATE**: run SC-001 from `quickstart.md`
5. The full search path works end-to-end through MCP — ship as MVP

### Incremental Delivery

1. Phase 1 + Phase 2 → infrastructure ready
2. Phase 3 (US1) → end-to-end search via MCP (MVP)
3. Phase 4 (US2) → input validation hardened
4. Phase 5 (US3) → extensibility proven
5. Phase 6 → polish and sign-off

---

## Notes

- No test files — Constitution Principle V
- `lib/n8n/trigger.ts` is intentionally left on disk (per `research.md` Decision 6); do NOT delete it during this feature
- `isRefinement` and `userEmail` are injected by `route.ts` from request context — they are NOT filled by Claude. T013 handles merging these fields before calling `callSearchCars`
- The `id` field synthesis (`"${make}-${model}-${year}"`) is a temporary measure noted in `data-model.md`; it will be replaced when n8n exposes an explicit identifier field
- Each task targets a specific file — verify no two concurrent tasks write to the same file without a stated dependency
