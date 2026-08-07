# Tasks: Chat Search Feedback

**Input**: Design documents from `specs/008-chat-search-feedback/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: None (Constitution Principle V — No Automated Testing)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this is a feature addition to an existing Next.js project. No new directories, config files, or npm packages are required.

*(No tasks — project already initialized)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type definitions and the updated n8n trigger layer that all three user stories depend on. Must complete before any user story work begins.

**⚠️ CRITICAL**: US1, US2, and US3 all depend on the type additions and the trigger-layer update in this phase.

- [X] T001 [P] Add `SearchResultItem` interface, extend `WebhookResult` with `results?: SearchResultItem[]` and `totalCount?: number`, and extend `WebhookEvent` with `results?: SearchResultItem[]` and `totalCount?: number` in `lib/types/n8n.ts`
- [X] T002 [P] Extend `Message` interface with optional `searchResults?: { items: SearchResultItem[]; totalCount: number }` and add `isSearching: boolean` to `ConversationState` in `lib/types/chat.ts`
- [X] T003 Update `lib/n8n/trigger.ts` to parse the JSON response body returned by n8n and populate `results` and `totalCount` on the returned `WebhookResult`, and apply `AbortSignal.timeout(30_000)` per individual fetch attempt (depends on T001)

**Checkpoint**: Types and trigger layer ready — user story phases can now proceed.

---

## Phase 3: User Story 1 — Search Completes with Results (Priority: P1) 🎯 MVP

**Goal**: After a search completes with at least one match, a compact result list appears as a bot message in the chat window.

**Independent Test**: Submit a car search query that returns at least one result; verify a feedback message listing up to 5 cars appears in the chat (no email check required).

### n8n Workflow Changes (n8n UI — no code files)

- [X] T004 [US1] In the n8n UI: change the Webhook trigger node `Response Mode` from `Immediately` to `Using Respond to Webhook Node`
- [X] T005 [P] [US1] In the n8n UI: add a Code node on the success path to map `CarListing` fields to `SearchResultItem` shape per the field-mapping table in `specs/008-chat-search-feedback/data-model.md` (make, model, bodyType, year, price, sourceUrl)
- [X] T006 [P] [US1] In the n8n UI: add a Respond to Webhook node as the terminal success-path node wired to return `{ "status": "success", "results": $json.mappedResults, "totalCount": $json.totalCount }` matching `specs/008-chat-search-feedback/contracts/n8n-webhook-response.schema.json`

### Implementation

- [X] T007 [US1] Modify `app/api/chat/route.ts` to forward `results` and `totalCount` from `WebhookResult` into the `WebhookEvent` sentinel JSON payload (depends on T001, T003)
- [X] T008 [P] [US1] Create `components/ChatInterface/SearchResultMessage.tsx` — compact result list component that renders up to 5 `SearchResultItem` rows (body type + make + model (year), price or "Not available", source link or "Not available") plus an overflow note when `totalCount > items.length`
- [X] T009 [P] [US1] Add CSS classes for the result list, result rows, price, and source link to `components/ChatInterface/ChatInterface.module.css` using existing CSS variables (no new colours)
- [X] T010 [US1] Modify `components/ChatInterface/ChatInterface.tsx` to render `<SearchResultMessage>` instead of `msg.content` when `message.searchResults` is present (depends on T008)
- [X] T011 [US1] Modify `components/ChatInterface/ChatInterface.tsx` to inject an `{ role: 'assistant', searchResults: { items: results.slice(0, 5), totalCount } }` `Message` into `state.messages` after the `__WEBHOOK_EVENT__` sentinel is processed and `results.length > 0` (depends on T002, T007, T010)

**Checkpoint**: User Story 1 fully functional — result cards appear in chat after any search with matches.

---

## Phase 4: User Story 2 — Search Completes with No Results (Priority: P2)

**Goal**: After a search returns zero matches, a human-readable "no results" message with a criteria-broadening suggestion appears in the chat.

**Independent Test**: Submit a search with criteria known to produce zero results; verify a "no matching cars" message with suggestion text appears in the chat.

- [X] T012 [US2] Modify `components/ChatInterface/ChatInterface.tsx` to inject an `{ role: 'assistant', content: "No matching cars were found for your criteria. Try broadening your search — for example, consider a wider budget range or additional body types." }` `Message` when `__WEBHOOK_EVENT__` has `status: 'success'` and `results.length === 0` (depends on T011)
- [X] T013 [US2] In the n8n UI: wire the no-results path to the same Respond to Webhook node with `{ "status": "success", "results": [], "totalCount": 0 }` (depends on T006)

**Checkpoint**: User Story 2 functional — no-results message with suggestion shown for zero-match searches.

---

## Phase 5: User Story 3 — Search Still in Progress (Priority: P3)

**Goal**: While the n8n webhook is executing, a "Searching for matching cars…" bubble with animated dots appears in the chat, replacing the standard stream loader.

**Independent Test**: Trigger a search and verify the loading bubble appears immediately after `conclude_conversation` fires, then disappears and is replaced by the result or no-results message.

- [X] T014 [US3] Add `__SEARCH_STARTED__` sentinel emission in `app/api/chat/route.ts`: enqueue `'\n\n__SEARCH_STARTED__'` immediately before calling `fireWebhookWithRetry` (depends on T003)
- [X] T015 [US3] Update stream-chunk processing in `components/ChatInterface/ChatInterface.tsx` to detect `__SEARCH_STARTED__` in the accumulated stream, strip it from display content (compute `firstMarker = min(webhookIdx, searchStartedIdx)`), and set `isSearching: true` (depends on T002)
- [X] T016 [US3] Render searching indicator bubble in `components/ChatInterface/ChatInterface.tsx`: when `isSearching === true`, render a `.assistantBubble` below the last persisted message with "Searching for matching cars…" text followed by the existing `.loadingIndicator` animated dots (depends on T015)
- [X] T017 [US3] Clear `isSearching` to `false` when `__WEBHOOK_EVENT__` is processed in `components/ChatInterface/ChatInterface.tsx` (depends on T015, T016)

**Checkpoint**: User Story 3 functional — in-progress indicator appears during search round-trip and is replaced by the outcome message.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge-case coverage, and manual validation against all quickstart.md scenarios.

- [X] T018 Modify `components/ChatInterface/ChatInterface.tsx` to inject an `{ role: 'assistant', content: "The search could not be completed. Please try again using the button below." }` `Message` when `__WEBHOOK_EVENT__` has `status: 'failed'` (FR-007 — covers timeout and backend error path)
- [ ] T019 [P] Manually verify the `__SEARCH_STARTED__` indicator does NOT appear during a normal Q&A round (no `conclude_conversation` tool call) per quickstart.md Regression check
- [ ] T020 [P] Manually verify `SearchResultMessage` renders correctly and without horizontal overflow at mobile (≥320px), tablet (≥768px), and desktop (≥1280px) viewports (Constitution Principle III)
- [ ] T021 Run all five quickstart.md validation scenarios (Scenario 1 results, Scenario 2 no-results, Scenario 3 timeout, Scenario 4 email unaffected, Regression Q&A) and confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **User Story 1 (Phase 3)**: Depends on Phase 2 complete (T001–T003)
- **User Story 2 (Phase 4)**: Depends on Phase 3 checkpoint (T011 complete)
- **User Story 3 (Phase 5)**: Depends on Phase 2 types (T002) — can run alongside Phase 3 after T002 is done
- **Polish (Phase 6)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: T001 + T002 + T003 → T007 → T010 → T011; T008 + T009 in parallel with T007
- **US2 (P2)**: T011 + T013 (T013 depends on T006 from US1 n8n tasks)
- **US3 (P3)**: T002 → T015 → T016 → T017; T014 independent (only needs T003)

### Within Each User Story

- Types (Phase 2) before trigger layer (T003) before route forwarding (T007)
- n8n UI tasks (T004–T006, T013) can be completed at any time before end-to-end testing
- T008 (new component) and T009 (CSS) are parallel — different files
- T010 (render branch) requires T008
- T011 (message injection) requires T002, T007, T010

### Parallel Opportunities

- T001 and T002 — separate type files, no dependency between them
- T005 and T006 — independent n8n UI additions
- T008 and T009 — new component file and CSS file
- T019 and T020 — independent manual validation checks

---

## Parallel Example: User Story 1

```
After T001–T003 complete:
  Parallel group A: T004 (n8n Webhook config) + T007 (route.ts forwarding)
  Parallel group B: T008 (SearchResultMessage.tsx) + T009 (CSS)
  Sequential: T010 (render branch, needs T008) → T011 (injection, needs T002+T007+T010)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: Run quickstart.md Scenario 1
4. Continue with US2, US3, then Polish

### Incremental Delivery

1. Phase 2 → types and trigger ready
2. Phase 3 (US1) → result cards appear in chat — **Core MVP delivered**
3. Phase 4 (US2) → zero-result case covered
4. Phase 5 (US3) → in-progress indicator active
5. Phase 6 → error path + responsive check + full validation

---

## Notes

- **No test files**: Constitution Principle V prohibits all automated testing
- **No new npm packages**: Constitution Principle IV — changes use existing React, Next.js, TypeScript, and CSS only
- **n8n UI tasks** (T004–T006, T013) are manual updates in the n8n workflow editor, not source-code changes
- Commit after each phase checkpoint for clean rollback boundaries
- [P] markers indicate tasks with no shared-file conflicts and no unresolved dependencies at time of execution
