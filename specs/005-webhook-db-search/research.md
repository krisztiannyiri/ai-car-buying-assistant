# Research: Webhook Database Search and Logging

**Feature**: `005-webhook-db-search` | **Date**: 2026-08-06

---

## Decision 1: Mock Data Storage Mechanism

**Decision**: n8n Data Store (native table, accessed via the n8n node → Table resource).

**Rationale**: The n8n Data Store is n8n's built-in structured storage. It separates mock data from workflow logic — the data can be inspected and updated in the n8n UI without touching workflow code. The MCP tools (`create_data_table`, `add_data_table_rows`) support seeding it programmatically during setup. It is the closest n8n equivalent to a real database table, aligning with the long-term goal of replacing it with a live marketplace datasource.

**Alternatives considered**:
- Code node with hardcoded array — simpler, but conflates data and logic; updating mock records requires editing workflow code; no visual table inspection.
- External database (PostgreSQL, SQLite) — introduces an external dependency and infrastructure requirement; violates the no-external-services assumption and Constitution Principle IV.

---

## Decision 2: Filtering Implementation

**Decision**: A single Code node (JavaScript) that receives the full `CarSearchPayload` from the webhook body and the car listings from the Data Store, then filters and returns matching records.

**Rationale**: The filtering requirements include range matching (budget min/max vs. price), array intersection (bodyTypes, fuelTypes), value equality (transmission), numeric comparison (minSeats vs. seatCount), and subset matching (mandatory features). n8n's visual Filter node supports only simple equality/contains conditions per item and cannot express these combined rules without many chained branches. A Code node expresses all filtering in one readable block with clear variable names.

**Filtering rules applied** (AND logic across all active criteria):
- Price ≥ `budgetMin` (if not null) AND price ≤ `budgetMax` (if not null)
- `bodyType` is in `bodyTypes` array (unless array contains `"any"`)
- `fuelType` is in `fuelTypes` array (unless array contains `"any"`)
- `transmission` equals payload `transmission` (unless value is `"any"`)
- `seatCount` ≥ `minSeats` (if not null)
- All features with `mandatory: true` in the payload exist in the car listing's features array (case-insensitive)

**Fields ignored as filter criteria**: `timeline`, `usageContext`, `annualMileage`, `endTrigger`, `isRefinement` — these are conversation metadata, not car attributes.

**Alternatives considered**:
- Multiple chained n8n Filter nodes — one per criterion — would require conditional branching to skip "any" values; produces an unmaintainable workflow graph for 6+ criteria.
- Split into multiple Code nodes (one per criterion) — adds unnecessary nodes; a single well-structured Code node is cleaner per Constitution Principle I.

---

## Decision 3: Workflow Extension Strategy

**Decision**: Extend the existing "Car Search Logger" n8n workflow (id: `FPu7nerQuXt54T78`) by adding nodes after the existing Webhook Trigger. The trigger and any pre-existing nodes are left unchanged.

**Node sequence added**:
1. **Get Car Listings** — n8n Data Store node (Get Many / Get All rows from the `car_listings` table)
2. **Filter Listings** — Code node that receives the webhook body and all listings, applies filtering rules, returns matched records
3. **Log Results** — Set node that formats and surfaces the result count and matched records in the execution output

**Rationale**: The spec explicitly says "extend the n8n workflow." Reusing the existing trigger avoids webhook URL changes and keeps the integration transparent to the caller (the Next.js app). Appending new nodes preserves any existing behaviour in the workflow.

**Alternatives considered**:
- New separate workflow triggered by the existing one — adds a workflow-to-workflow call hop with no benefit at this scope; the existing workflow already handles the trigger.
- Replace the existing workflow entirely — loses existing configuration and history unnecessarily.

---

## Decision 4: Features Storage Format in Data Store

**Decision**: Store the features list as a JSON-serialised string in a single `features` column (type: string). The Code node parses it with `JSON.parse()` before comparison.

**Rationale**: The n8n Data Store supports only primitive column types (string, number, boolean, date). Arrays must be stored as strings. JSON serialisation is the standard approach; it preserves array structure and is trivially reversible with `JSON.parse()`.

**Format**: `'["parking sensors","heated seats","sunroof"]'`

**Alternatives considered**:
- Separate boolean column per feature (e.g., `has_sunroof`, `has_tow_bar`) — scales poorly as features grow; requires schema change to add a new feature; 10+ columns for a modest feature set.
- Comma-separated string — fragile for feature names that contain commas; requires custom parsing.
