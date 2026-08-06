# Tasks: Email Notification for Car Search Results

**Input**: Design documents from `specs/007-email-notification-results/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: No automated test tasks (Constitution Principle V — no automated testing).

**Organization**: Tasks are grouped by user story. Each story phase is independently completable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (touches a different file, no dependency on an incomplete sibling task)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)

---

## Phase 1: Setup

**Purpose**: Provision external infrastructure required before any workflow node can be configured.

- [ ] T001 Create SMTP credential in n8n — go to Settings → Credentials → New → select type `SMTP`, name it `Car Buying Assistant SMTP`, fill in host/port/username/password, and verify the connection test passes

**Checkpoint**: SMTP credential exists and passes connection test in n8n. No workflow changes yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type-level contract change and the conditional branching skeleton that all three user stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `userEmail: string | null` to the `CarSearchPayload` interface in `lib/types/n8n.ts` — insert as the last optional property; no other changes to that file
- [X] T003 Add IF node "Check Has Results" to n8n workflow `FPu7nerQuXt54T78` — connect its input from the "Log Results" node; set condition to `{{ $json.matchCount > 0 }}` (number, greater-than, 0, strict type validation)
- [X] T004 Add No Operation node "No Results - Skip Email" to n8n workflow `FPu7nerQuXt54T78` — wire it to the **false** output of "Check Has Results"; this terminates the no-results path cleanly with a success status

**Checkpoint**: Workflow compiles. A search returning zero results routes to "No Results - Skip Email" and the execution finishes with status **Success**. A search with results routes to the true branch (not yet connected further — this is expected at this stage).

---

## Phase 3: User Story 1 — Receive Car Recommendations by Email (Priority: P1) 🎯 MVP

**Goal**: When a search returns ≥ 1 result and `userEmail` is valid, the user receives a formatted HTML email listing all matched cars.

**Independent Test**: Send a webhook POST with `userEmail: "your@inbox.com"` and `budgetMax: 50000` (matching criteria) → inbox receives the email within 30 s, subject matches `Your car matches: N result(s) found`, each car card shows all required fields. See quickstart.md Scenario 1.

- [X] T005 [P] [US1] Add email input field to `components/ChatInterface/` — add a controlled `<input type="email">` field with label "Get results by email (optional)" shown above the message input, stored in component state as `userEmail: string`; pass `userEmail` in the JSON body of every `POST /api/chat` request
- [X] T006 [US1] Update `app/api/chat/route.ts` to read `userEmail` from the request body and include it in the `CarSearchPayload` sent to `fireWebhookWithRetry` — extract with `const userEmail = typeof body.userEmail === 'string' ? body.userEmail : null` and add to the payload object (depends on T002)
- [X] T007 [US1] Add IF node "Validate User Email" to n8n workflow `FPu7nerQuXt54T78` — wire to the **true** output of "Check Has Results"; condition: `{{ !!$('Webhook').first().json.body.userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('Webhook').first().json.body.userEmail) }}` (boolean true check)
- [X] T008 [US1] Add Set node "Record Email Warning" to n8n workflow `FPu7nerQuXt54T78` — wire to the **false** output of "Validate User Email"; set fields: `emailWarning` = `true` (boolean), `emailWarningMessage` = `"Email skipped: no valid recipient address in payload"` (string)
- [X] T009 [US1] Add Code node "Build Email HTML" to n8n workflow `FPu7nerQuXt54T78` — wire to the **true** output of "Validate User Email"; implement the full HTML email body per `specs/007-email-notification-results/contracts/email-template.md`: XHTML 1.0 Transitional DOCTYPE, table-based layout, inline styles only, max-width 600 px outer container, one card per matched listing from `$('Log Results').first().json.listings`, each card with left accent bar (`#2563eb`), make/model/year header + right-aligned EUR price, two-column spec grid, features bullet list; apply null fallbacks (`"Not specified"` in `#9ca3af` italic; `"No additional features listed"` for empty features array); the Code node returns `[{ json: { subject, htmlBody, to } }]`
- [X] T010 [US1] Add Send Email node "Send Results Email" to n8n workflow `FPu7nerQuXt54T78` — wire after "Build Email HTML"; set credential to `Car Buying Assistant SMTP`; `To` = `{{ $json.to }}`; `Subject` = `{{ $json.subject }}`; set email format to `HTML`; `HTML Body` = `{{ $json.htmlBody }}`; **enable "Continue on Fail"** in node settings; wire the **error output** to "Record Email Warning"

**Checkpoint**: Full happy path is wired. Send Scenario 1 from quickstart.md — inbox receives email, subject and body match the template contract, all car fields present, EUR price formatted correctly.

---

## Phase 4: User Story 2 — No Email Sent When Search Returns No Results (Priority: P2)

**Goal**: Zero-result searches complete successfully with no outbound email.

**Independent Test**: Send a webhook POST with `budgetMax: 1` → execution routes to "No Results - Skip Email", status is **Success**, no email arrives in the inbox. See quickstart.md Scenario 2.

