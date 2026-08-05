# Tasks: Smart Conversation Webhook

**Input**: Design documents from `/specs/004-smart-conversation-webhook/`

**Prerequisites**: plan.md ✓ · spec.md ✓ · research.md ✓ · data-model.md ✓ · contracts/ ✓ · quickstart.md ✓

**Tests**: None — Constitution Principle V prohibits automated testing.

**Organization**: Tasks grouped by user story for independent implementation and delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no inter-task dependency)
- **[Story]**: User story from spec.md (US1 = Explicit End, US2 = Refusal, US3 = Round Limit, US4 = Structured Payload)

---

## Phase 1: Foundational — Type Definitions & Webhook Infrastructure

**Purpose**: All type definitions and the retry-capable webhook function that every later phase depends on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: Phases 2+ are blocked until this phase is complete.

- [x] T001 [P] Replace `WebhookPayload` with `CarSearchPayload`, add `FeatureEntry`, `WebhookEvent`, and `WebhookResult` types in `lib/types/n8n.ts`
- [x] T002 [P] Add `SessionStatus` type and new session fields (`sessionStatus`, `roundCount`, `isRefinement`, `webhookError`) to `ConversationState` in `lib/types/chat.ts`
- [x] T003 Add `fireWebhookWithRetry(url, payload): Promise<WebhookResult>` to `lib/n8n/trigger.ts` — one silent auto-retry, returns `{status, errorMessage?}`; update `TriggerLogEntry` to use `CarSearchPayload` (depends on T001)

**Checkpoint**: Types and retry-capable webhook function in place — all later phases can proceed.

---

## Phase 2: User Stories 1 + 2 + 4 — Core Conclusion Pipeline (Priority: P1) 🎯 MVP

**Goal**: The assistant fires the webhook exactly once when the conversation concludes (explicit end or refusal), sending a fully structured `CarSearchPayload`. Loading indicator shown during conclusion. Retry available on failure.

**User Stories covered**:
- **US1** — Explicit end signal (`"I'm done"`, `"find me cars"`, etc.) concludes conversation and fires webhook
- **US2** — Single refusal skips the field; two consecutive refusals conclude the conversation
- **US4** — Webhook payload is a structured `CarSearchPayload`; no raw text in payload

**Independent Test**: Run quickstart.md Scenarios 1, 2, 3, and 7. One webhook call per scenario, correct payload schema each time.

### Implementation

- [x] T004 [US1][US2][US4] Rewrite `SYSTEM_PROMPT` constant in `app/api/chat/route.ts` — add full conversation-phase instructions: one question at a time; single "I don't know" skips field and continues; two consecutive refusals OR a strong all-done phrase triggers `conclude_conversation`; populate every `CarSearchPayload` field, use `"any"` / `[]` for unspecified fields; include `endTrigger` in tool call
- [x] T005 [US1][US2][US4] Add `conclude_conversation` Anthropic tool definition (with `endTrigger` field in input schema) to `app/api/chat/route.ts` per `contracts/conclude-tool.md` (depends on T001)
- [x] T006 [US1][US2][US4] Replace per-message webhook block in `app/api/chat/route.ts` with tool-use detection: iterate stream events, forward `text_delta` chunks as before, capture `tool_use` block for `conclude_conversation`, call `fireWebhookWithRetry`, append `\n\n__WEBHOOK_EVENT__<json>` sentinel to stream (depends on T003, T004, T005)
- [x] T007 [P] [US1][US2][US4] Extend `ConversationState` initial value in `components/ChatInterface/ChatInterface.tsx` with new fields (`sessionStatus: 'active'`, `roundCount: 0`, `isRefinement: false`, `webhookError: null`); update `startNewConversation` reset to include them (depends on T002)
- [x] T008 [US1][US2][US4] Add sentinel detection to the stream reader loop in `components/ChatInterface/ChatInterface.tsx`: after stream closes, check accumulated string for `__WEBHOOK_EVENT__`, split it off, parse `WebhookEvent` JSON, update `sessionStatus` to `'concluded'` on success or back to `'active'` with `webhookError` on failure (depends on T007)
- [x] T009 [US1][US2][US4] Add webhook error display and "Try again" handler in `components/ChatInterface/ChatInterface.tsx`: render `webhookError` message with a retry button that re-calls the webhook endpoint; clear `webhookError` on successful retry (depends on T008)

