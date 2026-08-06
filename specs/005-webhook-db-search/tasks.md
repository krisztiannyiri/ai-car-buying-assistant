# Tasks: Webhook Database Search and Logging

**Feature**: `005-webhook-db-search` | **Branch**: `005-webhook-db-search`

**Input**: Design documents from `specs/005-webhook-db-search/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/car-search-data-store.md ✓, quickstart.md ✓

**Note**: Pure n8n workflow extension — no application code changes. "File paths" in task descriptions reference n8n resources (workflow `FPu7nerQuXt54T78`, Data Store table `car_listings`) instead of filesystem paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent operations, no file/resource conflicts)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Create the n8n Data Store table that is a hard prerequisite for all user stories.

- [X] T001 Create `car_listings` Data Store table with 14 columns (id, make, model, year, price, mileage, fuelType, bodyType, transmission, seatCount, colour, condition, features, source) and correct types (string/number) in n8n Data Store per specs/005-webhook-db-search/contracts/car-search-data-store.md schema

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Seed the `car_listings` table with mock data. Required before US1 is testable and US2 is verifiable. No user story work can be meaningfully validated until this phase is complete.

**⚠️ CRITICAL**: Complete T001 before T002.

- [X] T002 Seed `car_listings` Data Store table with all 12 mock listings (listing-001 through listing-012) using exact values from specs/005-webhook-db-search/data-model.md seed-data table, including JSON-serialised features strings (e.g. `'["parking sensors","bluetooth","heated seats"]'`)

**Checkpoint**: Table seeded — US2 can now be independently verified by inspecting the Data Store; US1 node implementation can begin.

---

## Phase 3: User Story 1 — Webhook Triggers Database Search (Priority: P1) 🎯 MVP

**Goal**: Extend workflow `FPu7nerQuXt54T78` with a Data Store query node and a Code node that applies AND-logic filtering against the structured criteria in the webhook payload body.

**Independent Test**: Send `POST /webhook` with `{ "bodyTypes": ["suv"], "budgetMax": 30000, "fuelTypes": ["any"], "transmission": "any", "minSeats": null, "features": [] }` — the Filter Listings node output in the n8n execution detail must contain exactly 2 records (Ford Kuga, Kia Sportage).

### Implementation for User Story 1

- [X] T003 [US1] Add "Get Car Listings" n8n Data Store node (Table → Get Many, retrieve all rows) to workflow `FPu7nerQuXt54T78` after the existing Webhook Trigger node
- [X] T004 [US1] Connect Webhook Trigger → Get Car Listings in workflow `FPu7nerQuXt54T78`
- [X] T005 [US1] Add "Filter Listings" Code node to workflow `FPu7nerQuXt54T78` with JavaScript AND-logic implementing all 6 filter criteria from specs/005-webhook-db-search/data-model.md: (1) `price >= budgetMin` if not null, (2) `price <= budgetMax` if not null, (3) `bodyTypes` array inclusion unless contains "any", (4) `fuelTypes` array inclusion unless contains "any", (5) `transmission` equality unless "any", (6) mandatory features subset match (case-insensitive, `JSON.parse()` features column); receive payload via `$input.first().json`; receive listings via `$('Get Car Listings').all()`; normalise enum values to lowercase before comparison; skip criteria where value is null or "any"; return matched items as output
- [X] T006 [US1] Connect Get Car Listings → Filter Listings in workflow `FPu7nerQuXt54T78`

**Checkpoint**: US1 independently testable — send POST webhook and verify Filter Listings node output shows matched car objects.

---

## Phase 4: User Story 2 — Mock Database Contains Meaningful Car Listings (Priority: P2)

**Goal**: Confirm the seeded dataset meets SC-002 coverage requirements (data seeded in T002; this phase verifies acceptance criteria).

**Independent Test**: Open `car_listings` table in n8n Data Store — confirm 12 rows, all 14 columns populated with no nulls, coverage across 7 makes, 5 body types, 4 fuel types, and varied features.

### Implementation for User Story 2

- [X] T007 [P] [US2] Verify `car_listings` Data Store table contains exactly 12 rows with all 14 columns populated, covering ≥7 makes, ≥5 body types (hatchback, suv, saloon, estate, coupe), ≥4 fuel types (petrol, diesel, hybrid, electric), price range £11,000–£45,000, seatCount 5–7, and valid JSON-serialised features arrays per specs/005-webhook-db-search/data-model.md SC-002 requirements

**Checkpoint**: US2 independently verified — database quality confirmed against SC-002.

---

## Phase 5: User Story 3 — Execution Log Captures Search Results (Priority: P3)

**Goal**: Add the "Log Results" Set node that formats Filter Listings output into a structured, human-readable execution log entry with four named fields.

**Independent Test**: Trigger the full workflow and open the execution detail view in n8n — Log Results node output must contain `matchCount`, `listings` (with `source` URLs), `searchCriteria`, and `noResults` fields; `noResults` must be `true` when `matchCount === 0`.

### Implementation for User Story 3

- [X] T008 [US3] Add "Log Results" Set node to workflow `FPu7nerQuXt54T78` with four output fields: `matchCount` (number — count of Filter Listings output items), `listings` (array — full matched car listing objects each including `source` URL), `searchCriteria` (object — active filter criteria extracted from webhook payload body for traceability), `noResults` (boolean — `true` when `matchCount === 0`) per specs/005-webhook-db-search/data-model.md Log Results node spec
- [X] T009 [US3] Connect Filter Listings → Log Results in workflow `FPu7nerQuXt54T78`

**Checkpoint**: US3 independently testable — trigger workflow, inspect Log Results node output in execution detail for all four structured fields.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Publish the workflow and run all manual validation scenarios from quickstart.md.

- [X] T010 Publish (activate) "Car Search Logger" workflow `FPu7nerQuXt54T78` in n8n to enable webhook reception and production execution
- [X] T011 [P] Validate Scenario 1 (SUV ≤ £30K filtered search) per specs/005-webhook-db-search/quickstart.md — expected: `matchCount` 2 (Ford Kuga, Kia Sportage), `noResults` false, execution status Success within 3 s (FR-003, SC-001, SC-003)
- [X] T012 [P] Validate Scenario 2 (electric fuel type only) per specs/005-webhook-db-search/quickstart.md — expected: `matchCount` 3 (BMW iX1, Tesla Model 3, Nissan Leaf), all `fuelType: "electric"` (SC-003)
- [X] T013 [P] Validate Scenario 3 (zero-results narrow criteria) per specs/005-webhook-db-search/quickstart.md — expected: `matchCount` 0, `listings` empty array, `noResults` true, execution status Success (FR-007, FR-008, SC-004)
- [X] T014 [P] Validate Scenario 4 (all "any" — return all records) per specs/005-webhook-db-search/quickstart.md — expected: `matchCount` 12 (FR-005)
- [X] T015 [P] Validate Scenario 5 (mandatory tow bar feature filter) per specs/005-webhook-db-search/quickstart.md — expected: `matchCount` 5 (Toyota RAV4, Ford Kuga, Volkswagen Tiguan, Ford Focus Estate, Kia Sportage); listings without tow bar excluded; sunroof (nice-to-have) does not reduce results (FR-004a)
- [X] T016 [P] Validate Scenario 6 (minSeats: 7) per specs/005-webhook-db-search/quickstart.md — expected: `matchCount` 1 (Volkswagen Tiguan only)
- [X] T017 [P] Validate log output shape per specs/005-webhook-db-search/quickstart.md log-output-shape-validation checklist — confirm all four fields present and correctly typed after any successful scenario; confirm no raw webhook body, no conversation metadata, no `endTrigger` in output (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 (table must exist before seeding)
- **US1 (Phase 3)**: Depends on Phase 2 completion; node additions can begin after T001, but meaningful testing requires T002
- **US2 (Phase 4)**: Depends on Phase 2 completion; T007 can run in parallel with T003–T006
- **US3 (Phase 5)**: Depends on Phase 3 completion (Log Results connects to Filter Listings output)
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 all complete; T010 must precede T011–T017

### User Story Dependencies

- **US2 (P2)**: Core data implementation in Foundational (T002); verification in Phase 4 (T007). Independent test: inspect Data Store after T002.
- **US1 (P1)**: Depends on Foundational for testability. Node implementation (T003–T006) can begin after T001.
- **US3 (P3)**: Depends on Phase 3 — Log Results node receives output from Filter Listings.

### Within Each User Story

```
T001 → T002                     (table before seed)
T002 → T003 → T004 → T005 → T006  (sequential — add node, then connect)
T006 → T008 → T009              (Log Results wired after Filter Listings exists)
T007 can run in parallel with T003–T006 (independent — inspection only)
T009 → T010 → T011–T017        (publish before manual validation; validations are parallel)
```

---

## Parallel Example: US2 Verification + US1 Implementation

```
# After Phase 2 completes, US2 verification and US1 node additions are independent:
Parallel set A:  T007 — Verify car_listings table contents (US2 — read-only)
Parallel set B:  T003 → T004 → T005 → T006 — Add and connect workflow nodes (US1)

