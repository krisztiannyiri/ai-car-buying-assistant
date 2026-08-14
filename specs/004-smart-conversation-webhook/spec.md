# Feature Specification: Smart Conversation Webhook

**Feature Branch**: `004-smart-conversation-webhook`

**Created**: 2026-08-05

**Status**: Implemented

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Explicit Conversation End (Priority: P1)

A car buyer finishes answering questions and tells the assistant they are done or want to see results. The agent recognises this signal, structures all gathered information as searchable car properties, and dispatches the structured data to the webhook exactly once.

**Why this priority**: This is the primary happy path. Every other trigger is a fallback. Getting a clean, intentional ending right first ensures data quality.

**Independent Test**: Start a conversation, answer several questions, then type "I'm done" or "show me cars". Verify exactly one webhook call is made containing only structured search fields — no raw conversation text.

**Acceptance Scenarios**:

1. **Given** the user has answered at least one clarifying question, **When** the user sends a message such as "I'm done", "that's all", "find me cars", or "stop asking", **Then** the agent acknowledges the end, generates a structured car-search object, and triggers the webhook with that object.
2. **Given** the user sends an explicit end signal, **When** the webhook fires, **Then** the payload contains only structured fields (budget, body type, fuel type, transmission, seat count, minimum boot size, must-have features, etc.) — no chat history or raw freeform text.
3. **Given** the webhook fires successfully, **When** the user looks at the chat, **Then** the agent confirms what was sent and what happens next (e.g. "I'm searching for cars matching your criteria").

---

### User Story 2 - User Sends Implicit All-Done Phrase (Priority: P1)

A car buyer expresses vague disengagement — "just find me something", "whatever you think is best", "I don't care anymore" — rather than a clear command like "I'm done". The agent recognises this as an implicit conclusion signal, stops asking questions, and fires the webhook with what has been gathered.

**Why this priority**: Vague exit signals are common. Users who lose patience must not be forced to say an exact phrase; the agent must recognise disengagement intent expressed loosely. Note: question refusals ("I don't know", "skip") are NOT implicit all-done phrases — they only skip a single field.

**Independent Test**: Start a conversation, answer two questions, then type "just find me something". Verify exactly one webhook call fires with gathered fields populated and unasked fields set to "any". Separately verify that typing "I don't know" does NOT fire the webhook — the agent continues with the next question instead.

**Acceptance Scenarios**:

1. **Given** the agent has asked at least one question, **When** the user sends a vague disengagement phrase such as "just find me something", "whatever you think is best", or "I have no preference for anything else", **Then** the agent recognises this as an implicit end signal, stops asking questions, and calls `conclude_conversation`.
2. **Given** the agent concludes from an implicit all-done phrase, **When** the payload is built, **Then** all fields that were never discussed are set to `"any"` / `["any"]` rather than null, so the downstream search can execute without errors.
3. **Given** the agent concludes from an implicit all-done phrase, **When** the webhook fires, **Then** the payload schema is identical to an explicit-end payload — `endTrigger` is `'implicit'`, all fields are present.

---

### User Story 3 - Conversation Length Limit with Car Suggestions (Priority: P2)

After a configurable number of question-answer rounds, the agent proactively suggests specific car makes/models or body types that match what it has learned so far, then asks the user if they want to refine further or conclude.

**Why this priority**: Prevents open-ended sessions that never resolve. Also gives users concrete anchors ("those 3 SUVs look good, done") which makes early-exit more likely and improves overall UX.

**Independent Test**: Simulate a conversation that reaches the round limit. Verify the agent outputs car suggestions before asking "shall we continue or search now?". Verify the webhook fires when the user chooses to conclude.

**Acceptance Scenarios**:

