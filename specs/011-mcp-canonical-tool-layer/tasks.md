# Tasks: MCP as Canonical Tool Layer

**Input**: Design documents from `specs/011-mcp-canonical-tool-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: None — per constitution Principle V (no automated testing).

**Organization**: Tasks are grouped by user story. US1 is the primary implementation; US2 and US3 are fully satisfied as a consequence of completing Foundational + US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- No Setup phase — this is a pure refactor of existing code, no project initialisation needed

---

## Phase 1: Foundational — MCP Server Cleanup

**Purpose**: Clean the MCP tool definitions so the schemas fetched by the route are correct and minimal. Must complete before route changes so the schema the route fetches is already clean.

**⚠️ CRITICAL**: US1 implementation (Phase 2) depends on these changes being in place.

- [X] T001 [P] Remove `isRefinement` and `userEmail` fields from `inputSchema` in `mcp-server/tools/search-cars.ts` (keep them in the Zod parse and `executeSearchCars` signature — only remove from the exported `inputSchema` object)
- [X] T002 [P] Delete file `mcp-server/tools/list-body-types.ts`
- [X] T003 Remove `registerListBodyTypesTool` import and its call from `mcp-server/tools/registry.ts` (depends on T002)

**Checkpoint**: MCP server now exposes only `search_cars` with a clean schema (no route-level fields, no unused tools). Verify by running `npm run dev:mcp` and calling `curl -X POST http://localhost:3001/mcp -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'` — response should list only `search_cars` without `isRefinement`/`userEmail` in its schema.

---

## Phase 2: User Story 1 — Car Search Works End-to-End After Refactor (Priority: P1) 🎯 MVP

**Goal**: Replace the hardcoded `searchCarsTool` in the route with a per-request schema fetch from the MCP server. The route retains manual tool execution so it can inject `isRefinement` and `userEmail`.

**Independent Test**: Submit any car search in the running app → results appear. MCP server logs show a `tools/list` call followed by `tools/call (search_cars)` for every request.

### Implementation for User Story 1

- [X] T004 [US1] Add `fetchMcpToolSchemas(): Promise<Anthropic.Tool[]>` function to `lib/mcp/client.ts` — connect to MCP server, call `client.listTools()`, map each tool to `{ name, description, input_schema: tool.inputSchema }` (key rename only), close in `finally`, throw on any error
- [X] T005 [US1] Remove `searchCarsTool` constant and `SearchCarsInput` interface from `app/api/chat/route.ts`
- [X] T006 [US1] Add `fetchMcpToolSchemas` to the import from `@/lib/mcp/client` in `app/api/chat/route.ts`
- [X] T007 [US1] In the POST handler in `app/api/chat/route.ts`, call `fetchMcpToolSchemas()` before the Anthropic API call and assign the result to a `tools` variable; replace `tools: [searchCarsTool]` in the `client.messages.stream(...)` call with `tools` (the fetched array)
- [X] T008 [US1] In the outer `try/catch` of the POST handler in `app/api/chat/route.ts`, handle the case where `fetchMcpToolSchemas()` throws — map `Anthropic.APIConnectionError`-style errors to a 503 `connection` response and anything else to a 502 `api_error` response (same pattern as the existing Anthropic error handling below)

**Checkpoint**: At this point User Story 1 is complete. The route fetches schemas from MCP per-request and no inline schema object exists in the route file. US2 and US3 are also satisfied — see checkpoints below.

---

## Phase 3: User Story 2 — Tool Schema Maintained in One Place (Priority: P2)

**Goal**: Confirm the MCP registry is the single source of truth and a schema change in MCP is immediately reflected without touching the route.

**Independent Test**: `grep -n "searchCarsTool\|SearchCarsInput\|input_schema" app/api/chat/route.ts` returns zero matches.

> **No additional implementation tasks.** US2 is fully delivered by Foundational (T001–T003) and US1 (T004–T008). The tasks below are acceptance verifications only.

- [X] T009 [US2] Run schema deduplication check: `grep -rn "searchCarsTool\|SearchCarsInput" app/` → expect zero matches confirming the inline schema is gone