**Checkpoint**: US1, US2, and US4 fully functional. Validate with quickstart.md Scenarios 1, 2, 3, 7 before proceeding.

---

## Phase 3: User Story 3 — Round Limit & Car Suggestions (Priority: P2)

**Goal**: After 5 question-answer rounds the agent presents 2–4 car type/model suggestions and offers to conclude. Client tracks round count and shows "Refining your search" badge in post-conclusion mode.

**Independent Test**: Run quickstart.md Scenario 4 (5-round limit) and Scenario 6 (refinement mode).

### Implementation

- [x] T010 [US3] Update `SYSTEM_PROMPT` in `app/api/chat/route.ts` — add round-limit section: after 5 completed question-answer rounds, present 2–4 concrete car suggestions grounded in collected criteria, ask "search now or refine?"; if user confirms, call `conclude_conversation` with `endTrigger: "length-limit"`; if user continues, allow up to 2 more questions then call the tool regardless; for refinement sessions, amend criteria and call `conclude_conversation` with `endTrigger: "refinement"` (depends on T004)
- [x] T011 [US3] Add `roundCount` increment to `sendMessage` in `components/ChatInterface/ChatInterface.tsx` — increment by 1 after each completed assistant response (stream finishes without a sentinel); do not increment on conclusion turns (depends on T007)
- [x] T012 [US3] Add refinement-mode activation to `components/ChatInterface/ChatInterface.tsx` — when `sessionStatus === 'concluded'` and user sends a new message, set `sessionStatus` to `'refining'` and `isRefinement` to `true` before dispatching the API call; add the `isRefinement` flag to the request context so the system prompt can detect it (depends on T008, T011)
- [x] T013 [P] [US3] Add `refining` CSS class and "Refining your search" badge markup to the toolbar in `components/ChatInterface/ChatInterface.tsx` — visible only when `sessionStatus === 'refining'` (depends on T012)
- [x] T014 [P] [US3] Add `.refiningBadge` style to `components/ChatInterface/ChatInterface.module.css` — small inline label, works at ≥320px (can run in parallel with T013)

**Checkpoint**: US3 functional. Validate with quickstart.md Scenarios 4 and 6.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and end-to-end validation.

- [x] T015 [P] Verify `lib/types/n8n.ts` has no remaining references to the removed `WebhookPayload` type; update any import in `app/api/chat/route.ts` that still references it
- [ ] T016 Run full manual validation against all 9 scenarios in quickstart.md in `specs/004-smart-conversation-webhook/quickstart.md` and confirm each expected outcome