1. **Given** the conversation has reached the question-round threshold (default: 5 rounds), **When** the agent is about to ask the next question, **Then** it instead summarises its understanding, offers 2–4 specific car type or model suggestions, and asks the user whether to search now or continue refining.
2. **Given** the agent has presented suggestions, **When** the user confirms one or says "search now", **Then** the agent concludes the conversation and fires the webhook with the structured data.
3. **Given** the agent has presented suggestions and asked the continuation question, **When** the user accepts and continues, **Then** the agent resumes questioning; the check-in repeats at each subsequent N-round interval. After the configurable maximum number of accepted extensions (default: 3), the agent delivers a final "I need to search now" message and calls `conclude_conversation` regardless of user preference.
4. **Given** the round limit is reached with very little information, **When** the agent suggests cars, **Then** suggestions reflect the partial information (e.g. if only budget is known, suggest popular models in that range) rather than generic placeholders.

---

### User Story 4 - Structured Search Payload (Priority: P1)

At conversation end (by any trigger), the agent produces a well-defined structured object representing the user's car requirements and sends it to the webhook. This object is designed for querying a car database.

**Why this priority**: The structured payload is the core deliverable of every conversation. It must be correct and consistent regardless of how the conversation ended.

**Independent Test**: End a conversation via each of the three triggers. Compare the three payloads — structure must be identical; only field values differ.

**Acceptance Scenarios**:

1. **Given** the conversation is concluded, **When** the agent builds the structured object, **Then** it contains at minimum: budget range (min/max), preferred body types, fuel type preferences, transmission preference, minimum seat count, desired features list, and urgency/timeline.
2. **Given** a field was never discussed, **When** the agent builds the object, **Then** that field is set to a value indicating "no preference" rather than being omitted entirely, so downstream search logic has a consistent schema to work with.
3. **Given** the user expressed a hard requirement ("must have a tow bar"), **When** the agent structures the data, **Then** that requirement is marked as mandatory vs. nice-to-have.
4. **Given** the structured object is ready, **When** the webhook fires, **Then** the request body contains only the structured object — no conversation history, no agent reasoning, no raw messages.

---

### Edge Cases

- What happens when the user sends an end signal in the very first message, before any questions are asked? The agent should fire the webhook with all fields as "no preference".
- What happens if the webhook call fails? The agent should notify the user that something went wrong and offer to retry.
- What if the user simultaneously declines questions and provides new information ("I don't know, but definitely under €20,000")? The agent should capture the new information before concluding.
- What if the user changes a previously given answer just before ending? The latest answer must be used in the structured payload.
- What if the user refines their search multiple times after the first webhook fires? Each refinement must trigger a new webhook call with the fully updated payload; the UI must maintain the "refining" indicator throughout.
- What distinguishes a refinement message from an entirely new search intent? If the user explicitly says "start over" or "forget everything", the system should prompt them to start a new session rather than continuing to amend the existing one.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST NOT trigger the webhook on every incoming user message; it MUST trigger only when the conversation is explicitly or implicitly concluded.
- **FR-002**: The system MUST recognise explicit end signals from the user (e.g. "I'm done", "find me cars", "stop asking", "that's enough") and treat them as conversation-end triggers.
- **FR-003**: The ONLY implicit end trigger is a strong all-done phrase such as "just find something", "stop asking", or "I have no preference for everything". Question refusals ("I don't know", "skip", "doesn't matter") — whether single or repeated — MUST NOT end the conversation; the agent MUST skip the refused field and continue with the next question.
- **FR-004**: The system MUST track the number of completed question-answer rounds and, upon reaching the configured threshold (default: 5), present car suggestions and explicitly ask the user whether they want to continue answering questions or proceed to search. The agent MUST NOT conclude automatically — it MUST wait for the user's response. If the user declines to continue, the agent calls `conclude_conversation`. If the user accepts, the agent resumes questioning; the round-limit check repeats at each subsequent threshold interval so the user receives periodic check-ins. After a configurable maximum number of accepted extensions (default: 3, i.e. ~20 total rounds with a threshold of 5), the agent presents a final "I need to search now" message and calls `conclude_conversation` regardless of user preference — this soft ceiling prevents runaway sessions.
- **FR-005**: The system MUST generate 2–4 concrete car type or model suggestions after at least 3 question-answer rounds, grounded in the information gathered so far.
- **FR-006**: The system MUST produce a structured car-search object at conversation end, containing all standard search fields with values or "no preference" markers.
- **FR-007**: The structured object MUST distinguish between mandatory requirements and preferences for each field the user expressed an opinion on.
- **FR-008**: The webhook MUST be called exactly once per conversation conclusion, with the structured object as the sole payload body.
- **FR-009**: While the agent is in the `concluding` state (building the structured payload and firing the webhook), the system MUST display a typing/loading indicator so the user knows processing is in progress. Once the webhook fires successfully, the indicator MUST be replaced with a confirmation message stating what was submitted and what happens next.
- **FR-010**: If the webhook call fails, the system MUST automatically retry once silently. If the retry also fails, the system MUST surface a user-friendly error message and present a manual "Try again" option. No further automatic retries are attempted after the first.
- **FR-011**: After the webhook fires, the user MAY send follow-up messages to refine their search criteria. The system MUST enter a `refining` state and MUST clearly indicate to the user (via a distinct UI cue or agent message) that they are amending an existing search, not starting a new one.
- **FR-012**: Each refinement interaction MUST produce an updated structured payload and trigger a new webhook call, replacing the prior search intent.
- **FR-013**: If the user wishes to start a completely new, independent search, a separate session MUST be launched. The current session's collected answers MUST NOT be carried over to the new session.

