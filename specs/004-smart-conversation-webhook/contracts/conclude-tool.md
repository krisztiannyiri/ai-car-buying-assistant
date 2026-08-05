# Contract: `conclude_conversation` Tool

**Used in**: `app/api/chat/route.ts` — passed as the `tools` array to `client.messages.stream()`

This tool is called by the model when it decides the conversation should end. Calling it is the signal that triggers webhook dispatch.

---

## Tool definition (Anthropic SDK format)

```jsonc
{
  "name": "conclude_conversation",
  "description": "Call this tool when the car-buying conversation is complete and the user's requirements are fully understood. This fires the search webhook. Do not call it mid-conversation. Populate every field; use 'any' or [] for fields never discussed.",
  "input_schema": {
    "type": "object",
    "required": [
      "budgetMin", "budgetMax", "bodyTypes", "fuelTypes",
      "transmission", "minSeats", "features",
      "timeline", "usageContext", "annualMileage"
    ],
    "properties": {
      "budgetMin":    { "type": ["number", "null"], "description": "Minimum budget in euros, or null if not discussed" },
      "budgetMax":    { "type": ["number", "null"], "description": "Maximum budget in euros, or null if not discussed" },
      "bodyTypes":    { "type": "array", "items": { "type": "string" }, "description": "Preferred body types e.g. [\"suv\", \"hatchback\"] or [\"any\"]" },
      "fuelTypes":    { "type": "array", "items": { "type": "string" }, "description": "Preferred fuel types e.g. [\"electric\"] or [\"any\"]" },
      "transmission": { "type": "string", "enum": ["manual", "automatic", "any"] },
      "minSeats":     { "type": ["number", "null"], "description": "Minimum number of seats required, or null" },
      "features": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["name", "mandatory"],
          "properties": {
            "name":      { "type": "string" },
            "mandatory": { "type": "boolean", "description": "true = hard requirement, false = nice-to-have" }
          }
        },
        "description": "List of specific features the user mentioned; empty array if none"
      },
      "timeline":     { "type": "string", "enum": ["asap", "3months", "6months+", "any"] },
      "usageContext": { "type": "string", "enum": ["commute", "family", "offroad", "performance", "any"] },
      "annualMileage":{ "type": ["string", "null"], "description": "Approximate mileage band e.g. '10000-15000' or null" }
    }
  }
}
```

---

## When the model MUST call this tool

The system prompt instructs the model to call `conclude_conversation` when ANY of these conditions are met:

1. **Explicit end** — user sends a phrase like "I'm done", "find me cars", "stop asking", "that's all", "search now".
2. **Repeated refusal** — user's two most recent responses were both "I don't know", "skip", "doesn't matter", or similar.
3. **Round limit** — 5 question-answer rounds have completed AND the agent presented suggestions and the user declined to continue; OR the configurable extension ceiling (default: 3 accepted extensions) was reached and the agent delivered the final "I need to search now" message.
4. **Refinement end** — same triggers as above, but the session is in refinement mode (the model re-calls the tool with the amended payload).

## When the model MUST NOT call this tool

- After only one "I don't know" response (single refusal — skip the field and continue).
- In the middle of presenting car suggestions (wait for user confirmation first).
- Before at least one question has been asked (exception: user opens with an explicit end signal → call immediately with all-`any` payload).

---

## Server-side handling (route.ts)

When the API route receives a `tool_use` content block with `name === "conclude_conversation"`:

1. Cast the `input` to `ConcludeConversationInput`.
2. Determine `endTrigger` from context (passed as a header or inferred from message history — implementation detail for tasks.md).
3. Build `CarSearchPayload` by merging `ConcludeConversationInput` + `endTrigger` + `isRefinement`.
4. Call `fireWebhookWithRetry(url, payload)` and await the `WebhookResult`.
5. Append sentinel to the stream: `\n\n__WEBHOOK_EVENT__` + `JSON.stringify(webhookEvent)`.
6. Close the stream.

The model's text output (if any) before the tool call is streamed normally; the sentinel is appended after.
