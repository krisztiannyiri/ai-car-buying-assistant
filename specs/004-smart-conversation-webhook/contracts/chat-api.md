# Contract: POST /api/chat

**Version**: 2.0 (updated by feature 004)  
**File**: `app/api/chat/route.ts`

---

## Request

Unchanged from v1.

```
POST /api/chat
Content-Type: application/json
```

```jsonc
{
  "messages": [
    { "role": "user",      "content": "I need a family car under €30,000" },
    { "role": "assistant", "content": "Great! How many seats do you need?" },
    { "role": "user",      "content": "At least 5" }
  ]
}
```

- `messages`: array of `MessageParam` — last 20 messages from the client's history, oldest first.
- `role`: `"user"` or `"assistant"`.

---

## Response — normal turn (no conclusion)

`Content-Type: text/plain; charset=utf-8`  
Status: `200`

Body: streaming plain text — the assistant's reply, character by character.

The client accumulates the stream into a single string and displays it. The string contains **no** sentinel marker.

---

## Response — conclusion turn

`Content-Type: text/plain; charset=utf-8`  
Status: `200`

Body: streaming plain text, ending with an end-of-stream sentinel on its own line:

```
<agent summary text>\n\n__WEBHOOK_EVENT__{"status":"success","endTrigger":"explicit"}
```

Or on failure:

```
<agent summary text>\n\n__WEBHOOK_EVENT__{"status":"failed","endTrigger":"refusal","errorMessage":"fetch failed"}
```

**Sentinel format**: `\n\n__WEBHOOK_EVENT__` immediately followed by a single-line JSON object matching `WebhookEvent` (see [data-model.md](../data-model.md)).

**Client responsibilities**:
1. After the stream closes, check if the accumulated string contains `\n\n__WEBHOOK_EVENT__`.
2. If found: split on it, display only the prefix as the assistant message, parse the suffix as `WebhookEvent`.
3. Update `sessionStatus` to `'concluded'` on `status: "success"`, or back to `'active'` on `status: "failed"` and set `webhookError`.

---

## Response — error (unchanged from v1)

`Content-Type: application/json`

```jsonc
{
  "error": {
    "type": "rate_limit" | "connection" | "api_error" | "unknown",
    "message": "Human-readable error string"
  }
}
```

Status: `429` / `503` / `502` / `500` depending on error type.

---

## Behaviour changes from v1

| Behaviour | v1 | v2 |
|---|---|---|
| Webhook trigger | Every user message | Only on conclusion (tool call) |
| Webhook payload | `{query, messageCount, timestamp}` | `CarSearchPayload` (structured) |
| Webhook retry | None (fire-and-forget) | One automatic silent retry |
| Response format | Always streaming text | Streaming text + optional sentinel on conclusion |
| Model tools | None | `conclude_conversation` tool defined |
