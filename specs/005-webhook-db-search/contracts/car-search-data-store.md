# Contract: n8n Data Store — car_listings Table

**Feature**: `005-webhook-db-search` | **Date**: 2026-08-06

This document defines the internal data contract for the `car_listings` table in the n8n Data Store. It is consumed exclusively by the "Car Search Logger" workflow.

---

## Table: `car_listings`

**Purpose**: Stores mock car marketplace listings used as the searchable dataset for this feature.

**Access**: Read-only at runtime (workflow reads rows; no workflow node writes to this table during execution). Rows are seeded once during setup.

---

## Schema

```
Column         Type     Nullable  Example value
─────────────────────────────────────────────────────────────────────────────
id             string   NO        "listing-001"
make           string   NO        "Toyota"
model          string   NO        "Yaris"
year           number   NO        2022
price          number   NO        14500
mileage        number   NO        12000
fuelType       string   NO        "petrol"
bodyType       string   NO        "hatchback"
transmission   string   NO        "manual"
seatCount      number   NO        5
colour         string   NO        "white"
condition      string   NO        "used"
features       string   NO        '["parking sensors","bluetooth","heated seats"]'
source         string   NO        "https://mock-marketplace.co.uk/cars/listing-001"
```

---

## Enum Values

All enum values are stored and compared in **lowercase**.

| Column         | Allowed values                                       |
| -------------- | ---------------------------------------------------- |
| `fuelType`     | `"petrol"` · `"diesel"` · `"hybrid"` · `"electric"` |
| `bodyType`     | `"hatchback"` · `"suv"` · `"saloon"` · `"estate"` · `"coupe"` |
| `transmission` | `"manual"` · `"automatic"`                          |
| `condition`    | `"new"` · `"used"`                                  |

---

## `features` Field Format

The `features` column stores a JSON-serialised array of lowercase feature name strings.

```json
["parking sensors", "heated seats", "sunroof", "tow bar", "apple carplay"]
```

Known feature values in the seed data:

- `"parking sensors"`
- `"bluetooth"`
- `"heated seats"`
- `"sunroof"`
- `"tow bar"`
- `"apple carplay"`
- `"panoramic roof"`
- `"7-seat configuration"`

The Code node parses this column with `JSON.parse()`. Comparison is case-insensitive string equality.

---

## Webhook Contract (unchanged from feature 004)

The POST webhook contract is defined in `specs/004-smart-conversation-webhook/contracts/chat-api.md`. This feature adds no new external interfaces — the workflow extension is transparent to the webhook caller.

The `CarSearchPayload` type consumed by the filter Code node is defined in `specs/004-smart-conversation-webhook/data-model.md` under `lib/types/n8n.ts`.
