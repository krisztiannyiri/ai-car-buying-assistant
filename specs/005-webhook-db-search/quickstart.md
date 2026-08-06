# Quickstart Validation Guide: Webhook Database Search and Logging

**Feature**: `005-webhook-db-search` | **Date**: 2026-08-06

Manual validation only (Constitution Principle V). All scenarios are verified in the n8n UI.

---

## Prerequisites

1. n8n instance running and accessible.
2. The "Car Search Logger" workflow is active (published).
3. The `car_listings` Data Store table has been created and seeded with the 12 mock listings from [data-model.md](data-model.md).
4. The webhook URL for the "Car Search Logger" workflow is known (copy from the Webhook Trigger node in n8n).
5. A tool for sending POST requests is available (e.g. `curl`, Postman, or the n8n workflow test runner).

---

## Scenario 1 — Filtered search returns matching listings

**Goal**: Verify FR-001, FR-003, FR-004, FR-006, SC-001, SC-003

**Steps**:
1. Open the "Car Search Logger" workflow in n8n → click **Test workflow**.
2. Send a POST request to the webhook URL with the following body:

```json
{
  "budgetMin": null,
  "budgetMax": 30000,
  "bodyTypes": ["suv"],
  "fuelTypes": ["any"],
  "transmission": "any",
  "minSeats": null,
  "features": [],
  "timeline": "any",
  "usageContext": "any",
  "annualMileage": null,
  "endTrigger": "explicit",
  "isRefinement": false
}
```

**Expected**:
- Execution completes with status **Success** within 3 seconds.
- In the execution detail, the **Log Results** node output shows:
  - `matchCount`: 2 (Ford Kuga £25,000 and Kia Sportage £29,000 match SUV + price ≤ £30,000)
  - `listings`: array containing exactly those two records
  - `noResults`: false

---

## Scenario 2 — Electric cars only

**Goal**: Verify fuel type filtering (SC-003 — any fuel type present in mock data returns ≥1 result)

**Steps**:
Send POST with:

```json
{
  "budgetMin": null,
  "budgetMax": null,
  "bodyTypes": ["any"],
  "fuelTypes": ["electric"],
  "transmission": "any",
  "minSeats": null,
  "features": [],
  "timeline": "any",
  "usageContext": "any",
  "annualMileage": null,
  "endTrigger": "explicit",
  "isRefinement": false
}
```

**Expected**:
- `matchCount`: 3 (BMW iX1, Tesla Model 3, Nissan Leaf)
- All three listings have `fuelType: "electric"`

---

## Scenario 3 — Zero results (narrow criteria)

**Goal**: Verify FR-007, FR-008, SC-004 — zero results do not cause a workflow error

**Steps**:
Send POST with:

```json
{
  "budgetMin": 5000,
  "budgetMax": 9000,
  "bodyTypes": ["suv"],
  "fuelTypes": ["electric"],
  "transmission": "manual",
  "minSeats": null,
  "features": [],
  "timeline": "any",
  "usageContext": "any",
  "annualMileage": null,
  "endTrigger": "explicit",
  "isRefinement": false
}
```

**Expected**:
- Execution completes with status **Success**.
- Log Results node output shows:
  - `matchCount`: 0
  - `listings`: `[]`
  - `noResults`: true
- No error or failed execution status.

---

## Scenario 4 — No preference (all "any") returns all listings

**Goal**: Verify FR-005, US1 Acceptance Scenario 3

**Steps**:
Send POST with:

```json
{
  "budgetMin": null,
  "budgetMax": null,
  "bodyTypes": ["any"],
  "fuelTypes": ["any"],
  "transmission": "any",
  "minSeats": null,
  "features": [],
  "timeline": "any",
  "usageContext": "any",
  "annualMileage": null,
  "endTrigger": "explicit",
  "isRefinement": false
}
```

**Expected**:
- `matchCount`: 12 (all listings returned)

---

## Scenario 5 — Mandatory feature filter

**Goal**: Verify FR-004a — only mandatory features reduce the result set

**Steps**:
Send POST with:

```json
{
  "budgetMin": null,
  "budgetMax": null,
  "bodyTypes": ["any"],
  "fuelTypes": ["any"],
  "transmission": "any",
  "minSeats": null,
  "features": [
    { "name": "tow bar", "mandatory": true },
    { "name": "sunroof", "mandatory": false }
  ],
  "timeline": "any",
  "usageContext": "any",
  "annualMileage": null,
  "endTrigger": "explicit",
  "isRefinement": false
}
```

**Expected**:
- Only listings that include `"tow bar"` are returned (tow bar is mandatory).
- `"sunroof"` is a nice-to-have — listings without sunroof are still returned.
- Matching listings: Toyota RAV4, Ford Kuga, Volkswagen Tiguan, Ford Focus Estate, Kia Sportage (all have tow bar).
- `matchCount`: 5

---

## Scenario 6 — Minimum seat count filter

**Goal**: Verify minSeats filtering

**Steps**:
Send POST with `minSeats: 7`, all other fields `"any"` / null.

**Expected**:
- Only the Volkswagen Tiguan (7 seats) is returned.
- `matchCount`: 1

---

## Log Output Shape Validation

After any successful scenario, verify the **Log Results** node output contains:

- [ ] `matchCount`: integer ≥ 0
- [ ] `listings`: array of car listing objects, each containing `id`, `make`, `model`, `year`, `price`, `mileage`, `fuelType`, `bodyType`, `transmission`, `seatCount`, `colour`, `condition`, `features` (parsed array), `source` (URL string)
- [ ] `searchCriteria`: object reflecting the active filters applied (for traceability)
- [ ] `noResults`: boolean — `true` only when `matchCount === 0`
- [ ] No raw webhook body, no conversation content, no `endTrigger` metadata in the output

---

## References

- Mock data schema and seed values: [data-model.md](data-model.md)
- Data Store column contract: [contracts/car-search-data-store.md](contracts/car-search-data-store.md)
- Incoming webhook payload type (`CarSearchPayload`): [specs/004-smart-conversation-webhook/data-model.md](../004-smart-conversation-webhook/data-model.md)
