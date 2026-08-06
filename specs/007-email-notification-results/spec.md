# Feature Specification: Email Notification for Car Search Results

**Feature Branch**: `007-email-notification-results`

**Created**: 2026-08-06

**Status**: Implemented

**Input**: User description: "I have an existing n8n workflow. In the last step it currently logs some search results. I want to introduce a new email sending step. Whenever there are result(s) then send an email to the user. A new email template must be created with the important data. The search results are about cars which are considered as a good fit for the user, based on the user needs. Explore the data schema and create a template, also extend the workflow with the new step."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Receive Car Recommendations by Email (Priority: P1)

A user has completed a car search through the assistant. The search returns one or more cars that match their needs. Shortly after the search completes, the user receives an email in their inbox listing the matching vehicles — each with enough information to evaluate and compare options without opening any additional system.

**Why this priority**: This is the core deliverable. Without a successful email delivery containing matched listings, no other aspect of the feature has value.

**Independent Test**: Can be fully tested by triggering a car search that yields at least one result, then verifying an email arrives at the expected recipient address with correct car listing data formatted clearly.

**Acceptance Scenarios**:

1. **Given** a car search returns one or more matching vehicles, **When** the search processing completes, **Then** an email is delivered to the designated recipient address containing all matched vehicles and their key details.
2. **Given** an email has been sent, **When** the recipient opens it, **Then** each car listing is visually distinguishable and includes: make, model, year, price, mileage, fuel type, body type, transmission, seat count, condition, colour, and a highlights list of notable features.
3. **Given** a car search returns multiple results, **When** the email is rendered, **Then** all matched vehicles appear in the email — none are omitted — and the total count is stated clearly at the top.

---

### User Story 2 - No Email Sent When Search Returns No Results (Priority: P2)

A user's search criteria are too restrictive and no cars match. The system does not send an email, avoiding an empty or misleading notification in the user's inbox.

**Why this priority**: Sending an empty notification is a poor experience and creates noise. Suppressing it is a necessary boundary condition for the feature to behave correctly.

**Independent Test**: Can be fully tested by triggering a car search with criteria that yield zero results and verifying that no email is dispatched.

**Acceptance Scenarios**:

1. **Given** a car search returns zero matching vehicles, **When** the search processing completes, **Then** no email is sent to any recipient.
2. **Given** a car search returns zero matching vehicles, **When** the process finishes, **Then** the system's downstream state reflects that no notification was dispatched (no partial sends, no error).

---

### User Story 3 - Email Includes User's Search Context (Priority: P3)

The email provides the user with a summary of the criteria used to find the results, so they can immediately recall what they asked for and understand why each car was included.

**Why this priority**: Without search context, the user may be confused about why certain cars were recommended — especially if the search happened as part of a longer conversation. Including a brief criteria summary makes the email self-contained and actionable.

**Independent Test**: Can be fully tested by triggering a search with specific criteria (budget range, body type, fuel type) and verifying the email reflects those criteria alongside the results.

**Acceptance Scenarios**:

1. **Given** a search was conducted with specific criteria (budget, body types, fuel types, transmission, minimum seats, required features), **When** the email is delivered, **Then** the email includes a readable summary of those criteria so the user can see what the recommendations are based on.
2. **Given** a criterion was set to "any" or left unspecified, **When** the email is rendered, **Then** that criterion is either omitted from the summary or shown as "No preference" — it does not appear as a blank or null value.

---

### Edge Cases

- What happens when the `userEmail` field is present but contains an invalid address (e.g., `"notanemail"`)?
  - Treated identically to an absent field: the email step is skipped, a non-blocking warning is recorded, and the workflow completes successfully.
- What happens when one of the car listings is missing a field (e.g., colour is blank)?
  - The email template must handle missing or null values gracefully — the field is either omitted from that listing's card or displayed as "Not specified", without breaking the layout.
- What happens when the features list for a car is empty?
  - The features section of that listing's card shows "No additional features listed" rather than an empty list or a rendering error.
- What happens when a very large number of results are returned (e.g., 50+ cars)?
  - The email is still sent in full. All matched cars are included. No artificial cap is applied.
