# Data Model: AI Chatbot Integration

**Feature**: 002-ai-chatbot-integration | **Date**: 2026-08-04

Conversation history is held entirely in browser memory (React component state) for the duration of the page session. There is no database and no server-side session state. The authoritative TypeScript types are in [contracts/types.ts](./contracts/types.ts).

---

## Component Hierarchy (updated)

```
RootLayout          (app/layout.tsx)        — Server Component, unchanged
  └─ Header         (components/Header/)    — Server Component, unchanged
  └─ {children}

HomePage            (app/page.tsx)          — Server Component, unchanged
  └─ ChatInterface  (components/ChatInterface/) — Client Component ('use client') ← UPGRADED

Route Handler       (app/api/chat/route.ts) — NEW; Next.js Route Handler, POST only
```

ChatInterface is the only component upgraded to a Client Component. All other existing components remain Server Components. The Route Handler is server-side infrastructure — not a component.

---

## Entities

### Message

A single turn in the conversation.

| Field     | Type                    | Required | Notes                                                          |
| --------- | ----------------------- | -------- | -------------------------------------------------------------- |
| `id`      | `string`                | Yes      | Unique turn ID; generated client-side via `crypto.randomUUID()` |
| `role`    | `'user' \| 'assistant'` | Yes      | Source of the message                                          |
| `content` | `string`                | Yes      | Text content; assistant messages may contain Markdown          |

**Validation rules**:
- `content` for `role: 'user'` must not be empty or whitespace-only before submission (FR-007)
- `content` for `role: 'assistant'` starts empty during streaming and accumulates as tokens arrive

---

### ConversationState

Local React state shape inside `ChatInterface`.

| Field              | Type               | Notes                                                                         |
| ------------------ | ------------------ | ----------------------------------------------------------------------------- |
| `messages`         | `Message[]`        | Full visible history; never pruned in the UI; may grow beyond 20 (SC-005)     |
| `isStreaming`       | `boolean`          | `true` from submit until stream ends or errors; disables input (FR-005)       |
| `streamingContent` | `string`           | Accumulates the in-progress assistant response token by token                 |
| `error`            | `string \| null`   | Human-readable error string shown to user; `null` when no error (FR-006)      |

---

### ChatRequest (client → Route Handler)

The JSON body sent to `POST /api/chat`.

| Field              | Type                                                      | Notes                                                                       |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| `messages`         | `Array<{ role: 'user' \| 'assistant'; content: string }>` | Pruned to at most 20 most-recent messages before sending (FR-003)           |

The client strips the `id` field before sending — the Route Handler receives only `role` and `content` in the format the Anthropic API expects directly as `MessageParam[]`.

---

### ChatError (Route Handler → client on failure)

JSON body returned by the Route Handler on non-2xx responses.

| Field           | Type                                                        | Notes                               |
| --------------- | ----------------------------------------------------------- | ----------------------------------- |
| `error.type`    | `'rate_limit' \| 'connection' \| 'api_error' \| 'unknown'` | Determines which message to display |
| `error.message` | `string`                                                    | Human-readable detail               |

---

## State Transitions

```
[idle]
  → user submits non-empty message
  → [streaming]  isStreaming=true, input disabled, loading indicator visible
      → first token arrives   → loading indicator replaced by live streamingContent
      → stream closes         → [idle]  message appended to messages array; streamingContent reset
      → non-2xx response      → [error] isStreaming=false; error string shown; input re-enabled
      → request aborted       → [idle]  (user clicked "New conversation")

[error]
  → user submits new message  → [streaming]  error cleared, new attempt starts
  → user clicks "New conversation" → [idle]  messages cleared; error cleared
```

---

## History Pruning

The full `messages` array in component state is **never** pruned — users can scroll through the entire visible history. Only the payload sent to the Route Handler is capped:

```
apiMessages = messages.length > 20
  ? messages.slice(messages.length - 20)
  : messages
```

Each API call sends at most 20 message objects (10 user/assistant pairs). The `id` field is stripped; only `role` and `content` are forwarded to the Anthropic API.
