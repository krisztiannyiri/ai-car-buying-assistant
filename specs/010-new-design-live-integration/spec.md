# Feature Specification: New Design Live Integration

**Feature Branch**: `010-new-design-live-integration`

**Created**: 2026-08-12

**Status**: Implemented

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Complete wizard and receive real car matches (Priority: P1)

A user works through the five-step guided wizard — describing their driving habits, priorities,
budget, and practical requirements — and on the final step sees real car listings returned from
the backend, not placeholder data.

**Why this priority**: This is the core value proposition of the new design. Without real results
the wizard is a non-functional prototype.

**Independent Test**: Navigate all five steps, click "Find my matches", and verify that the
results panel shows cars fetched from the live API with make, model, year, price, and a link to
the listing.

**Acceptance Scenarios**:

1. **Given** the user has completed steps 1–4, **When** they click "Find my matches", **Then**
   the app advances immediately to step 5, shows a loading indicator, calls the AI backend,
   streams the response, triggers a vehicle search, and replaces the loading state with real
   search result cards.
2. **Given** the backend returns zero matching results, **When** the search completes, **Then**
   the results area displays a clear "no matches found" message prompting the user to broaden
   their criteria.
3. **Given** the backend search fails, **When** the error is detected, **Then** a "Try again"
   button appears and a retry call is made when the user clicks it.

---

### User Story 2 - Ask Cora in chat with real AI responses (Priority: P2)

A user opens the "Ask Cora" chat panel at any point during the wizard and receives genuine
AI-generated responses instead of pre-programmed keyword matches.

**Why this priority**: The chat panel is the primary refinement surface in the new design. Fake
responses undermine trust and reduce usefulness.

**Independent Test**: Send a free-text message through the chat panel and verify the response
is streamed from the live AI API (not a hardcoded reply).

**Acceptance Scenarios**:

1. **Given** the chat panel is open, **When** the user sends a message, **Then** the app
   streams a real response from the AI backend and renders it incrementally with the typing
   indicator showing until the response completes.
2. **Given** a message is in flight, **When** the typing indicator is visible, **Then** no
   second submission is possible (input is disabled).
3. **Given** the AI service returns an error, **When** the error is detected, **Then** a
   human-readable error message appears in the chat thread.

---

### User Story 3 - Provide email to receive full results (Priority: P3)

A user optionally enters their email address so the full search results list is sent to them,
beyond the 5 results shown on screen.

**Why this priority**: The email capture existed in the previous design; it should carry over
so users who found it valuable do not lose the feature.

**Independent Test**: Enter an email before triggering the final search, complete the wizard,
and verify the email is included in the backend call and the overflow message references the
email address.

**Acceptance Scenarios**:

1. **Given** the user has entered an email in the chat panel's email field, **When** the search
   completes with more than 5 results, **Then** the results area shows "X more results — check
   your email for the full list".
2. **Given** no email was entered, **When** the search completes with overflow, **Then** the
   overflow message omits the email reference.

---

### User Story 4 - Reset and start a new search (Priority: P4)

A user who has completed or partially completed a search can start fresh, clearing all wizard
answers and chat history.

**Why this priority**: The "New car search" and "Start over" controls are present in the new
design and must function correctly end-to-end.

**Independent Test**: Complete the wizard to results, click "New car search", and verify all
wizard state and chat messages are cleared.

**Acceptance Scenarios**:

1. **Given** the user is on any step, **When** they click "New car search" or "Start over",
   **Then** the wizard resets to step 1 with all answers cleared and the chat history reset.
2. **Given** a streaming call is in progress, **When** the user resets, **Then** the in-flight
   request is cancelled before the reset completes.

---

### Edge Cases

- What happens when the user reaches step 5 but the AI backend is unreachable?
- How does the search loading state behave when "Searching for matching cars…" is active in the
  chat panel?
- What if the user clicks "Find my matches" while a chat message is still being streamed?
- What happens if the user navigates back from step 5 after results are loaded?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST replace the mock `sendChat` implementation with real streaming calls
  to the AI chat backend, using the same protocol (sentinels, webhook events) as the existing
  chat system.
- **FR-002**: The Results step (step 5) MUST render real `SearchResultItem` data returned from
  the backend instead of the static placeholder car array.
