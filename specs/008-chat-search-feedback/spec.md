# Feature Specification: Chat Search Feedback

**Feature Branch**: `008-chat-search-feedback`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "I want to show some feedbacks for the user after a search is executed. Currently an email notification is sent if results were found, but the chat window doesn't reflect anything."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Search Completes with Results (Priority: P1)

A user sends a message requesting car recommendations. The assistant triggers a search against the vehicle database. When the search returns matching results, the chat window immediately shows a bot message containing a compact list of results — each entry showing car type, model name, year of production, price, and a link to the source listing.

**Why this priority**: This is the core gap — the chat is silent even though the backend found cars. Closing this gap directly fulfills the user's need for immediate, in-context confirmation.

**Independent Test**: Can be fully tested by submitting a car search query that returns at least one result, then verifying that a feedback message appears in the chat window without checking email.

**Acceptance Scenarios**:

1. **Given** a user has submitted a car search query, **When** the search completes and at least one result is found, **Then** the chat window displays a bot message containing a compact list with each result's car type, model name, year, price, and source link (showing a placeholder for any missing field).
2. **Given** a search result feedback message has appeared, **When** the user scrolls or continues the conversation, **Then** the feedback message persists in the conversation history in its correct position.

---

### User Story 2 - Search Completes with No Results (Priority: P2)

A user sends a message requesting car recommendations with very specific or unusual criteria. The search returns no matches. The chat window shows a message explaining that no results were found, and optionally suggests the user broaden their criteria.

**Why this priority**: Without this, users with zero-result searches receive no feedback at all — not even an email — leaving them uncertain whether the system is working.

**Independent Test**: Can be fully tested by submitting a search with criteria known to produce no results and verifying that a "no results" message appears in the chat.

**Acceptance Scenarios**:

1. **Given** a user has submitted a car search query, **When** the search completes and no results are found, **Then** the chat window displays a human-readable message stating that no matching cars were found.
2. **Given** a "no results" message is shown, **When** the user reads the message, **Then** the message includes a suggestion to adjust search criteria or try again.

---

### User Story 3 - Search Still in Progress (Priority: P3)

A user submits a search query. The search takes a noticeable amount of time. While the search is running, the chat window shows an indicator that the search is in progress, preventing the user from assuming the system has stalled.

**Why this priority**: Progressive feedback reduces perceived wait time and prevents users from submitting duplicate requests.

**Independent Test**: Can be fully tested by triggering a search and verifying a loading/in-progress indicator appears before any results message is shown.

**Acceptance Scenarios**:

1. **Given** a search has been triggered, **When** the search is still running, **Then** the chat window shows both a text message (e.g., "Searching for matching cars…") and a visual loading animation.
2. **Given** an in-progress indicator is shown, **When** the search completes (with or without results), **Then** the indicator is replaced by the appropriate result or no-result feedback message.

---

### Edge Cases

- What happens when the search times out (after 30 seconds) or fails due to a backend error? The chat shows a user-friendly error message rather than remaining silent.
- What if the user sends another message while the search is in progress? The in-progress indicator should remain until the search resolves, and the new message should not interrupt it.
- What if multiple searches are triggered in quick succession? Each should produce its own feedback message in the correct order in the conversation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a feedback message in the chat window whenever a vehicle search completes with results.
- **FR-002**: The feedback message for a successful search MUST include a compact list of up to 5 results. Each list item MUST display: car type, model name, year of production, price, and a link to the source listing. If any field is unavailable for a given result, a visible placeholder (e.g., "Price: Not available") MUST be shown in its place. If more than 5 results exist, the message MUST include a note stating the total count and directing the user to their email for the full list.
- **FR-003**: System MUST display a feedback message in the chat window when a search completes with no results.
- **FR-004**: The no-results message MUST include a suggestion that the user refine or broaden their search criteria.
- **FR-005**: System MUST display an in-progress indicator in the chat window while a search is actively running. The indicator MUST include both a short text message (e.g., "Searching for matching cars…") and a visual loading animation.
- **FR-006**: The in-progress indicator MUST be replaced by the results or no-results feedback message once the search resolves.
- **FR-007**: System MUST display a human-readable error message in the chat window if a search fails or receives no response within 30 seconds, rather than leaving the chat silent.
- **FR-008**: All chat feedback messages MUST appear as bot/assistant messages in the chat thread — styled and positioned identically to other assistant responses — and MUST be persisted in the conversation history in the correct chronological order.
- **FR-009**: Existing email notifications for results-found searches MUST continue to function unchanged alongside the new chat feedback.

### Key Entities

- **Search Event**: Represents a triggered vehicle search, with states: in-progress, completed-with-results, completed-no-results, failed.
- **Feedback Message**: A bot/assistant chat message generated by the system that communicates the outcome of a search event. Attributes: type (success / no-results / error), timestamp. For success type: contains a compact result list where each item has car type, model, year of production, price, and source link.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of completed searches (with or without results) produce a visible feedback message in the chat window within 2 seconds of the search concluding.
- **SC-002**: 100% of in-progress searches show a loading/waiting indicator in the chat before any result message appears.
- **SC-003**: Users report understanding the outcome of a search without needing to check their email, measured by a task-completion rate of ≥ 90% in usability testing.
- **SC-004**: Zero searches result in a completely silent chat window (no indicator, no outcome message, no error message).
- **SC-005**: Existing email notification delivery rate remains unchanged after the feature is introduced (no regression).

## Clarifications

### Session 2026-08-07

- Q: Should the feedback message appear as an assistant/bot reply inside the normal chat thread, or as a visually distinct system notification outside the conversation flow? → A: Feedback appears as a bot/assistant message in the chat thread — same flow as other responses.
- Q: What information should a "results found" feedback message minimally include? → A: A compact list per result containing: car type, model, year of production, link to the source listing, and price.
- Q: After how many seconds should a search be considered timed out and trigger an error message? → A: 30 seconds.
- Q: Are all five result fields (car type, model name, year of production, price, and source link) guaranteed to be present in every search result, or might some fields occasionally be missing? → A: Fields can be missing; show a visible placeholder (e.g., "Price: Not available") when a field has no value.
- Q: Should the in-progress indicator appear as a text message, a visual animation, or both? → A: Both: a short text message (e.g., "Searching for matching cars…") and a visual loading animation in the chat thread.
- Q: If a search returns a large number of results, should the chat show all of them or cap the list? → A: Cap at 5 results in the chat; include a note indicating how many additional results exist and directing the user to their email for the full list.

## Assumptions

- Users are authenticated and have an active chat session when searches are triggered.
- The chat window is the primary interaction surface; email notifications are supplementary and will remain active.
- A single search is assumed to be triggered per user message; the system does not batch multiple independent searches from one message.
- Search results are displayed as a compact per-result list (type, model, year, price, source link) directly in the chat message; full detail pages or expanded listings within the chat are out of scope.
- The definition of a "search" aligns with the existing n8n workflow that currently sends email notifications — no new search trigger mechanism is introduced.
- Mobile and desktop viewports must both display the feedback messages correctly, per the project's Responsive Design principle.
