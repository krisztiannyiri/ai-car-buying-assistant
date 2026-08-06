# Data Model: Email Notification for Car Search Results

**Branch**: `007-email-notification-results` | **Date**: 2026-08-06

## Entities

### CarListing _(existing — n8n Data Table `car_listings`)_

Represents a single vehicle record stored in the car listings database.

| Field          | Type             | Nullable | Notes                                          |
| -------------- | ---------------- | -------- | ---------------------------------------------- |
| `listingId`    | string           | No       | Unique identifier for the listing              |
| `make`         | string           | No       | Vehicle manufacturer (e.g., Toyota, BMW)       |
| `model`        | string           | No       | Model name (e.g., Corolla, 3 Series)           |
| `year`         | number           | No       | Production year (e.g., 2022)                   |
| `price`        | number           | No       | Asking price in EUR (e.g., 25000)              |
| `mileage`      | number           | No       | Odometer reading in km                         |
| `fuelType`     | string           | No       | One of: petrol, diesel, electric, hybrid       |
| `bodyType`     | string           | No       | One of: hatchback, saloon, suv, estate, etc.   |
| `transmission` | string           | No       | One of: manual, automatic                      |
| `seatCount`    | number           | Yes      | Number of seats                                |
| `colour`       | string           | Yes      | Exterior colour                                |
| `condition`    | string           | Yes      | One of: new, used                              |
| `features`     | string (JSON)    | Yes      | JSON-encoded array of feature strings          |
| `source`       | string           | Yes      | Dealer name or source identifier               |

**At runtime** (post-filter Code node), `features` is parsed from JSON string to `string[]` before being included in the email template.

**Null-value contract**: Any field marked nullable may be absent or null in a given record. The email template must substitute `"Not specified"` for null/missing values and `"No additional features listed"` for an empty features array.

---

### SearchCriteria _(existing — webhook payload, extended)_

The set of filters collected from the user and sent to n8n via webhook. Extended in this feature with `userEmail`.

| Field                | Type                         | Nullable | Notes                                              |
| -------------------- | ---------------------------- | -------- | -------------------------------------------------- |
| `budgetMax`          | number                       | Yes      | Maximum price in EUR; null = not specified         |
| `bodyTypes`          | string[]                     | No       | Preferred body types; `["any"]` = no preference    |
| `fuelTypes`          | string[]                     | No       | Preferred fuel types; `["any"]` = no preference    |
| `transmission`       | `"manual"│"automatic"│"any"` | No       | Transmission preference                            |
| `minSeats`           | number                       | Yes      | Minimum seat count; null = not specified           |
| `features`           | FeatureEntry[]               | No       | Required/preferred features; `[]` = none specified |
| `yearMin`            | number                       | Yes      | Minimum production year; null = not specified      |
| `yearMax`            | number                       | Yes      | Maximum production year; null = not specified      |
| `engineDisplacements`| string[]                     | No       | Preferred engine sizes; `["any"]` = no preference  |
| `usageContext`       | string                       | No       | One of: commute, family, offroad, performance, any |
| `annualMileage`      | string                       | Yes      | Estimated annual km band (e.g., "10000-15000")     |
| `endTrigger`         | string                       | No       | Why the conversation ended                         |
| `isRefinement`       | boolean                      | No       | Whether this is a repeat/refined search            |
| **`userEmail`**      | **string**                   | **Yes**  | **NEW — recipient email address; null = skip send**|

**`userEmail` validation rules**:
- If absent, null, or empty string → skip email step, record non-blocking warning
- If present but not a valid email format → skip email step, record non-blocking warning
- Valid format: must contain `@` and a domain with at least one `.`

**`FeatureEntry` sub-type**:

| Field       | Type    | Notes                              |
| ----------- | ------- | ---------------------------------- |
| `name`      | string  | Feature name (e.g., "heated seats")|
| `mandatory` | boolean | true = hard requirement            |

---

### EmailNotification _(new — runtime only, not persisted)_

Constructed at runtime within the n8n workflow when matched listings exist and `userEmail` is valid. Not stored; consumed immediately by the Send Email node.

| Field             | Type         | Notes                                              |
| ----------------- | ------------ | -------------------------------------------------- |
| `to`              | string       | Resolved from `SearchCriteria.userEmail`           |
| `subject`         | string       | Pattern: `"Your car matches: {N} result(s) found"` |
| `htmlBody`        | string       | Full HTML email body (built by Code node)          |
| `matchCount`      | number       | Count of matched listings                          |
| `listings`        | CarListing[] | All matched listings (features parsed to string[]) |
| `searchCriteria`  | SearchCriteria | The criteria used to produce the results         |

---

## State Transitions

```
Search executed
     │
     ▼
matchCount evaluated
     │
     ├─ matchCount = 0 ──────────────────────────────► No email sent (workflow ends OK)
     │
     └─ matchCount ≥ 1
           │
           ▼
     userEmail evaluated
           │
           ├─ absent / null / malformed ──────────────► Non-blocking warning recorded; workflow ends OK
           │
           └─ valid email address
                  │
                  ▼
           HTML body constructed
                  │
                  ▼
           Email dispatched
                  │
                  ├─ delivery success ────────────────► Workflow ends OK
                  │
                  └─ delivery failure ────────────────► Non-blocking warning recorded; workflow ends OK
```
