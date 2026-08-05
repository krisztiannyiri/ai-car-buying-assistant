# Research: Smart Conversation Webhook

**Feature**: `004-smart-conversation-webhook` | **Date**: 2026-08-05

## Decision 1: End-Signal Detection Strategy

**Decision**: Anthropic tool_use — the model calls a `conclude_conversation` tool when it decides the conversation is over, supplying the structured `CarSearchPayload` as the tool input.

**Rationale**: Tool_use is the model-native way to produce structured output at a chosen moment. It avoids regex parsing of free-form text (brittle) and avoids a second LLM call to re-format answers (wasteful). The `@anthropic-ai/sdk` already supports tool_use in `messages.stream()`; no new library is needed. The system prompt instructs the model on exactly when to call the tool (explicit end, repeated refusals, 5-round limit).

**Alternatives considered**:
- Regex / keyword match in API route on every user message — brittle, fails on paraphrases ("I think we're good"), requires maintenance as phrases expand.
- Client-side intent detection in `ChatInterface.tsx` — impossible to implement reliably without an LLM call; would require a second API round-trip per message.
- Separate `/api/conclude` endpoint called by the frontend — shifts the "when to conclude" decision back to the client, which can't reliably detect intent.

---

## Decision 2: Frontend Communication of Conclusion Event

**Decision**: End-of-stream sentinel — the API route appends `\n\n__WEBHOOK_EVENT__<json>` to the text stream after the webhook fires. The frontend strips and parses it after reading the full stream.

**Rationale**: The current API route returns `text/plain` streams. Adding a sentinel is the least-disruptive change: the frontend already accumulates the full stream string before committing it to the message array. The sentinel is appended after the webhook fires, so the frontend knows the webhook status (success/failed) and the end trigger.

**Alternatives considered**:
- Custom HTTP response header (e.g. `X-Conversation-Event`) — headers must be determined before the stream body starts; we don't know the tool call result until the stream is half-way through, so this isn't viable without buffering the whole response.
- Change response format to `application/json` on conclusion — would require the frontend to switch between two parsing paths and adds branching complexity.
- Server-Sent Events (SSE) with named event types — would cleanly separate metadata from text, but requires replacing the current `ReadableStream` transport and changes both ends of the pipe.

---

## Decision 3: Session State Location (Round Count, Status, Answers)

**Decision**: Client-side, extending `ConversationState` in `ChatInterface.tsx`.

**Rationale**: The Next.js API route is stateless between requests — each POST to `/api/chat` is independent. The client already holds the full message array (passed to the API on every request). Round count and session status are derived from this array and user interactions; tracking them client-side is the natural fit. The structured `collectedAnswers` is not tracked directly — the model accumulates them via its context window and serialises them into the tool call payload. Only `roundCount`, `sessionStatus`, `isRefinement`, and `consecutiveRefusals` need explicit client state.

**Alternatives considered**:
- Server-side session in a cookie or `sessionStorage` — adds server complexity and violates "in-memory / request-scoped" architecture assumption from spec.
- Derive everything from message array on each render — round count requires counting agent question turns which is error-prone; explicit state is cleaner.

---

## Decision 4: Webhook Retry Mechanism

**Decision**: One automatic silent retry inside `fireWebhookWithRetry` in `lib/n8n/trigger.ts`. If both attempts fail, the function returns `{status: "failed", error: string}`. No further automatic retries.

**Rationale**: One retry covers the most common transient failure (brief network blip, DNS hiccup) without introducing delay loops or complex back-off logic. Returning a typed result instead of fire-and-forget allows the API route to inject the correct `webhookStatus` into the sentinel.

**Alternatives considered**:
- Three retries with exponential back-off — disproportionate for a user-facing chat assistant; adds latency and complexity.
- Keep fire-and-forget, surface errors via log only — removes the user's ability to retry, violates FR-010.

---

## Decision 5: System Prompt Strategy

**Decision**: Single extended system prompt in `route.ts` that covers all conversation phases: questioning, refusal handling, round-limit suggestions, and conclusion.

**Key behaviours encoded in the prompt**:
- Ask one clarifying question at a time.
- When the user replies "I don't know" / "skip" / "doesn't matter" to any question (regardless of how many in a row): acknowledge, skip the field, ask the next question. **No number of consecutive refusals ends the conversation.**
- Call `conclude_conversation` ONLY when: (a) user sends a clear explicit or implicit all-done phrase ("I'm done", "find me cars", "stop asking", "just find something"); OR (b) the round-limit check-in was presented AND the user declined to continue.
- After every **N completed question-answer rounds** (default N=5, configurable): present 2–4 car type/model suggestions, then ask an explicit continuation question: "Would you like to continue answering questions to refine further, or shall I search with what we have?" — wait for the answer. If the user declines → call `conclude_conversation` with `endTrigger: "length-limit"`. If the user accepts → resume questioning; repeat the check-in at the next N-round interval. After a configurable maximum of accepted extensions (default: 3, i.e. ~20 total rounds at threshold 5), the agent delivers a final "I really need to search now" message and calls `conclude_conversation` with `endTrigger: "length-limit"` regardless of user preference — this soft ceiling prevents runaway sessions.
- When concluding: populate every `CarSearchPayload` field; use `"any"` for fields never discussed; mark hard requirements with `mandatory: true` in the features list.
- For refinements (when the session is already concluded): incorporate the user's amendment into the existing collected criteria and call `conclude_conversation` again with the updated payload.

_Amended 2026-08-05: removed two-consecutive-refusal end trigger; made round-limit check-in interactive; added soft extension ceiling (default 3 extensions max) to prevent runaway sessions._

**Rationale**: Encoding all phases in one prompt keeps the logic co-located and avoids splitting orchestration across server and client. The model is responsible for the conversational intelligence; the API route is purely structural (stream, detect tool call, fire webhook).

---

## Decision 6: Refinement Mode Indicator

**Decision**: A visible badge/label ("Refining your search") rendered by `ChatInterface.tsx` when `sessionStatus === 'refining'`. Implemented via a CSS module class toggled on the section root or toolbar — no new component.

**Rationale**: Satisfies FR-011's "distinct UI cue" requirement with minimal code. Reuses the existing toolbar area. Mobile-first — badge is inline, no fixed positioning required.
