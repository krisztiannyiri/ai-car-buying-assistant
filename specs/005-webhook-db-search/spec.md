# Feature Specification: Webhook Database Search and Logging

**Feature Branch**: `005-webhook-db-search`

**Created**: 2026-08-06

**Status**: Implemented

**Input**: User description: "I want to extend the n8n workflow. I want to have a database with some mock data. When the webhook is triggered, in the next step there must be a search in the database based on the input that the webhook receives and it should log the search results."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Webhook Triggers Database Search (Priority: P1)

The existing AI conversation agent completes a session and sends a structured car-search payload via HTTP POST to the workflow webhook. The workflow receives the payload, queries a pre-populated mock car database using the structured criteria, and writes the matching results to the workflow execution log.

**Why this priority**: This is the core flow the feature is built around. Without this, there is nothing else to test or demonstrate.

**Independent Test**: Can be fully tested by sending a POST request to the webhook URL with a structured car-search payload and verifying that matching records appear in the n8n execution log output.

**Acceptance Scenarios**:

1. **Given** the workflow is active and the mock database contains car listings, **When** a POST webhook request is sent with a structured payload (e.g., `{ "fuelType": "electric", "bodyType": "SUV", "budget": { "min": 20000, "max": 50000 } }`), **Then** all database records matching those criteria are retrieved and written to the execution log.
2. **Given** the workflow is active, **When** a POST webhook request is sent with criteria that match no records (e.g., a very narrow budget with uncommon requirements), **Then** the execution log records an empty result set and the workflow completes without error.
3. **Given** the workflow is active, **When** a POST webhook request is sent with all fields set to "any" / no preference (as the 004 workflow does when the user exits early), **Then** the workflow returns all records from the database and logs them.

---

### User Story 2 - Mock Database Contains Meaningful Car Listings (Priority: P2)

The mock database is pre-populated with a representative set of car listings that mirror the structured search criteria used by the conversation agent, so search results are meaningful and demonstrable without any external setup.

**Why this priority**: The quality of the mock data determines whether the feature can be demonstrated and evaluated. Poor or missing data would make search results unverifiable.

**Independent Test**: Can be tested independently by inspecting the database contents directly in n8n and confirming that multiple records with varied attributes exist and cover different combinations of the searchable criteria.

**Acceptance Scenarios**:

1. **Given** the mock database exists, **When** its contents are inspected, **Then** it contains at least 10 car listings, each with: listing ID, make, model, year, price, mileage, fuel type, body type, transmission, seat count, colour, condition, and a features list — realistic enough to represent a real marketplace entry.
2. **Given** the mock database contains varied data, **When** a search is performed by fuel type "electric", **Then** at least one record is returned, demonstrating correct filtering.

---

### User Story 3 - Execution Log Captures Search Results (Priority: P3)

The workflow logs the search results in a structured, readable format within the n8n execution output so that a developer can inspect what was found without additional tooling.

**Why this priority**: Logging is the final observable outcome of the workflow. It allows developers to verify correctness and debug issues.

**Independent Test**: Can be tested by triggering the workflow and opening the execution detail view in n8n to confirm the log node output contains the retrieved records.

**Acceptance Scenarios**:

1. **Given** a search returns one or more records, **When** the execution completes, **Then** the log output includes the full set of matched records in a structured format.
2. **Given** a search returns no records, **When** the execution completes, **Then** the log output explicitly indicates that no results were found (e.g., empty array or a "no results" message).

---

### Edge Cases

- What happens when all payload fields are set to "any" / no preference — the workflow should return all records.
- What happens if the database is empty at query time — the workflow should return an empty result without error.
- What happens when a payload field contains an unexpected value — the workflow should treat it as "no preference" for that field and continue.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The n8n workflow MUST accept an HTTP POST request at the existing webhook endpoint, receiving the structured car-search object (same schema as dispatched by the 004 conversation workflow) as the request body.
- **FR-002**: The workflow MUST include a mock database populated with at least 10 car listings. Each listing MUST contain: make, model, year, price (GBP), mileage, fuel type, body type, transmission, seat count, colour, condition (new/used), a list of features (e.g., sunroof, tow bar, heated seats, parking sensors), a listing identifier, and a source URL linking to the listing on a marketplace. The data MUST be realistic enough to represent actual marketplace entries.
- **FR-003**: Upon webhook trigger, the workflow MUST execute a search against the mock database using the structured criteria in the POST body (budget range, fuel type, body type, transmission, seat count, features).
- **FR-004**: The search MUST match records where each provided criterion is satisfied; fields set to "any" or absent MUST be treated as no filter on that attribute.
- **FR-004a**: For features, the search MUST filter only on features the user marked as mandatory in the payload; features marked as nice-to-have MUST be ignored as filter criteria in this version.
- **FR-005**: When all fields in the payload indicate no preference ("any"), the workflow MUST return all records from the database.
- **FR-006**: The workflow MUST log the search results (matched records) as a structured output in the n8n execution log after the search step completes.
- **FR-007**: When no records match the search criteria, the workflow MUST log an explicit empty or "no results" indicator rather than failing silently.
- **FR-008**: The workflow MUST complete successfully (non-error status) for all valid webhook inputs, including those that return zero results.