# After T010 (workflow published), all 7 validation scenarios are independent:
T011  Scenario 1: SUV ≤ £30K
T012  Scenario 2: Electric fuel type
T013  Scenario 3: Zero results
T014  Scenario 4: All "any"
T015  Scenario 5: Mandatory tow bar
T016  Scenario 6: minSeats 7
T017  Log output shape check
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Create `car_listings` table (T001)
2. Complete Phase 2: Seed 12 mock listings (T002)
3. Complete Phase 3: Add Get Car Listings + Filter Listings nodes; wire to webhook (T003–T006)
4. **STOP and VALIDATE**: Trigger workflow, confirm Filter Listings output contains matched records
5. Proceed to US3 (Phase 5) and Polish

### Incremental Delivery

1. Phase 1 + 2 → Database ready; US2 independently verifiable
2. Phase 3 (US1) → Webhook-to-filter pipeline working; independently testable end-to-end
3. Phase 4 (US2) → Data quality confirmed against SC-002
4. Phase 5 (US3) → Structured log output added; full workflow testable
5. Phase 6 → Published and validated against all 6 quickstart.md scenarios + log shape check

---

## Notes

- No automated tests per Constitution Principle V — all validation is manual using specs/005-webhook-db-search/quickstart.md
- [P] tasks = can run concurrently (independent n8n operations on separate resources)
- Confirm exact webhook body field names against live 004 workflow before writing Filter Listings Code node logic (spec Assumption: field names consistent with 004 spec)
- `features` column in Data Store is a string — always call `JSON.parse()` in Code node before comparing
- All enum values in Data Store are lowercase; normalise payload values with `.toLowerCase()` before comparison
- Workflow must be *published* (not just saved as draft) before webhook activation and manual validation
