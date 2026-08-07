# Research: Chat Search Feedback

**Branch**: `008-chat-search-feedback` | **Date**: 2026-08-07

## Decision Log

### D-001: How to signal "search in progress" to the browser

**Decision**: Emit a new `__SEARCH_STARTED__` stream sentinel from the server immediately before calling `fireWebhookWithRetry`. The client detects this token in the accumulated stream, strips it from visible content, and sets `isSearching: true` to render the in-progress indicator.

**Rationale**: The existing architecture already uses a sentinel protocol (`__WEBHOOK_EVENT__`) to communicate out-of-band events over a streaming HTTP response. Adding a second sentinel at the start of the webhook call is the minimal, zero-new-dependency extension to that pattern. It requires no new endpoint, no WebSocket, and no polling. The client is already iterating over each chunk and checking for sentinels; a second marker adds one `indexOf` check.

**Alternatives considered**:
- A separate `/api/search-status` polling endpoint — rejected; adds a new server route and a polling loop with race conditions.
- WebSocket for real-time search status — rejected; disproportionate infrastructure addition for a single in-flight state that resolves in ≤30 s.
- Optimistic UI (always show "searching" when `isStreaming && sentinel not yet seen`) — rejected; creates a false indicator during normal Q&A rounds where no search fires.

---

### D-002: How to pass search results from n8n back to the browser

**Decision**: Change the n8n webhook node from `responseMode: "onReceived"` to `responseMode: "responseNode"` and add a **Respond to Webhook** node as the workflow's terminal node. The response body is `{ status: "success", results: SearchResultItem[], totalCount: number }`. `fireWebhookWithRetry` in `lib/n8n/trigger.ts` parses this JSON body and includes it in `WebhookResult`. `app/api/chat/route.ts` forwards it in the `WebhookEvent` sentinel.

**Rationale**: `responseMode: "onReceived"` returns HTTP 200 before any workflow nodes have run, making it impossible to include result data. `responseMode: "responseNode"` defers the HTTP response until the Respond to Webhook node executes, enabling the workflow to compute results and return them synchronously in the same HTTP response the Next.js server is awaiting. This requires no polling, no callbacks, and no additional infrastructure.

**Alternatives considered**:
- n8n calling back to a new Next.js `/api/search-results` endpoint (push/callback model) — rejected; requires a new server route exposed to the internet, authentication for that route, and correlation of search requests with responses.
- Storing results in a shared database and polling from the browser — rejected; introduces a persistence layer and polling that the constitution's "Minimal Dependencies" principle opposes.

---

### D-003: How to represent structured search results in the Message type

**Decision**: Add an optional `searchResults?: { items: SearchResultItem[]; totalCount: number }` field to the `Message` interface. When this field is present, `ChatInterface.tsx` renders a `SearchResultMessage` component instead of `msg.content`. The `content` field on such a message is set to an empty string.

**Rationale**: The current `Message` type only has `content: string`, which is rendered as plain pre-wrap text. Rendering a compact card list with clickable source links requires structured data — formatting a result list as a plain string would be brittle and hard to style. Extending `Message` with an optional typed field is the minimal change: existing code paths that only read `msg.content` are unaffected; only the render switch in `ChatInterface.tsx` needs a new branch.

**Alternatives considered**:
- A separate `resultMessages: SearchResultMessage[]` array in `ConversationState` — rejected; splits the chronological message order between two arrays, complicating scroll-to-bottom logic and history persistence.
- Formatting results as a markdown string and rendering with a markdown library — rejected; requires a new npm package (violates "Minimal Dependencies") and produces less accessible output than structured JSX.

---

### D-004: Timeout strategy for the n8n webhook

**Decision**: Apply a 30-second `AbortSignal.timeout(30_000)` per individual fetch attempt in `fireWebhookWithRetry`. The function retries once on failure (existing behavior), giving a maximum total blocking time of 60 seconds in the worst case, but the first response (success or timeout) within 30 seconds is the common path.

**Rationale**: `AbortSignal.timeout` is a native browser/Node.js API with no additional imports required. Applying it per-attempt (rather than as a total budget across both attempts) is consistent with the spec's intent: "receives no response within 30 seconds" naturally reads as a per-attempt threshold. A 60-second worst case only occurs on double network failure, which is already an exceptional failure path.

**Alternatives considered**:
- `Promise.race([fetch(...), new Promise(reject, 30_000)])` — functionally equivalent but more verbose; `AbortSignal.timeout` is the idiomatic modern form.
- Total 30-second budget across both attempts — rejected; too aggressive for a retry pattern; if the first attempt takes 28 seconds and fails, there is no meaningful time for a retry.

---

### D-005: Rendering the in-progress indicator

**Decision**: Show the in-progress indicator as a new bot message bubble (`.assistantBubble`) containing a text label "Searching for matching cars…" followed by the existing three-dot animated `loadingIndicator` span. This is rendered conditionally when `isSearching: true` in `ConversationState`. When `isSearching` becomes false, this bubble disappears and the result/error/no-results message appears in `state.messages` in its place.

**Rationale**: Using a conditional bubble (not a persisted message in `state.messages`) keeps the in-progress state ephemeral and avoids leaving a "searching…" entry in conversation history. The existing `loadingIndicator` CSS animation is already defined in `ChatInterface.module.css`; reusing it ensures visual consistency and adds zero new CSS.

**Alternatives considered**:
- Adding the "Searching…" text as a temporary `Message` object to `state.messages` and later replacing it — rejected; requires tracking the message ID for replacement, complicating state management unnecessarily.
- A separate spinner element outside the message list — rejected; the spec requires the indicator to appear in the chat thread (FR-005, clarification Q1).

---

### D-006: n8n `SearchResultItem` field mapping from `CarListing`

**Decision**: Map `CarListing` fields to `SearchResultItem` as follows:

| SearchResultItem field | CarListing source | Nullable |
|---|---|---|
| `make` | `make` | No |
| `model` | `model` | No |
| `bodyType` | `bodyType` | Yes |
| `year` | `year` | No |
| `price` | `price` | Yes (treated as nullable for display; it's `number` in the DB but may be absent in partial records) |
| `sourceUrl` | `source` | Yes |

**Rationale**: The `CarListing` data model (from `specs/007-email-notification-results/data-model.md`) has all five required fields. `source` in the DB stores a dealer name or identifier, not necessarily a full URL. The n8n Respond to Webhook Code node will assemble `sourceUrl` from the `source` field; if it's already a URL it passes through, otherwise it's set to `null` and the UI shows "Not available". All five spec-required fields (FR-002) are represented.

**Alternatives considered**:
- Renaming `source` to `sourceUrl` in the DB — rejected; the DB is shared with the email feature and should not be changed for a display concern.