- **FR-003**: The chat panel MUST display an incremental streaming response (text appears as it
  arrives) and show a typing indicator during the entire waiting period.
- **FR-004**: When a vehicle search is in progress the chat panel MUST show a "Searching for
  matching cars…" state distinct from the normal thinking indicator.
- **FR-005**: The app MUST expose an optional email-capture field; the email value MUST be
  forwarded to the backend with every search request.
- **FR-006**: When the backend search fails the app MUST display a retry control; clicking it
  MUST re-attempt the search with the stored payload.
- **FR-007**: The new design MUST replace the current `ChatInterface`-based home page as the
  primary UI entry point; once verified, `ChatInterface.tsx`, `SearchResultMessage.tsx`,
  `Header.tsx`, and all associated stylesheets MUST be deleted.
- **FR-008**: The "New car search" / "Start over" controls MUST cancel any in-flight network
  request and fully reset wizard and chat state.
- **FR-009**: The session lifecycle (active → concluding → concluded → refining) MUST be
  preserved so the AI backend receives the correct `isRefinement` flag on follow-up messages
  after results are shown.
- **FR-010**: All wizard answers (driving habits, priorities, budget, seats, parking,
  powertrain, notes) MUST be sent to the backend as a new structured `wizardAnswers` field on
  the `/api/chat` request body; the backend system prompt MUST be updated to use these values
  directly instead of gathering them through conversational questions.
- **FR-011**: Clicking "Find my matches" MUST advance the wizard to step 5 immediately; step 5
  MUST display a loading state until the search response is received, then replace it with the
  real result cards.

### Key Entities

- **ConversationState**: Streaming flag, message list, session status, error state, searching
  flag, webhook error, retry payload.
- **ChatMessage**: ID, role (user/assistant), text content; extended with optional
  `searchResults` payload for result cards.
- **SearchResultItem**: Make, model, body type, year, price, source URL — rendered as result
  cards on step 5.
- **WizardAnswers**: Driving habits, priorities, budget, payment type, seats, parking,
  powertrain, price target, notes — collected across steps 1–4.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user completing all five wizard steps and clicking "Find my matches" receives
  real car listings on step 5 within a reasonable wait time (consistent with current backend
  performance).
- **SC-002**: Every message sent through the chat panel receives a streamed AI response; no
  hardcoded responses remain in the codebase.
- **SC-003**: The retry flow works end-to-end: a simulated search failure shows the retry
  button, clicking it triggers a fresh backend call.
- **SC-004**: The wizard and chat state are completely cleared after reset, with no residual
  data visible to the user.
- **SC-005**: The new design is the default experience when opening the app — the old
  `ChatInterface` is no longer the primary entry point.

## Assumptions

- The `/api/chat` request body will be extended with a `wizardAnswers` field (new); all
  existing fields (`messages`, `isRefinement`, `roundCount`, `userEmail`) remain in place.
- The `/api/chat` system prompt will be simplified: the multi-turn lifestyle question-gathering
  phase is replaced by direct use of the pre-collected wizard answers, so the AI can proceed
  straight to recommendation and search.
- The `/api/webhook-retry` endpoint remains unchanged.
- The `SearchResultMessage` component (or an equivalent adapted for the new design's visual
  style) will be used to render real search results within the result cards.
- The email input field will be surfaced inside the chat panel, consistent with where it
  naturally fits in the new layout.
- The new design's `NewDesign.tsx` file will be refactored in-place; the old
  `ChatInterface.tsx` will be retained only during active migration work, then deleted along
  with `SearchResultMessage.tsx`, `Header.tsx`, and all associated stylesheets once the new
  design is verified as the primary entry point.

## Clarifications

### Session 2026-08-12

- Q: When the user reaches step 5, how should their wizard answers be delivered to the AI backend? → A: As new fields added to the `/api/chat` request body — the backend API and system prompt will be updated to accept structured wizard answers and the conversational question-gathering phase will be simplified/removed accordingly.
- Q: After the new design is confirmed working, what should happen to the old ChatInterface, SearchResultMessage, and Header components? → A: Delete all old components and their stylesheets once the new design is the primary entry point.
- Q: When the user clicks "Find my matches", should the app advance to step 5 immediately or wait for results? → A: Advance to step 5 immediately on click and show a loading indicator on the results page while the search runs.
