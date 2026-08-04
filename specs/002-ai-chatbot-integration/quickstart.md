# Quickstart Validation Guide: AI Chatbot Integration

**Feature**: 002-ai-chatbot-integration | **Date**: 2026-08-04

---

## Prerequisites

- Node.js ≥ 20 (LTS)
- npm ≥ 10
- An Anthropic API key with access to `claude-opus-4-8`

---

## Setup

```bash
# From repo root — installs @anthropic-ai/sdk alongside existing deps
npm install
```

Create `.env.local` in the repo root (this file is gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Run

```bash
npm run dev
```

Expected: Next.js dev server starts at `http://localhost:3000`.

---

## Validation Scenarios

### SC-001 — First token appears within 3 seconds

1. Open `http://localhost:3000`
2. Open DevTools → Network tab; filter to `Fetch/XHR`
3. Type "What should I look for when buying a used car?" and press Send
4. Note the timestamp when you pressed Send; note when the first characters appear in the chat thread
5. **Pass**: Characters appear in the thread within 3 seconds of pressing Send; the `POST /api/chat` request in DevTools shows the response body streaming

---

### SC-002 — Coherent context across 10 messages

1. Open `http://localhost:3000`
2. Send: "Tell me about the Toyota Camry"
3. After the response, send: "Is it good for families?"
4. After the response, send: "How does it compare to the Honda Accord?"
5. Continue for a total of 10 alternating messages; make follow-ups that reference earlier turns
6. **Pass**: Each AI response references the correct prior context without the user re-stating it; the 10th response is coherent with the full thread

---

### SC-003 — All errors produce a visible message

#### 3a — Simulated network error

1. Open DevTools → Network tab
2. Set network throttling to "Offline"
3. Type any message and press Send
4. **Pass**: Within a few seconds, a human-readable error appears in the chat (not a blank screen or an infinite spinner); the input field is re-enabled

#### 3b — Invalid API key

1. Edit `.env.local`: set `ANTHROPIC_API_KEY=invalid`; restart the dev server (`Ctrl+C`, `npm run dev`)
2. Send any message
3. **Pass**: An error message appears (e.g., "The AI service returned an error — please try again"); no infinite loading state
4. Restore the correct key and restart before continuing

---

### SC-004 — Retry after error without page reload

1. Trigger an error using SC-003a (set network to Offline)
2. Restore network connectivity in DevTools (set throttling back to "No throttling")
3. Type a new message and press Send — **do not reload the page**
4. **Pass**: The request succeeds; a streamed response appears; the chat thread continues from where it left off

---

### SC-005 — Chat usable at 30 messages

1. Open `http://localhost:3000`
2. Send 15 messages, waiting for each response before sending the next
3. After 30 total turns (15 user + 15 assistant), scroll up and down through the thread
4. Send one more message to confirm the input still works
5. **Pass**: All 30 messages are readable; no layout overflow; thread scrolls smoothly; the 16th request succeeds

---

## Edge Case Scenarios

### Empty / whitespace-only message not submitted

1. Click the input field without typing anything and press Send (or Enter)
2. Type only spaces or newlines and press Send
3. **Pass**: Nothing happens in either case; no request is made to `/api/chat`; no error shown

---

### Off-topic question redirected politely

1. Send: "What's the best way to make pasta carbonara?"
2. **Pass**: The AI declines to answer the cooking question and redirects to car-buying topics; the response is polite, not terse or technical

---

### New conversation during active stream

1. Send a message and immediately (within 1–2 seconds, while tokens are arriving) press "New conversation"
2. **Pass**: The in-progress stream stops; the chat thread clears immediately; the input is re-enabled; no partial assistant message persists

---

### Auto-scroll to latest message

1. Build a 10+ message thread
2. Scroll up to read earlier messages
3. Send a new message
4. **Pass**: After the response completes, the thread auto-scrolls to the latest message without manual intervention

---

### Rate-limit error shows distinct message

1. Simulate a rate-limit response from the Route Handler (temporarily return a `429` with `{ error: { type: "rate_limit", message: "..." } }` in development), or trigger one by sending many requests rapidly
2. **Pass**: The displayed error reads "Too many requests — please wait a moment and try again" — not the generic "Something went wrong" message

---

## Build Validation

```bash
npm run build
```

**Pass**: Build completes with zero TypeScript errors and zero Next.js build errors. No `any` type warnings.

---

## References

- API endpoint contract: [contracts/api.md](./contracts/api.md)
- TypeScript types: [contracts/types.ts](./contracts/types.ts)
- Data model and state transitions: [data-model.md](./data-model.md)
- Research decisions: [research.md](./research.md)
