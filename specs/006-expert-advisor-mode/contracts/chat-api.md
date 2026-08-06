# Contract: Chat API Endpoint

**File**: `app/api/chat/route.ts`
**Method**: `POST /api/chat`
**Changed by this feature**: Yes — `buildSystemPrompt()` rewritten; all other logic unchanged.

---

## Request

```json
{
  "messages": [MessageParam],
  "isRefinement": boolean,
  "roundCount": number
}
```

| Field | Type | Description |
|---|---|---|
| `messages` | `MessageParam[]` | Full conversation history (Anthropic message format) |
| `isRefinement` | `boolean` | Whether this is a refinement session (user amending prior criteria) |
| `roundCount` | `number` | Number of completed question-answer pairs in this session |

**Validation**: `messages` must be a non-empty array. `isRefinement` defaults to `false`. `roundCount` defaults to `0`.

---

## Response (success)

`Content-Type: text/plain; charset=utf-8` — streaming plain text.

The response is a streaming sequence of:
1. Incremental text chunks (the assistant's conversational reply)
2. Optionally, a single `__WEBHOOK_EVENT__<JSON>` suffix appended when `conclude_conversation` is triggered

### Webhook event suffix

```json
{
  "status": "success" | "failed",
  "endTrigger": "explicit" | "implicit" | "length-limit" | "refinement" | "unknown",
  "errorMessage": "string (only when status=failed)",
  "retryPayload": { ... } (only when status=failed)
}
```

---

## Response (error)

`Content-Type: application/json`

```json
{
  "error": {
    "type": "rate_limit" | "connection" | "api_error" | "unknown",
    "message": "string"
  }
}
```

| HTTP Status | Error type | Cause |
|---|---|---|
| 429 | `rate_limit` | Anthropic rate limit exceeded |
| 503 | `connection` | Cannot reach Anthropic API |
| 502 | `api_error` | Anthropic API returned an error |
| 500 | `unknown` | Malformed request body or unexpected error |

---

## System prompt behaviour (changed by this feature)

The `buildSystemPrompt()` function is the sole artifact changed. The new prompt:

1. **Questions** — Asks about lifestyle and usage only (commute distance, journey type, charging availability, passenger count, cargo/towing needs, budget, features). Never asks about fuel type, body type, transmission, engine displacement, or other technical attributes.

2. **Inference** — Internally maps lifestyle answers to technical vehicle requirements using the rules defined in `research.md`. Populates all `conclude_conversation` fields from inferred values.

3. **Correction** — When the user states a technically incorrect belief about cars (scoped to: fuel types, drivetrains, running costs, range, safety ratings), the assistant provides a one-sentence factual correction tied to the user's situation before continuing.

4. **Recommendation** — After sufficient lifestyle data is collected, the assistant proactively presents a named vehicle category or model with 2+ pros and 1+ con, all tied to the user's stated constraints.

5. **Tie-breaking** — If two options are equivalent (same price band ≤15%, all lifestyle constraints equally satisfied), the assistant presents both with a single preference question. It never asks multiple preference questions.

6. **Round-limit check-in** — Unchanged: every `ROUND_LIMIT` rounds, present lifestyle-derived suggestions and ask whether to continue or search. Terminology updated to match the expert advisor framing.

---

## conclude_conversation tool schema (unchanged)

The Anthropic tool definition is not modified by this feature. See current definition in `app/api/chat/route.ts` (`concludeConversationTool`).