- [X] T011 [US2] Validate the no-results path end-to-end — confirm the IF node "Check Has Results" condition `{{ $json.matchCount > 0 }}` uses **strict** type validation (not loose); run quickstart.md Scenario 2 (`budgetMax: 1`) and verify execution graph shows the false branch path and status is **Success**; no code changes expected — this task is validation only

**Checkpoint**: Confirmed via n8n execution graph that zero-result searches route through "No Results - Skip Email" with no email activity.

---

## Phase 5: User Story 3 — Email Includes User's Search Context (Priority: P3)

**Goal**: The email contains a criteria summary section so the recipient can immediately understand what the recommendations are based on.

**Independent Test**: Send a webhook POST with explicit criteria (`budgetMax: 25000`, `bodyTypes: ["suv"]`, `fuelTypes: ["hybrid"]`, `transmission: "automatic"`, `minSeats: 5`, `features: [{ name: "parking sensors", mandatory: true }]`, valid `userEmail`) → email header section lists all meaningful criteria values; criteria set to `"any"` or `null` are omitted. See quickstart.md Scenario 1 (same flow, inspect the criteria summary section of the email).

- [X] T012 [US3] Update "Build Email HTML" Code node in n8n workflow `FPu7nerQuXt54T78` to add the search criteria summary section below the email header — source criteria from `$('Log Results').first().json.searchCriteria`; render only criteria with meaningful values per `specs/007-email-notification-results/contracts/email-template.md` criteria display rules (omit null, `"any"`, `["any"]`); format budget as `up to €{budgetMax}` with comma separator; display mandatory features only from the features array; if no criteria have meaningful values, show `"No specific criteria applied"` in muted text

**Checkpoint**: Send a search with explicit criteria — the email criteria summary section lists exactly the supplied criteria values; criteria left as "any" or null do not appear.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and cleanup.

- [ ] T013 [P] Run all 5 quickstart.md validation scenarios (`specs/007-email-notification-results/quickstart.md`) and confirm each passes: Scenario 1 (results + valid email → email sent), Scenario 2 (no results → no email), Scenario 3 (null email → warning, no email), Scenario 4 (malformed email → warning, no email), Scenario 5 (delivery failure → non-blocking warning, execution succeeds)
- [X] T014 Update `specs/007-email-notification-results/spec.md` status from `Draft` to `Implemented`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (SMTP credential needed for T010) — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 2 completion; independent of Phase 3
- **Phase 5 (US3)**: Depends on T009 (Build Email HTML node must exist before it can be extended)
- **Phase 6 (Polish)**: Depends on all desired user story phases being complete

### Within Phase 3 (US1)

```
T005 ──────────────────────────────────────────────► T006
T002 ──────────────────────────────────────────────► T006
                                                      │
T003 ──► T007 ──► T008 (false branch)               │
              └──► T009 ──► T010 (true branch)       │
                             └── T010 error ──► T008 │
```

- **T005 and T006**: T005 captures the email in the UI; T006 reads it from the request body. T006 depends on T002 (type change) and conceptually on T005 (the value must be available at runtime).
- **T005**: Parallelizable with T007–T010 (different file: `components/ChatInterface/`)
- **T007 → T008**: T008 (warning recorder) can be added before T009 is wired; depends only on T007 existing
- **T009 → T010**: T010 requires the "Build Email HTML" node (T009) to exist for its input wiring

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (T002, T003) — no dependency on US2 or US3
- **US2 (P2)**: Depends on Phase 2 (T003, T004) — fully covered by foundational work; T011 is validation only
- **US3 (P3)**: Depends on T009 (Build Email HTML must exist to be extended)

---

## Parallel Example: Phase 3 (User Story 1)

```
# These two tasks touch different files — run in parallel:
T005  Add email input to components/ChatInterface/
T007  Add "Validate User Email" IF node to n8n workflow

# After T007 completes, these two can run in parallel:
T008  Add "Record Email Warning" Set node (false branch of T007)
T009  Add "Build Email HTML" Code node (true branch of T007)

# After T009 completes:
T010  Add "Send Results Email" node + wire error output to T008
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T004)
3. Complete Phase 3: User Story 1 (T005–T010)
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 — if inbox receives a correctly formatted email, US1 is done
5. Ship or demo the MVP

### Incremental Delivery

1. Setup + Foundational → T001–T004 done
2. US1 (T005–T010) → email sending works end-to-end → **MVP milestone**
3. US2 (T011) → validate no-results path (no code changes, just verification)
4. US3 (T012) → criteria summary added to email
5. Polish (T013–T014) → all 5 scenarios validated

---

## Notes

- `[P]` tasks touch different files and have no dependency on other in-progress tasks in the same phase
- No automated tests per Constitution Principle V — validation is manual via quickstart.md
- n8n workflow ID: `FPu7nerQuXt54T78` (workflow name: "Car Search Logger")
- SMTP credential must be named exactly `Car Buying Assistant SMTP` — the Send Email node configuration in T010 references this name
- The `userEmail` value flows: ChatInterface state → POST body → `route.ts` → `CarSearchPayload` → n8n webhook → `$('Webhook').first().json.body.userEmail`
- Commit after each phase checkpoint to keep history clean
