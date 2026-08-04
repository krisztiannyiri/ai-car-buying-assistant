# Research: AI Chatbot Integration

**Feature**: 002-ai-chatbot-integration | **Date**: 2026-08-04

---

## Decision 1: Claude Model Selection

**Decision**: `claude-sonnet-4-6`

**Rationale**: Explicitly selected by the project owner. Sonnet 4.6 provides a strong quality/cost balance ($3/$5 per 1M tokens input/output) well-suited to a consumer chatbot where responsiveness and affordability matter alongside quality. The 1M token context window far exceeds the 20-message history cap enforced by FR-003 (~8K tokens at most), leaving ample headroom.

**Alternatives considered**:

- `claude-opus-4-8` — Highest reasoning quality but significantly higher cost ($5/$25 per 1M tokens). Overkill for car Q&A where Sonnet-tier reasoning is sufficient. Rejected.
- `claude-haiku-4-5` — Fastest and lowest cost ($1/$5 per 1M tokens); 200K context window. Adequate for simple Q&A but lower quality for nuanced car comparisons and financing advice. Rejected as default; viable override for cost-sensitive deployments.
- `claude-sonnet-5` — Latest Sonnet generation; higher cost than 4.6. Not selected; 4.6 was explicitly chosen.

---

## Decision 2: Streaming Architecture — Route Handler vs Alternatives

**Decision**: Next.js Route Handler at `app/api/chat/route.ts` returning a `ReadableStream` response

**Rationale**: Server Actions are designed for form mutations and return serialised data — they do not support raw streaming text body responses. Route Handlers expose the full `Response` API, allowing a `ReadableStream` to be returned directly. The Anthropic SDK's `client.messages.stream()` async iterator integrates cleanly with a `ReadableStream` constructor on the server: each `content_block_delta` event yields a text chunk which is enqueued into the stream. On the client, `fetch()` + `response.body.getReader()` reads chunks as they arrive and appends them to React state, producing the word-by-word appearance required by FR-001.

**Alternatives considered**:

- Server Actions with streaming — Not supported; Server Actions serialise return values rather than streaming raw body content. Rejected.
- WebSockets — Bidirectional; overkill for unidirectional per-request streaming. Adds connection lifecycle complexity with no benefit over `fetch` streaming. Rejected.
- Direct browser fetch to Anthropic API — Would expose `ANTHROPIC_API_KEY` to the client. Hard rejected (security requirement).
- Server-Sent Events via `EventSource` — More complex client setup; `EventSource` does not support `POST` requests or `AbortController`. Plain `ReadableStream` with `fetch()` achieves the same result more simply. Rejected.

---

## Decision 3: Context Window Management Strategy

**Decision**: Message-count pruning — keep the 20 most-recent messages before each API call; oldest messages are dropped silently; the full visible history is never truncated in the UI

**Rationale**: Simple, predictable, zero async overhead. All current Claude models have 200K–1M token context windows; 20 typical car-buying messages (~200–400 tokens each) consume at most ~8K tokens — well within any limit. The spec explicitly requires "silently drop oldest" (FR-003). Token-counting would require a network round-trip per message with no user-visible benefit at this conversation length. The 20-message cap satisfies SC-002 (10-message coherent context) with 2× headroom and SC-005 (30 visible messages) simultaneously — the UI history is never pruned, only the API payload.

**Alternatives considered**:

- Token-count pruning via `POST /v1/messages/count_tokens` — Accurate but adds an extra network round-trip before every API call. Not justified at this conversation length. Rejected.
- Summarisation (call Claude to condense old context into a summary) — High complexity, extra cost and latency. Not appropriate for a consumer chatbot with short sessions. Rejected.
- No pruning — Risk of hitting API limits for very long sessions; unpredictable cost. Rejected.

---

## Decision 4: System Prompt Design

**Decision**: Static system prompt defined as a TypeScript string constant in `app/api/chat/route.ts`; passed as the `system` parameter in every API call; never sent to the client

