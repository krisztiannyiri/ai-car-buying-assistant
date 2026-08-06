---
description: 'Task list for Expert Advisor Mode'
---

# Tasks: Expert Advisor Mode

**Input**: Design documents from `/specs/006-expert-advisor-mode/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No automated tests (Constitution Principle V). Validation is manual using quickstart.md scenarios.

**Organization**: Tasks are grouped by user story. All changes target a single function: `buildSystemPrompt()` in `app/api/chat/route.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different concerns, no dependencies within the phase)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Understand the existing implementation before any changes.

- [x] T001 Read and annotate the current `buildSystemPrompt()` in `app/api/chat/route.ts`, listing every section header, its purpose, and whether it changes or stays — use this as the reference map for all subsequent tasks

**Checkpoint**: Current prompt structure understood; change map ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the existing technical question sequence and payload rules — these two sections are the root cause of the current behaviour and must be replaced before any user story can be implemented or tested.

**⚠️ CRITICAL**: No user story work can begin until both foundational tasks are complete.

- [x] T002 Replace the `## Conversation flow` section in `buildSystemPrompt()` in `app/api/chat/route.ts` with the lifestyle question set from `research.md` Decision 2 — ask about daily driving distance, journey type (city/motorway/mixed), home charging availability, regular passenger count, cargo frequency, towing requirement, maximum budget, and desired features; never ask about fuel type, body type, transmission, or engine displacement
- [x] T003 Replace the `## Payload rules when calling conclude_conversation` section in `buildSystemPrompt()` in `app/api/chat/route.ts` with the full inference rule tables from `research.md` Decision 3 — covering fuel type inference, body type inference, engine displacement inference, and transmission inference; each rule maps lifestyle answers to the corresponding `conclude_conversation` field value

**Checkpoint**: Technical questions removed; inference rules in place. The assistant can now infer vehicle requirements from lifestyle data.

---

## Phase 3: User Story 1 — Needs-Based Discovery (Priority: P1) 🎯 MVP

**Goal**: The assistant asks only lifestyle and usage questions; it never asks the user to specify technical vehicle attributes; it produces a named recommendation from lifestyle data alone.

**Independent Test**: Run quickstart.md Scenario 1 — provide only lifestyle information (commute distance, passengers, no garage, budget) and verify no technical questions appear before the first recommendation (T005).

### Implementation for User Story 1

- [x] T004 [US1] Update the `## Round-limit check-in` section in `buildSystemPrompt()` in `app/api/chat/route.ts` to present lifestyle-derived vehicle category suggestions (not raw technical specs) and use expert advisor framing consistent with the new question strategy (per `research.md` Decision 6)
- [ ] T005 [US1] Run quickstart.md Scenario 1 manually at `http://localhost:3000` — verify: (a) zero technical-spec questions appear in the assistant's turns before the first recommendation, (b) the assistant names a specific vehicle category or model before the search is triggered

**Checkpoint**: User Story 1 fully functional — a user who provides only lifestyle information receives a justified recommendation without being asked any technical questions.

---

## Phase 4: User Story 2 — Expert Recommendation with Explained Tradeoffs (Priority: P2)

**Goal**: The assistant proactively presents a named vehicle recommendation with 2+ pros and 1+ con, all tied to the user's stated constraints; it corrects automotive misconceptions in plain language; it handles "why not X?" challenges factually.

**Independent Test**: Run quickstart.md Scenario 2 (misconception correction) and observe a full profile conversation to verify the recommendation cites the user's own constraints (T008).

### Implementation for User Story 2

- [x] T006 [P] [US2] Add an `## Expert recommendation` section to `buildSystemPrompt()` in `app/api/chat/route.ts` — instruct the assistant to proactively present a named vehicle category or model after sufficient lifestyle data is collected, with at least 2 pros and 1 con, each explicitly tied to a specific constraint the user stated; generic spec comparisons (horsepower, displacement figures) are not acceptable as pros or cons
- [x] T007 [P] [US2] Add an `## Automotive misconception correction` section to `buildSystemPrompt()` in `app/api/chat/route.ts` — instruct the assistant to detect and correct car-specific incorrect beliefs (scoped to: fuel types, drivetrains, running costs, range, safety ratings), issue the correction once in plain language tied to the user's specific situation, then continue without repeating it; broader factual errors on unrelated topics are not corrected
- [ ] T008 [US2] Run quickstart.md Scenario 2 manually at `http://localhost:3000` — verify: (a) the diesel-power misconception is corrected with a plain-language explanation referencing the user's situation, (b) the correction does not repeat, (c) the conversation continues normally after the correction

**Checkpoint**: User Story 2 functional — recommendations are proactive, explained, and grounded in user constraints; misconceptions are corrected once.

---

