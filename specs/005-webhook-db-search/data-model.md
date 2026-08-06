# Data Model: Webhook Database Search and Logging

**Feature**: `005-webhook-db-search` | **Date**: 2026-08-06

---

## n8n Data Store Table: `car_listings`

This table holds the mock car listings used for search. It is created once during setup and seeded with 12 representative UK marketplace entries.

### Column Definitions

| Column        | Type    | Description                                                                 |
| ------------- | ------- | --------------------------------------------------------------------------- |
| `id`          | string  | Unique listing identifier, e.g. `"listing-001"`                             |
| `make`        | string  | Vehicle brand, e.g. `"Toyota"`                                              |
| `model`       | string  | Variant name, e.g. `"Yaris"`                                                |
| `year`        | number  | Manufacture year, e.g. `2022`                                               |
| `price`       | number  | Listed price in GBP, e.g. `14500`                                           |
| `mileage`     | number  | Odometer reading in miles, e.g. `12000`                                     |
| `fuelType`    | string  | One of: `"petrol"`, `"diesel"`, `"hybrid"`, `"electric"`                   |
| `bodyType`    | string  | One of: `"hatchback"`, `"suv"`, `"saloon"`, `"estate"`, `"coupe"`          |
| `transmission`| string  | One of: `"manual"`, `"automatic"`                                           |
| `seatCount`   | number  | Total seat count, e.g. `5`                                                  |
| `colour`      | string  | Body colour, e.g. `"white"`                                                 |
| `condition`   | string  | One of: `"new"`, `"used"`                                                   |
| `features`    | string  | JSON-serialised string array of feature names (lowercase), e.g. `'["sunroof","parking sensors"]'` |
| `source`      | string  | Marketplace listing URL, e.g. `"https://mock-marketplace.co.uk/cars/listing-001"` |

### Value Constraints

- All string enum values are **lowercase** in the Data Store. The Code node normalises payload values to lowercase before comparison.
- `features` is always a valid JSON array string; empty array is `'[]'`.
- `price` is a positive integer (no decimals).
- `mileage` is 0 for new cars.

---

## Seed Data (12 mock listings)

| id            | make        | model        | year | price | mileage | fuelType | bodyType  | transmission | seatCount | colour | condition | features (abbreviated)                                         | source                                                    |
| ------------- | ----------- | ------------ | ---- | ----- | ------- | -------- | --------- | ------------ | --------- | ------ | --------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| listing-001   | Toyota      | Yaris        | 2022 | 14500 | 12000   | petrol   | hatchback | manual       | 5         | white  | used      | parking sensors, bluetooth, heated seats                       | https://mock-marketplace.co.uk/cars/listing-001           |
| listing-002   | Toyota      | RAV4         | 2023 | 38000 | 5000    | hybrid   | suv       | automatic    | 5         | silver | used      | parking sensors, sunroof, heated seats, tow bar, apple carplay | https://mock-marketplace.co.uk/cars/listing-002           |
| listing-003   | Ford        | Fiesta       | 2021 | 11000 | 28000   | petrol   | hatchback | manual       | 5         | red    | used      | bluetooth, parking sensors                                     | https://mock-marketplace.co.uk/cars/listing-003           |
| listing-004   | Ford        | Kuga         | 2022 | 25000 | 18000   | diesel   | suv       | automatic    | 5         | black  | used      | tow bar, parking sensors, heated seats, apple carplay, sunroof | https://mock-marketplace.co.uk/cars/listing-004           |
| listing-005   | BMW         | 3 Series     | 2023 | 32000 | 9000    | diesel   | saloon    | automatic    | 5         | grey   | used      | parking sensors, heated seats, sunroof, bluetooth, apple carplay | https://mock-marketplace.co.uk/cars/listing-005         |
| listing-006   | BMW         | iX1          | 2024 | 45000 | 2000    | electric | suv       | automatic    | 5         | white  | used      | parking sensors, heated seats, apple carplay, bluetooth, panoramic roof | https://mock-marketplace.co.uk/cars/listing-006  |
| listing-007   | Volkswagen  | Golf         | 2022 | 19000 | 14000   | petrol   | hatchback | manual       | 5         | blue   | used      | parking sensors, bluetooth, apple carplay, heated seats        | https://mock-marketplace.co.uk/cars/listing-007           |
| listing-008   | Volkswagen  | Tiguan       | 2023 | 33000 | 8000    | diesel   | suv       | automatic    | 7         | black  | used      | tow bar, parking sensors, sunroof, heated seats, apple carplay, 7-seat configuration | https://mock-marketplace.co.uk/cars/listing-008 |
| listing-009   | Tesla       | Model 3      | 2023 | 42000 | 6000    | electric | saloon    | automatic    | 5         | red    | used      | parking sensors, apple carplay, heated seats, panoramic roof, bluetooth | https://mock-marketplace.co.uk/cars/listing-009  |
| listing-010   | Nissan      | Leaf         | 2022 | 22000 | 11000   | electric | hatchback | automatic    | 5         | white  | used      | parking sensors, heated seats, bluetooth, apple carplay        | https://mock-marketplace.co.uk/cars/listing-010           |
| listing-011   | Ford        | Focus Estate | 2021 | 13500 | 32000   | petrol   | estate    | manual       | 5         | grey   | used      | bluetooth, parking sensors, tow bar                            | https://mock-marketplace.co.uk/cars/listing-011           |
| listing-012   | Kia         | Sportage     | 2023 | 29000 | 7000    | hybrid   | suv       | automatic    | 5         | green  | used      | parking sensors, heated seats, sunroof, apple carplay, tow bar | https://mock-marketplace.co.uk/cars/listing-012           |