### Key Entities _(include if feature involves data)_

- **Car Listing**: Represents a single vehicle entry in the mock database, modelled on a real marketplace listing. Key attributes: listing ID (unique identifier), make (brand), model (variant name), year (manufacture year), price (listed price in GBP), mileage (integer, miles), fuel type (petrol / diesel / hybrid / electric), body type (SUV / hatchback / saloon / estate / coupe), transmission (manual / automatic), seat count (integer), colour, condition (new / used), features list (array of strings, e.g., "sunroof", "tow bar", "heated seats", "parking sensors"), source URL (link to the listing on the marketplace).
- **Car-Search Payload**: The structured object received from the POST webhook request body. Contains: budget (min/max), fuel type preference, body type preference, transmission preference, minimum seat count, desired features. All fields may be set to "any" to indicate no preference. Schema reused from the 004 conversation workflow.
- **Search Result Set**: The collection of car listings that satisfy all non-"any" criteria in the Car-Search Payload. May be empty. Passed to the logging step.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A webhook POST request with structured criteria consistently returns matching car listings in the execution log within 3 seconds.
- **SC-002**: The mock database contains at least 10 distinct car listings covering at least 3 makes, 3 body types, 2 fuel types, and a variety of features, realistic enough to represent actual marketplace entries.
- **SC-006**: The long-term goal of this feature is to surface matching car listings to the user from a real marketplace; the mock data and search logic MUST be designed with this future integration in mind.
- **SC-003**: A search using any single criterion present in the mock dataset (e.g., fuel type "electric") returns at least one result 100% of the time.
- **SC-004**: A search with criteria that match no records returns an empty result with a success execution status 100% of the time (no workflow errors on zero results).
- **SC-005**: The execution log output is human-readable and structured so a developer can identify matched listings without consulting external documentation.

## Assumptions

- The existing n8n workflow (feature 004-smart-conversation-webhook) is the base workflow being extended; the database search and logging steps are appended as the next steps after the webhook trigger.
- The mock database is implemented using n8n's built-in data storage capabilities (n8n Data Store or equivalent static node data) to avoid external dependencies.
- The webhook POST body schema is reused directly from the 004 workflow output; no schema transformation is needed before searching.
- The Car-Search Payload uses field names consistent with those defined in the 004 specification (e.g., `fuelType`, `bodyType`, `budget.min`, `budget.max`, `transmission`, `seatCount`). The exact field names will be confirmed against the live 004 workflow during implementation.
- Filtering uses AND logic across all specified (non-"any") criteria — a car listing must satisfy every active criterion to be included in the result set.
- Nice-to-have features from the payload are not used as filter criteria in this version; only mandatory features reduce the result set.
- The workflow does not return a response body to the webhook caller; the n8n execution log is the sole output of this feature.
- The feature does not require authentication on the webhook endpoint beyond what is already configured in the existing workflow.

## Clarifications

### Session 2026-08-06

- Q: How should the search term be passed to the webhook — POST body vs GET query parameter? → A: POST request body; reuse the structured car-search payload already sent by the 004 workflow, extending fields if needed.
- Q: Should the workflow return matched listings in the HTTP response or log only? → A: Execution log only — the webhook caller receives no structured response.
- Q: Should the mock database include a features list per listing, and should search filter by required features? → A: Yes — include a full features list per listing; filter by required features. Mock data must represent a real marketplace car listing (the long-term goal is to surface results to the user from a real marketplace).
- Q: Should features filtering apply to mandatory features only, or also nice-to-have features? → A: Mandatory features only — nice-to-have features are ignored as filter criteria in this version.
