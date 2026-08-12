# API Contract: POST /api/chat

**Version**: 2 (this feature) | **Previous version**: 1 (ChatInterface integration)

---

## Endpoint

```
POST /api/chat
Content-Type: application/json
```

---

## Request body

```ts
{
  messages: MessageParam[];          // conversation history (required, min 1 item)
  isRefinement: boolean;             // true when this is a post-results follow-up
  roundCount: number;                // number of completed question-answer rounds
  userEmail?: string | null;         // optional email for full results delivery
  wizardAnswers?: WizardAnswers;     // NEW: structured answers from steps 1–4
}
```

### `wizardAnswers` shape (new field)

```ts
{
  driving: string[];    // max 3 selected driving scenarios
  priorities: string[]; // max 3 selected priorities
  budget: number;       // target monthly payment (USD)
  payment: string;      // "Finance" | "Cash" | "Lease"
  seats: string;        // "2-4 people" | "5 people" | "6+ people"
  parking: string;      // "Driveway" | "Garage" | "Street"
  powertrain: string;   // "Open to any" | "Hybrid" | "Electric"
  price: number;        // total vehicle price (USD)
  notes: string;        // optional free-text context, may be empty
}
```

**When to include `wizardAnswers`**:
- Initial step-5 call: always include.
- Refinement / follow-up chat turns: omit (context already in the system prompt via the
  first call's session; `isRefinement: true` signals the AI to reference prior conversation).

---

## Response

### Success — `200 OK`

Streaming `text/plain; charset=utf-8` response. The stream contains three possible segments in order:

```
<streamed assistant text>
\n\n__SEARCH_STARTED__
\n\n__WEBHOOK_EVENT__<JSON>
```

| Segment | When present | Description |
|---|---|---|
| Streamed text | Always | AI response text streamed incrementally |
| `__SEARCH_STARTED__` sentinel | When search begins | Signals the UI to show "Searching…" state |
| `__WEBHOOK_EVENT__` + JSON | After search completes | Vehicle search outcome (see below) |

**Webhook event JSON shape**:
```ts
// Success
{ status: "success", endTrigger: string, results: SearchResultItem[], totalCount: number }

// Failure
{ status: "failed", endTrigger: string, errorMessage: string, retryPayload: CarSearchPayload }
```

### Error responses

| Status | Error type | Meaning |
|---|---|---|
| 400 / 500 | `unknown` | Malformed body or internal error |
| 429 | `rate_limit` | Anthropic rate limit hit |
| 502 | `api_error` | Anthropic API returned error |
| 503 | `connection` | Network failure reaching Anthropic |

```ts
{ error: { type: ChatErrorType, message: string } }
```

---

## System prompt changes (backend)

`buildSystemPrompt(isRefinement, roundCount, wizardAnswers?)` — signature extended.

When `wizardAnswers` is provided the prompt preamble replaces the conversational
question-gathering section with a pre-populated context block:

```
## What the user already told us (from the guided wizard)
- Driving patterns: [driving.join(", ") || "not specified"]
- Priorities: [priorities.join(", ") || "not specified"]
- Monthly budget: $[budget] via [payment]
- Total price budget: $[price.toLocaleString()]
- Seats needed: [seats]
- Home parking: [parking]
- Powertrain preference: [powertrain]
- Additional context: [notes || "none"]

Based on this, proceed directly to recommending vehicles and calling `search_cars`.
Do NOT ask the user any of the lifestyle questions listed in the standard conversation flow.
You may ask clarifying follow-up questions only if the user's `notes` introduce an ambiguity
you cannot resolve from your automotive expertise.
```

When `wizardAnswers` is absent (refinement turns) the existing system prompt structure is used
unchanged, allowing the AI to recall the context from conversation history.

---

## No changes to POST /api/webhook-retry

The webhook retry endpoint (`POST /api/webhook-retry`) accepts a `CarSearchPayload` body and
is unchanged by this feature.