**Checkpoint**: All quickstart scenarios pass — feature complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **Core Pipeline (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **Round Limit (Phase 3)**: Depends on Phase 2 completion (T010 builds on T004; T011–T014 build on T007–T008)
- **Polish (Phase 4)**: Depends on Phases 2 and 3

### Within Phase 2

```
T001 ──┐
T002 ──┼──► T003 ──► T006 ──► T007 ──► T008 ──► T009
       └──► T004 ──► T006
            T005 ──► T006
```

T001 and T002 are independent (different files) — run in parallel.  
T003, T004, T005 can all start after T001/T002 — T003 and T004/T005 are in different files, so parallel too.  
T006 requires T003 + T004 + T005.  
T007 requires T002 only and can run in parallel with T004-T006 (different file).  
T008 → T009 are sequential (same file, dependent logic).

### Within Phase 3

```
T004 ──► T010
T007 ──► T011 ──► T012 ──► T013
                            T014 (parallel with T013)
```

---

## Parallel Opportunities

### Phase 1

```
# Launch together (different files):
T001: lib/types/n8n.ts
T002: lib/types/chat.ts
```

### Phase 2

```
# Launch together after T001+T002:
T003: lib/n8n/trigger.ts
T004: app/api/chat/route.ts (system prompt)
T007: components/ChatInterface/ChatInterface.tsx (state init)

# Then sequentially per file:
T005: route.ts tool definition  → T006: route.ts webhook + sentinel
T008: ChatInterface sentinel parsing → T009: error UI
```

### Phase 3

```
# T013 + T014 in parallel (different files):
T013: ChatInterface.tsx (badge markup)
T014: ChatInterface.module.css (badge styles)
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US4 Only)

1. Complete Phase 1 (Foundational)
2. Complete Phase 2 (Core Pipeline)
3. **STOP and VALIDATE**: Run quickstart.md Scenarios 1, 2, 3, 7
4. Demo / merge if webhook fires correctly on conclusion — US3 refinement can follow

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 2 → Webhook fires on explicit end and refusal with structured payload (MVP!)
3. Phase 3 → Round limit, suggestions, refinement mode
4. Phase 4 → Polish and full validation

---

## Notes

- The system prompt (T004 + T010) is the most critical task — it encodes all conversation logic. Write it carefully and validate against Scenarios 1–4 before moving to T006.
- `fireWebhookWithRetry` (T003) must await the webhook result before the sentinel is injected (T006) — do not fire-and-forget.
- `__WEBHOOK_EVENT__` sentinel must be stripped from the displayed message text (T008) so it never appears in the chat UI.
- `isRefinement` flag needs to reach the server so the system prompt knows the session is in refinement mode — pass it as a field in the `ChatRequestBody` (update types in T001/T002 if needed).
- `startNewConversation` in `ChatInterface.tsx` must reset all new state fields (T007) — verify this resets `sessionStatus`, `roundCount`, `isRefinement`, `webhookError`.
- **T017–T020 supersede T004 and T010** on end-trigger and round-limit behaviour. When implementing T004 and T010, apply the amended rules from T017 and T018 instead of their original descriptions.

---

## Phase 5: Convergence

_Appended 2026-08-05 — spec amendment via `/speckit-converge`: removed consecutive-refusal end trigger; made round-limit check-in interactive with no forced extension cap._

- [x] T017 CRITICAL: Amend `SYSTEM_PROMPT` written by T004 in `app/api/chat/route.ts` — remove "two consecutive refusals" as an end trigger; only an explicit all-done phrase triggers `conclude_conversation` via implicit signal; any number of refusals MUST skip the field and continue questioning per FR-003 (contradicts)
- [x] T018 [US3] Amend round-limit section of `SYSTEM_PROMPT` written by T010 in `app/api/chat/route.ts` — replace "allow up to 2 more questions then force conclude" with: present suggestions, ask "continue or search now?", await response; if user declines call `conclude_conversation`; if user accepts resume questioning; repeat check-in at each subsequent N-round interval; after MAX_EXTENSIONS accepted extensions (default 3, ~20 total rounds) deliver "I really need to search now" and call `conclude_conversation` with `endTrigger: "length-limit"` regardless of user preference per FR-004 (contradicts)
- [x] T021 [US3] Add `MAX_EXTENSIONS` constant to `app/api/chat/route.ts` (default: 3) alongside the existing round-limit constant; pass current extension count to the system prompt context so the model can enforce the soft ceiling; update NFR-003 configurable requirement (missing)
- [x] T019 [P] Replace quickstart.md Scenario 3 — done: "Multiple consecutive refusals skip fields, never conclude" replaces the invalid two-refusals-end scenario per FR-003 (partial → resolved)
- [x] T020 [P] Add quickstart.md Scenario 8 — done: round-limit reached, user accepts continuation; second check-in at next interval per FR-004; Scenario 9 also added for soft-ceiling force-conclude (missing → resolved)