- What happens when the email delivery fails?
  - Email delivery failure is non-blocking. The workflow completes successfully and the failure is recorded as a warning. The caller receives a normal success response. No retry logic is required for the initial implementation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST evaluate the search result count after the filtering step and only proceed to send an email when the count is greater than zero.
- **FR-002**: When results exist, the system MUST attempt to send one email per search execution to the designated recipient address containing all matched car listings. A delivery failure MUST be recorded as a non-blocking warning; the overall workflow MUST still complete successfully and return a normal response to the caller.
- **FR-003**: Each car listing in the email MUST display the following fields: make, model, year, price (formatted in EUR using the pattern €X,XXX — e.g., €25,000), mileage, fuel type, body type, transmission, seat count, condition, colour, and a list of notable features.
- **FR-004**: The email MUST include a header section stating the total number of matched cars and a brief summary of the search criteria used. The email subject line MUST follow the pattern "Your car matches: {N} result(s) found", where {N} is the actual count of matched listings.
- **FR-005**: The email MUST use an HTML template to present listings in a structured, scannable layout — each listing visually separated from the others.
- **FR-006**: The email template MUST handle missing or null field values without breaking the layout or rendering errors.
- **FR-007**: The system MUST NOT send an email when the search returns zero results.
- **FR-008**: The recipient email address MUST be sourced from the search request payload via a `userEmail` field. If the field is absent, empty, or contains a malformed address, the email step MUST be skipped and the reason recorded as a non-blocking workflow warning. The workflow MUST still complete successfully in all such cases.

### Key Entities

- **Car Listing**: A vehicle record returned by the search. Key attributes: `listingId`, `make`, `model`, `year`, `price`, `mileage`, `fuelType`, `bodyType`, `transmission`, `seatCount`, `colour`, `condition`, `features` (list of strings), `source`.
- **Search Criteria**: The set of filters applied during the search. Key attributes: `budgetMin`, `budgetMax`, `bodyTypes`, `fuelTypes`, `transmission`, `minSeats`, `features` (with mandatory flag per feature).
- **Email Notification**: A single outbound message triggered when results are found. Contains: recipient address, search criteria summary, full list of matched car listings.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every search execution returning at least one result triggers exactly one email to the correct recipient — 100% delivery rate under normal conditions.
- **SC-002**: Every search execution returning zero results produces zero outbound emails — no false positives.
- **SC-003**: The email renders correctly and includes complete listing data for all matched cars within 30 seconds of the search completing.
- **SC-004**: Users can scan and compare all matched listings from the email alone, without needing to return to the assistant — confirmed by the email containing all required fields per listing.
- **SC-005**: The email template handles missing field values without layout breakage — every field gracefully degrades to a "Not specified" fallback rather than displaying null or crashing.

## Clarifications

### Session 2026-08-06

- Q: When the email delivery step fails, should that failure stop the overall workflow and surface an error to the caller, or should the workflow complete successfully and record the failure as a non-blocking warning? → A: Non-blocking — workflow completes successfully; email failure is logged as a warning.
- Q: What should the email subject line say when car recommendations are found? → A: "Your car matches: {N} result(s) found" — includes the result count so the recipient knows immediately how many matches are included.
- Q: How should car prices be formatted in the email — which currency symbol and locale convention should be used? → A: EUR — displayed as €25,000 (European format, comma as thousands separator).
- Q: What should happen when the `userEmail` field is present but contains an invalid email address? → A: Skip and warn — same behaviour as an absent `userEmail`; workflow completes successfully.

## Assumptions

- The car search workflow already exists and correctly filters listings before this feature's email step is added; this specification covers only the notification layer.
- The email sending infrastructure (SMTP credentials or email service provider) is already available and configured in the environment where the workflow runs.
- No email personalisation beyond the search results and criteria summary is required for this feature (e.g., no user name, no profile data).
- The recipient's email address is a single address per search request; bulk or multi-recipient delivery is out of scope.
- Email deliverability and spam filtering are outside the scope of this feature; the system's responsibility ends at successful handoff to the email service.
- The listing fields available in the data source at the time of this specification are: `listingId`, `make`, `model`, `year`, `price`, `mileage`, `fuelType`, `bodyType`, `transmission`, `seatCount`, `colour`, `condition`, `features`, `source`. No additional fields are assumed.