**Coverage summary**: 7 makes · 5 body types · 4 fuel types · price range £11,000–£45,000 · 5–7 seats · variety of features · `source` URL per listing (placeholder domain; swap for a real marketplace URL in production).

---

## CarSearchPayload → Filter Mapping

How each `CarSearchPayload` field maps to a filter condition on `car_listings`:

| Payload field      | Condition applied to listing                                                                 | Skip condition                        |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| `budgetMin`        | `listing.price >= budgetMin`                                                                 | `budgetMin === null`                  |
| `budgetMax`        | `listing.price <= budgetMax`                                                                 | `budgetMax === null`                  |
| `bodyTypes`        | `bodyTypes.map(toLowerCase).includes(listing.bodyType)`                                      | `bodyTypes` contains `"any"`          |
| `fuelTypes`        | `fuelTypes.map(toLowerCase).includes(listing.fuelType)`                                      | `fuelTypes` contains `"any"`          |
| `transmission`     | `listing.transmission === transmission.toLowerCase()`                                        | `transmission === "any"`              |
| `minSeats`         | `listing.seatCount >= minSeats`                                                              | `minSeats === null`                   |
| `features`         | All `features` entries where `mandatory === true` must be present in `listing.features` (case-insensitive) | No mandatory features in payload |

All active conditions are combined with AND logic. A listing is included only if it satisfies every active condition.

**Ignored payload fields**: `timeline`, `usageContext`, `annualMileage`, `endTrigger`, `isRefinement` — not used as filter criteria.

---

## Workflow Node Inputs / Outputs

### Node: Get Car Listings (n8n Data Store → Table → Get Many)

- **Input**: none (reads directly from Data Store)
- **Output**: Array of all rows from `car_listings` table; each row is an n8n item with the columns above as JSON fields

### Node: Filter Listings (Code node)

- **Inputs**:
  - `$input.first().json` from the Webhook Trigger — the `CarSearchPayload`
  - `$('Get Car Listings').all()` — all listing rows from the Data Store
- **Output**: Array of matching listing items (same shape as Data Store rows); empty array if no matches

### Node: Log Results (Set node)

- **Input**: Output of Filter Listings
- **Output** (fields set for execution log visibility):
  - `matchCount` (number) — count of matched listings
  - `listings` (array) — the matched listing objects, each including the `source` URL
  - `searchCriteria` (object) — the active filter criteria extracted from the payload (for traceability)
  - `noResults` (boolean) — `true` when `matchCount === 0`