### Non-Functional Requirements

- **NFR-001**: The structured payload schema MUST be stable across all conversation-end triggers so downstream database search logic requires no branching.
- **NFR-002**: Conversation state (answers gathered, round count) MUST be maintained across the full session so the agent never loses context mid-conversation.
- **NFR-003**: The round-limit threshold AND the maximum accepted-extension ceiling MUST both be configurable without a code change.

## Success Criteria _(mandatory)_

- Users complete a car-finding conversation in 5 or fewer question rounds in at least 80% of sessions.
- The webhook is triggered at most once per conversation in 100% of sessions.
- The structured payload contains at least 3 populated fields (non "no preference") in conversations where the user answered 2 or more questions.
- Users who choose to end (explicit exit or round-limit decline) receive a confirmation message before any search begins.
- Car suggestions are presented before or at the 5-round mark in every session that reaches that threshold.
- The webhook payload passes schema validation in 100% of firings.

## Key Entities _(mandatory)_

### ConversationSession

Tracks the state of a single chat session.

| Field              | Description                                         |
| ------------------ | --------------------------------------------------- |
| `sessionId`        | Unique identifier                                   |
| `roundCount`       | Number of completed question-answer exchanges       |
| `status`           | `active` / `concluding` / `concluded` / `refining`  |
| `collectedAnswers` | Map of field key → user-provided value or null      |
| `endTrigger`       | `explicit` / `implicit` / `length-limit` / `refinement` / `unknown` |
| `isRefinement`     | Boolean — true when session is amending a prior concluded search |

### CarSearchPayload

The structured object sent to the webhook.

| Field              | Type             | Description                                                    |
| ------------------ | ---------------- | -------------------------------------------------------------- |
| `budgetMin`        | number or null   | Minimum budget in user's currency                              |
| `budgetMax`        | number or null   | Maximum budget in user's currency                              |
| `bodyTypes`        | string[]         | Preferred body types (SUV, hatchback, etc.) or `["any"]`       |
| `fuelTypes`        | string[]         | Preferred fuel types (petrol, diesel, EV, hybrid) or `["any"]` |
| `transmission`     | string           | `manual`, `automatic`, or `any`                                |
| `minSeats`         | number or null   | Minimum seat count required                                    |
| `features`         | FeatureEntry[]   | List of desired features with `mandatory` flag                 |
| `timeline`         | string           | How soon the user wants to buy (`asap`, `3months`, `6months+`) |
| `usageContext`     | string           | Primary use: `commute`, `family`, `offroad`, `performance`     |
| `annualMileage`    | string or null   | Approximate annual mileage band                                |

