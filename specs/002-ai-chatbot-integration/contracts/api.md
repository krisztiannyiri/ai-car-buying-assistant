# API Contract: AI Chatbot Integration

**Feature**: 002-ai-chatbot-integration | **Date**: 2026-08-04

---

## POST /api/chat

**Description**: Proxies a chat request to the Anthropic Claude API and streams the response back to the client as raw text. The `ANTHROPIC_API_KEY` is held server-side and is never included in any response or client bundle.

---

### Request

**Content-Type**: `application/json`

**Body**:

```json
{
  "messages": [
    { "role": "user",      "content": "What should I look for in a used car?" },
    { "role": "assistant", "content": "When buying a used car, the key areas to check are..." },
    { "role": "user",      "content": "What about reliability ratings?" }
  ]
}
```

| Field                    | Type                    | Required | Constraints                                              |
| ------------------------ | ----------------------- | -------- | -------------------------------------------------------- |
| `messages`               | `MessageParam[]`        | Yes      | 1–20 items; last item must have `role: 'user'`           |
| `messages[].role`        | `'user' \| 'assistant'` | Yes      | Alternating; must start and end with `'user'`            |
| `messages[].content`     | `string`                | Yes      | Non-empty string                                         |

The system prompt is injected server-side. The client must not include a `system` field.

---

### Response — Success (200 OK)

**Content-Type**: `text/plain; charset=utf-8`

**Body**: Raw streamed text tokens as emitted by the Anthropic API. The client reads the response body as a `ReadableStream<Uint8Array>`, decodes each chunk with `TextDecoder`, and appends the decoded text to the in-progress assistant message.

**Stream termination**: The body stream closes when the Anthropic API signals `message_stop`. No trailing delimiter or framing bytes are added.

---

### Response — Error (non-2xx)

**Content-Type**: `application/json`

**Body**:

```json
{
  "error": {
    "type": "rate_limit",
    "message": "Too many requests — please wait a moment and try again"
  }
}
```

| HTTP Status | `error.type`  | Trigger                                              | User-visible message                                              |
| ----------- | ------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| 429         | `rate_limit`  | `Anthropic.RateLimitError` — API quota exceeded      | "Too many requests — please wait a moment and try again"         |
| 503         | `connection`  | `Anthropic.APIConnectionError` — network unreachable | "Couldn't reach the AI service — check your connection and retry" |
| 502         | `api_error`   | `Anthropic.APIStatusError` — Anthropic API non-200   | "The AI service returned an error — please try again"            |
| 500         | `unknown`     | Unexpected server-side exception                     | "Something went wrong — please try again"                        |

---

### Environment Variables

| Variable            | Required | Description                                                     |
| ------------------- | -------- | --------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes      | Anthropic API key. Set in `.env.local` (gitignored by default). |

---

### Security

- `ANTHROPIC_API_KEY` is read from `process.env` only in the Route Handler — it is never forwarded to the client or included in any response body.
- The Route Handler only reads `role` and `content` from the incoming `messages` array; all other fields in the request body are ignored.
- The system prompt is injected as the `system` parameter inside the Route Handler — the client cannot observe or override it.

---

## No New GET Routes

This feature adds one route (`POST /api/chat`) only. All routes from `001-app-skeleton-setup` (`GET /`, `GET /[unmatched]`) are unchanged and remain valid.