## Phase 5: User Story 3 — Preference Tie-Breaking (Priority: P3)

**Goal**: When two options are genuinely equivalent (same price band ≤15%, all lifestyle constraints equally satisfied), the assistant presents both with a plain-language differentiator and asks exactly one preference question; no follow-up preference questions are asked.

**Independent Test**: Run quickstart.md Scenario 4 — provide a profile that yields two equally matched options and verify exactly one preference question is asked before the recommendation is confirmed (T010).

### Implementation for User Story 3

- [x] T009 [US3] Add a `## Tie-breaking` section to `buildSystemPrompt()` in `app/api/chat/route.ts` — define equivalence as: same price band (≤15% price difference) AND all lifestyle constraints equally satisfied by both options; instruct the assistant to present both options with a one-sentence plain-language differentiator each, then ask exactly one lifestyle-framed preference question (e.g., "Would you prefer more boot space or a sportier feel?"); after receiving any answer, commit to one option immediately — no further preference questions regardless of response
- [ ] T010 [US3] Run quickstart.md Scenario 4 manually at `http://localhost:3000` — verify: (a) exactly two options are presented with plain-language differentiators, (b) exactly one preference question is asked, (c) the assistant commits to a recommendation after the answer without asking further preference questions

**Checkpoint**: All three user stories functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consistency check, edge case validation, and code quality review across the full rewritten function.

- [x] T011 [P] Full read-through of the completed `buildSystemPrompt()` in `app/api/chat/route.ts` — check: (a) no residual technical question prompts remain in any section, (b) all section headers are consistent and clearly named, (c) all inference rules in the payload section correctly cover every field in `conclude_conversation`, (d) Prettier formatting is clean (run `npx prettier --check app/api/chat/route.ts`)
- [ ] T012 [P] Run quickstart.md Scenario 3 (contradictory constraints: budget €13k + caravan towing) and Scenario 5 (user override after correction) manually at `http://localhost:3000` — verify the edge case behaviours defined in `spec.md` Edge Cases section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — T002 and T003 can be done in either order; both BLOCK all user story phases
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion — T004 then T005
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion — T006 and T007 can be done in parallel; T008 depends on both
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion — T009 then T010
- **Polish (Phase 6)**: Depends on Phases 3–5 completion — T011 and T012 can be done in parallel

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **User Story 2 (P2)**: Can start after Phase 2 — no dependency on US1 or US3
- **User Story 3 (P3)**: Can start after Phase 2 — no dependency on US1 or US2

All three user stories modify independent sections of `buildSystemPrompt()` (conversation flow vs. recommendation vs. tie-breaking), so they can be developed in parallel once the foundational sections are replaced.

### Within Each User Story

- Implementation tasks before validation tasks
- For US2: T006 and T007 are independent (different sections) and can be done in parallel; T008 validation requires both

### Parallel Opportunities

- T002 and T003 (Phase 2): Different sections of the prompt — can be done in parallel
- T006 and T007 (US2): Different sections — can be done in parallel
- T011 and T012 (Polish): Independent concerns — can be done in parallel
- US1, US2, US3 phases: All depend only on Phase 2 — can proceed in parallel if working across sessions

---

## Parallel Example: User Story 2

```text
# T006 and T007 can be done simultaneously (different prompt sections):
T006: Add ## Expert recommendation section to buildSystemPrompt()
T007: Add ## Automotive misconception correction section to buildSystemPrompt()

# T008 validates both, so it waits:
T008: Run quickstart.md Scenario 2 (depends on T006 + T007)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: User Story 1 (T004, T005)
4. **STOP and VALIDATE**: Run Scenario 1 from quickstart.md
5. Ship: the core expert advisor behaviour is live; technical questions are gone

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready (technical questions removed, inference rules in)
2. Phase 3 (US1) → Users can receive lifestyle-driven recommendations → **MVP shipped**
3. Phase 4 (US2) → Recommendations become proactive and explained; misconceptions corrected
4. Phase 5 (US3) → Tie-breaking edge case handled correctly
5. Phase 6 (Polish) → Edge cases and formatting verified

### Single-Developer Strategy

All tasks target the same file but different sections. Work top-to-bottom through phases to keep the function consistent at each checkpoint. After each phase, the assistant behaviour at `http://localhost:3000` should reflect the cumulative changes.

---

## Notes

- [P] tasks = independent concerns within the same file; no risk of conflicting edits
- [Story] label maps each task to its user story for traceability to spec.md
- Every user story has exactly one validation task that proves it works end-to-end
- No automated tests per Constitution Principle V — validation is manual via quickstart.md
- The sole changed file throughout is `app/api/chat/route.ts` (function `buildSystemPrompt()`)
- Commit after each phase checkpoint to preserve a working state
