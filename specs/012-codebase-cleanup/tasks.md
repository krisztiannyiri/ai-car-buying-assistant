# Tasks: Codebase Cleanup

## Phase 1 — Correctness (gaps 1, 2, 4, 8)

- [X] T001 Guard `JSON.parse` of the request body in `mcp-server/index.ts`; respond 400
- [X] T002 Bind `0.0.0.0` in `mcp-server/index.ts` (gap 1)
- [X] T003 Guard `JSON.parse(toolUseInputJson)` in `app/api/chat/route.ts`; emit a failed
      `__WEBHOOK_EVENT__` and close the stream on failure
- [X] T004 Guard `JSON.parse` of the MCP tool response in `lib/mcp/client.ts`; return
      `SCHEMA_MISMATCH`
- [X] T005 Return 400 instead of 500 for malformed `/api/chat` bodies
- [X] T006 Commit retry results in `retryWebhook()` — `setSearchResults`, `setTotalResultCount`,
      jump to results (gap 4)
- [X] T007 Type-guard all six unchecked fields in `normalizeN8nResponse` (gap 8)
- [X] T008 Route `/api/webhook-retry` through `callSearchCars` so validation and auth match the
      chat path (gap 2)
- [X] T009 Join `fuelType` with ` / ` in the result card spec line instead of coercing an array
- [X] T009a Wrap the whole Anthropic stream body so mid-stream API errors (rate limit, budget,
      dropped connection) surface as a failed `__WEBHOOK_EVENT__` instead of an unhandled
      rejection. Found by running the app: a `budget_exceeded` error produced an opaque HTTP 500
      and the route's entire error-mapping block was unreachable for stream errors. Extracted
      `describeUpstreamError()` so pre-stream and mid-stream paths share one mapping, and moved
      the loop into `streamConversation()`.

## Phase 2 — Dead code (gaps 5, 6, 7, 10)

- [X] T010 Remove the unused `Settings2` import; merge the duplicated chat-type imports
- [X] T011 Remove the write-only `error` state
- [X] T012 Delete `ConversationState`, `ChatInterfaceProps`, `ChatRequestBody`, and the unreachable
      `'concluding'` session status (gap 6)
- [X] T013 Delete `McpSearchResult` and `normalizeSearchResultItem` from `lib/types/mcp.ts`
- [X] T014 Delete the duplicate 7-field `VehicleResult` from `mcp-server/types.ts` (gap 7)
- [X] T015 Stop sending `roundCount` over the wire and drop the state (gap 5)
- [X] T016 Delete `app/page.module.css`
- [X] T017 Delete the commented-out `//console.log(result)` (gap 10)
- [X] T018 Delete `lib/n8n/trigger.ts` and `TriggerLogEntry`, dead once T008 landed
- [X] T019 Remove the `next.config.ts` placeholder comment

## Phase 3 — Quality (gaps 9, 13)

- [X] T020 Extract `lib/constants/sentinels.ts` and import it on both sides of the wire
- [X] T021 Rewrite `app/not-found.tsx` with Tailwind classes (gap 9)
- [X] T022 Include the array index in the synthesized vehicle `id` so duplicates get distinct keys
- [X] T023 Replace `document.querySelector('main')` with a ref
- [X] T024 Derive `PRIORITY_COUNT` from `priorityOptions.length`
- [X] T025 Move `tailwindcss` and `@tailwindcss/postcss` to `devDependencies`
- [X] T026 Raise the TypeScript target to ES2022
- [X] T027 Add an n8n healthcheck and gate `mcp-server` on `service_healthy`
- [X] T028 Fix the Dockerfile: single `npm ci`, non-root `USER node`, local `tsx` binary
- [X] T029 Mark specs 001–011 `Implemented` (gap 13)
- [X] T030 Add a `typecheck` npm script

## Phase 4 — Architecture (gaps 3, 11, 12)

- [X] T031 Narrow `KNOWN_BODY_TYPES` / `KNOWN_FUEL_TYPES` to the Data Store enums and name the
      allowed values in validation errors (gap 12)
- [X] T032 Cache tool schemas for 60 s in `lib/mcp/client.ts` (gap 11) — supersedes spec 011's
      per-request decision
- [X] T033 Rename `N8N_UNREACHABLE` → `MCP_NOT_CONFIGURED` for the unset-URL case
- [X] T034 Export the live n8n workflow to `n8n/car-search-workflow.json` with a restore
      `README.md` (gap 3)
- [X] T035 Extract `lib/wizard/config.ts` (step copy, options, initial state, limits)
- [X] T036 Extract `components/ui/` — `Logo`, `ChoiceCard`, `SegmentedControl`, `DualRangeSlider`
- [X] T037 Extract `components/layout/` — `AppSidebar`, `MobileNav`, and the shared `StepList`
- [X] T038 Extract `components/wizard/` — `StepOne`…`StepFour` plus the shared `StepProps`
- [X] T039 Extract `components/Results.tsx` and `components/ChatPanel.tsx`
- [X] T040 Extract `hooks/useWizardFlow.ts`
- [X] T041 Extract `hooks/useConversation.ts`
- [X] T042 Rewrite `App` as `components/CarBuyingAssistant.tsx` and update `app/page.tsx`
- [X] T043 Delete `components/NewDesign.tsx`; move its stylesheet to `app/globals.css`

## Phase 5 — Documentation

- [X] T044 Update `ARCHITECTURE.md` §2–§11 for the new structure, cache, and unified retry path
- [X] T045 Correct `ARCHITECTURE.md` §7 against the live workflow (the `Map Search Results` and
      `Validate User Email` nodes and the real node types were undocumented)
- [X] T046 Rewrite `ARCHITECTURE.md` §13 — remove the closed gaps, record what remains
- [X] T047 Expand `ARCHITECTURE.md` §14 with a static gate and the new failure-path checks
- [X] T048 Write this spec

## Verification

- [X] `npm run typecheck` clean
- [X] `npm run build` clean
- [X] `n8n/car-search-workflow.json` parses and its node graph matches the live instance
- [ ] Manual end-to-end pass per `ARCHITECTURE.md` §14 (requires a running stack)