**Checkpoint**: Single source of truth confirmed. A developer can update `mcp-server/tools/search-cars.ts` and the route will use the new schema on the next request with no code change.

---

## Phase 4: User Story 3 — Route Responsibilities Clearly Separated (Priority: P3)

**Goal**: The route file contains no tool schema definitions, no `SearchCarsInput` type, and no inline MCP schema objects.

**Independent Test**: Reading `app/api/chat/route.ts` reveals only: system prompt construction, `fetchMcpToolSchemas()` call, Anthropic stream setup, tool_use interception, and `WebhookEvent` emission.

> **No additional implementation tasks.** US3 is fully delivered by US1 (T005–T008). The task below is a final acceptance verification.

- [X] T010 [US3] Read `app/api/chat/route.ts` and confirm it contains: no `Anthropic.Tool` literals, no `input_schema` object literals, no `SearchCarsInput` type, and no `callSearchCars` arguments beyond what existed before (the `isRefinement`/`userEmail` injection in the stream handler should remain intact)

**Checkpoint**: All three user stories are independently verifiable and complete.

---

## Phase 5: Polish & Validation

**Purpose**: Type safety confirmation and end-to-end validation per quickstart.md.

- [X] T011 [P] TypeScript compile check: run `npx tsc --noEmit` from repo root — expect zero errors
- [ ] T012 Manual end-to-end validation: run through all 6 scenarios in `specs/011-mcp-canonical-tool-layer/quickstart.md` with both dev servers running

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Foundational complete — T004 can start in parallel with Foundational since it's in a different file (`lib/mcp/client.ts`); T005–T008 must wait for T001–T003
- **US2 (Phase 3)**: Depends on Foundational + US1 — verification only
- **US3 (Phase 4)**: Depends on US1 — verification only
- **Polish (Phase 5)**: Depends on all phases complete

### Within Phase 2 (US1)

- T004 can start in parallel with Foundational (different file)
- T005, T006, T007, T008 are sequential (same file — `app/api/chat/route.ts`)
- T005 before T006 (remove old import/type before adding new import)
- T007 after T006 (use `tools` variable after it's declared)
- T008 after T007 (error handling wraps the full flow)

### Parallel Opportunities

- T001, T002: parallel (different files)
- T003: after T002 (removes import of deleted file)
- T004: parallel with T001–T003 (different module — `lib/mcp/client.ts`)
- T009, T010, T011: parallel (independent verifications)

---

## Parallel Example: Foundational + US1 Start

```bash
# Can run simultaneously:
Task T001: "Remove isRefinement + userEmail from inputSchema in mcp-server/tools/search-cars.ts"
Task T002: "Delete mcp-server/tools/list-body-types.ts"
Task T004: "Add fetchMcpToolSchemas() to lib/mcp/client.ts"

# After T002:
Task T003: "Remove registerListBodyTypesTool from mcp-server/tools/registry.ts"

# After T001, T002, T003, T004:
Tasks T005 → T006 → T007 → T008 (sequential, same file)
```

---

## Implementation Strategy

### MVP (User Story 1 Only — 8 tasks)

1. Complete Phase 1: Foundational (T001–T003) — MCP server cleanup
2. Complete Phase 2: US1 (T004–T008) — schema fetch + route update
3. **STOP and VALIDATE**: Run quickstart.md scenarios 1–4, check MCP server logs
4. Ship — US2 and US3 are satisfied automatically

### Full Delivery (All Stories — 12 tasks)

1. MVP above
2. Run Phase 3–4 verifications (T009, T010)
3. Polish (T011, T012)

---

## Notes

- [P] tasks touch different files — no conflict risk
- T001–T003 modify/delete the MCP server; T004–T008 modify Next.js route and library — these are independent codebases and can be worked in parallel
- No test files to create (constitution Principle V)
- TypeScript's `tsc --noEmit` (T011) is the primary correctness gate
- After T002 (file delete), confirm `registry.ts` import does not reference the deleted file before committing