**Rationale**: The spec requires a server-side system prompt (Assumptions) establishing the car-buying assistant persona and polite off-topic decline (FR-002). A static constant in the route file satisfies this with zero infrastructure. The `system` field is a top-level Anthropic API parameter — it is not a message in the `messages` array and does not count against the pruned 20-message history cap.

**System prompt** (canonical):

```
You are an AI assistant specialising in helping people research, compare, and purchase cars.
You have deep knowledge of car models, trim levels, pricing, financing, reliability ratings,
and the car-buying process.

Only answer questions related to car research, car comparisons, financing, insurance,
maintenance, and the car-buying process. If the user asks about anything unrelated to cars
or car buying, politely decline and redirect them: acknowledge their question briefly, explain
you are focused on car-buying topics, and offer to help with a car-related question instead.

Be conversational, accurate, and helpful. When comparing cars, use concrete data where
relevant (reliability scores, typical price ranges, fuel economy). Be honest about uncertainty.
```

**Alternatives considered**:

- Database-stored prompt — Overengineered for a single-persona app with no dynamic prompt variation. Rejected.
- Client-configurable prompt — Users could override the persona; security concern. Rejected.
- No system prompt — AI would answer any question without the car-buying constraint, violating FR-002. Rejected.

---

## Decision 5: Stream Cancellation via AbortController

**Decision**: An `AbortController` instance held in a `useRef` inside ChatInterface; its `signal` is passed to `fetch()`; `controller.abort()` is called on "New conversation" (FR-009) and on component unmount; a new controller is created before each new API call

**Rationale**: The Web `AbortController` API is the standard mechanism for cancelling in-flight `fetch` requests. When the client aborts the fetch, the Next.js Route Handler's `request.signal` propagates, which terminates the Anthropic SDK stream on the server — stopping bandwidth consumption. Holding the controller in a `ref` (not state) avoids triggering re-renders and stale closure issues. A fresh controller per call ensures a completed request's controller can never accidentally cancel a subsequent request.

**Alternatives considered**:

- A boolean `isCancelled` flag in state — Cannot interrupt an in-flight network request; the stream would continue consuming bandwidth even if the UI ignores it. Rejected.
- `EventSource` with `.close()` — Only applicable if SSE transport had been chosen. Rejected (see Decision 2).

---

## Decision 6: Error Response Protocol

**Decision**: Route Handler catches typed Anthropic SDK errors and returns JSON `{ error: { type, message } }` with a matching HTTP status code; client checks `response.ok` before reading the stream body

**Rationale**: The spec requires a specific rate-limit error message distinct from generic failures (FR-006). Typed SDK error classes (`Anthropic.RateLimitError`, `Anthropic.APIStatusError`, `Anthropic.APIConnectionError`) make the distinction straightforward at the catch site. Returning non-2xx JSON lets the client branch cleanly by error type before attempting to read stream bytes. SC-003 (100% of errors produce a visible message) is satisfied by checking `response.ok` immediately after `fetch()` resolves.

**Error type mapping**:

| SDK Error Class                | HTTP Status | `error.type` | User-visible message                                             |
| ------------------------------ | ----------- | ------------ | ---------------------------------------------------------------- |
| `Anthropic.RateLimitError`     | 429         | `rate_limit` | "Too many requests — please wait a moment and try again"        |
| `Anthropic.APIConnectionError` | 503         | `connection` | "Couldn't reach the AI service — check your connection and retry" |
| `Anthropic.APIStatusError`     | 502         | `api_error`  | "The AI service returned an error — please try again"           |
| Unexpected error               | 500         | `unknown`    | "Something went wrong — please try again"                       |

**Alternatives considered**:

- Returning errors as part of the stream body — Client cannot distinguish an error payload from a partial legitimate response mid-stream without a custom framing protocol. Rejected.
- Always returning 200 with an `isError` field — Breaks standard HTTP error conventions; harder to debug in DevTools. Rejected.
