# Contract: Car Search Webhook Trigger

**Type**: Outbound HTTP call (Next.js app → n8n)
**Direction**: App fires → n8n receives

---

## Endpoint

| Property | Value |
|---|---|
| Method | `POST` |
| URL | `http://localhost:5678/webhook/car-search` |
| Config key | `N8N_WEBHOOK_CAR_SEARCH_URL` in `.env.local` |
| Auth | None (localhost-only) |
| Content-Type | `application/json` |

The URL value is controlled by the static path set in the n8n Webhook node. The recommended
static path is `car-search`; the full URL is stored in the environment variable so it can
be changed without a code change.

---

## Request Body

```json
{
  "query": "What is the best SUV under $40k?",
  "messageCount": 3,
  "timestamp": "2026-08-04T14:22:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | The user's message text (trimmed, non-empty) |
| `messageCount` | integer ≥ 0 | yes | Total messages in the conversation at trigger time |
| `timestamp` | ISO 8601 UTC string | yes | When the trigger fired |

---

## Response Handling

The application **does not use** the n8n response body. The call is fire-and-forget:
- Any 2xx response: success; no action taken
- Any non-2xx or network error: failure; log entry appended to `n8n-trigger.log`
- The user-facing response is **never delayed** by this call

---

## Trigger Condition

The webhook fires when **all of the following are true**:
1. A POST arrives at `/api/chat`
2. The request body contains a `messages` array with at least one entry
3. The last message has `role: "user"` and non-empty `content`
4. `N8N_WEBHOOK_CAR_SEARCH_URL` is set in the environment

If `N8N_WEBHOOK_CAR_SEARCH_URL` is not set, the trigger is silently skipped (no log entry,
no error — allows running the app without n8n).

---

## n8n Workflow Configuration

The receiving n8n workflow must have:

| Node | Type | Configuration |
|---|---|---|
| Webhook | Trigger | HTTP Method: POST, Path: `car-search`, Response Mode: Immediately |
| Set | Transform | Extract `query`, `messageCount`, `timestamp` from `$json` body |
| Console/Write | Output | Log the payload (e.g., write to n8n execution log via a Code node) |

The workflow must be **activated** (not just saved) for the production `/webhook/car-search`
URL to be live.

---

## Failure Log Contract

When the webhook call fails, a line is appended to `n8n-trigger.log` in the project root:

```json
{"timestamp":"2026-08-04T14:22:00.000Z","webhookUrl":"/webhook/car-search","payload":{"query":"...","messageCount":3,"timestamp":"2026-08-04T14:22:00.000Z"},"error":"fetch failed: connect ECONNREFUSED 127.0.0.1:5678"}
```

Format: NDJSON (one JSON object per line). The `webhookUrl` field stores only the path
(not the full URL with host) to avoid logging potentially sensitive configuration.