### FeatureEntry

| Field       | Type    | Description                                |
| ----------- | ------- | ------------------------------------------ |
| `name`      | string  | Feature name (e.g. "tow bar", "sunroof")   |
| `mandatory` | boolean | True if user stated it as a hard requirement |

## Assumptions _(mandatory)_

- The existing chatbot already maintains session state across messages; this feature extends that state to include round counting and conclusion status.
- "One round" is defined as one agent question followed by one user response.
- Car suggestions are generated by the agent's language model using the collected fields — no external car database lookup is needed at suggestion time (only at the webhook consumer's side).
- The webhook endpoint URL is already configured in the application; this feature changes when it is called, not where.
- Webhook endpoint authentication is the responsibility of the endpoint consumer. The assistant does not attach credentials to the outbound call; access control is enforced at the receiving end.
- Currency is derived from user locale or defaults to the project's configured default; exact currency handling is out of scope for this feature.
- The round-limit threshold of 5 is a safe default and can be adjusted via environment configuration.

## Clarifications

### Session 2026-08-05

- Q: When a user replies "I don't know" or "skip" to a single clarifying question, should the agent immediately conclude the conversation, or skip that question and continue? → A: Skip the question and continue. [Amended 2026-08-05: consecutive refusals also do NOT end the conversation — see amendment note below.]
- Q: Should the webhook call include an authentication credential to prevent unauthorised access? → A: No — webhook endpoint authentication is the consumer's responsibility; the assistant sends no credentials.
- Q: After the webhook fires, can the user start a new search or refine the existing one in the same chat window? → A: Refinement of the existing session is allowed (with a clear "refining" UI indicator and a new webhook call per refinement). A completely new search requires a separate session to be launched.
- Q: What does the user see during the concluding state while the payload is built and the webhook fires? → A: A typing/loading indicator is shown during processing; it is replaced by a confirmation message once the webhook fires successfully.
- Q: When the webhook fails, should retry be user-initiated or automatic? → A: One silent automatic retry; if that fails, surface error with a manual "Try again" option. No further automatic retries.

### Session 2026-08-05 (second pass)

- Q: Now that refusals never end the conversation, should User Story 2 be reframed as "User sends implicit all-done phrase" or merged into User Story 1? → A: Reframe as "User Sends Implicit All-Done Phrase" — covers vague disengagement signals like "just find something"; refusals ("I don't know") only skip fields and never end the conversation.
- Q: The `endTrigger` field still lists `'refusal'` — should it be renamed now that refusals no longer end the conversation? → A: Rename to `'implicit'` — mirrors `'explicit'` and accurately describes the trigger as an implicit all-done phrase rather than a question refusal.
- Q: Can a user accept the round-limit continuation indefinitely (no ceiling on total rounds), or should there be a maximum total round count after which the agent concludes regardless? → A: Soft ceiling — after N accepted extensions (default: 3, i.e. ~20 total rounds at threshold 5), the agent presents a final "I need to search now" message and calls `conclude_conversation` with `endTrigger: "length-limit"` regardless of user preference. Both the threshold and the extension ceiling are configurable. FR-004 and NFR-003 updated accordingly.

### Amendment 2026-08-05 (via /speckit-converge)

- Two or more consecutive refusals MUST NOT end the conversation. Any number of "I don't know" / "skip" / "doesn't matter" replies skip the relevant fields; only an explicit all-done phrase ends the conversation via implicit signal. FR-003 updated accordingly.
- Round-limit check-in is interactive: the agent must ask the user whether to continue or conclude; no forced conclusion. If the user accepts, questioning continues with no hard extension cap; the check-in repeats at each subsequent threshold interval. FR-004 updated accordingly.

## Out of Scope

- Searching or querying any car database directly from the agent.
- Displaying car listings or images within the chat.
- Persisting conversation sessions to a database (sessions are in-memory / request-scoped as per existing architecture).
- Multi-language support for end-signal detection beyond what the underlying model naturally handles.
