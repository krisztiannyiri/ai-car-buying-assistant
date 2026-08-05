# Data Model: Smart Conversation Webhook

**Feature**: `004-smart-conversation-webhook` | **Date**: 2026-08-05

All types are TypeScript. Files that own each type are noted.

---

## `lib/types/chat.ts` — updates

### `SessionStatus` (new)

```ts
export type SessionStatus = 'active' | 'concluding' | 'concluded' | 'refining';
```

| Value | Meaning |
|---|---|
| `active` | Conversation in progress; agent is asking questions |
| `concluding` | End signal received; agent is building payload and firing webhook. Loading indicator shown. |
| `concluded` | Webhook fired successfully; user may send refinement messages |
| `refining` | User sent a message post-conclusion; "Refining your search" badge shown |

---

### `ConversationState` (updated)

Extends the existing interface. New fields added:

```ts
export interface ConversationState {
  // existing fields (unchanged)
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  // new fields
  sessionStatus: SessionStatus;
  roundCount: number;
  consecutiveRefusals: number;
  isRefinement: boolean;
  webhookError: string | null;
}
```

| Field | Default | Description |
|---|---|---|
| `sessionStatus` | `'active'` | Current session lifecycle state |
| `roundCount` | `0` | Number of completed agent-question / user-answer pairs |
| `consecutiveRefusals` | `0` | Count of consecutive "I don't know / skip" replies; resets to 0 on any substantive answer |
| `isRefinement` | `false` | True when the session is amending a prior concluded search |
| `webhookError` | `null` | Non-null when the webhook failed after one retry; displayed as a retry prompt |

---

## `lib/types/n8n.ts` — full replacement

The existing `WebhookPayload` is replaced. `TriggerLogEntry` is updated to reference the new type.

### `FeatureEntry` (new)

```ts
export interface FeatureEntry {
  name: string;
  mandatory: boolean;
}
```

### `CarSearchPayload` (replaces `WebhookPayload`)

```ts
export interface CarSearchPayload {
  budgetMin: number | null;
  budgetMax: number | null;
  bodyTypes: string[];       // e.g. ["suv", "hatchback"] or ["any"]
  fuelTypes: string[];       // e.g. ["electric", "hybrid"] or ["any"]
  transmission: 'manual' | 'automatic' | 'any';
  minSeats: number | null;
  features: FeatureEntry[];
  timeline: 'asap' | '3months' | '6months+' | 'any';
  usageContext: 'commute' | 'family' | 'offroad' | 'performance' | 'any';
  annualMileage: string | null; // e.g. "10000-15000" or null
  endTrigger: 'explicit' | 'refusal' | 'length-limit' | 'refinement';
  isRefinement: boolean;
}
```

Field rules:
- Every field is always present in the payload — no optional fields.
- `"any"` / `["any"]` is the canonical "no preference" value.
- `budgetMin` / `budgetMax` are `null` when budget was never discussed.
- `features` is an empty array `[]` when no features were mentioned.
- `endTrigger` and `isRefinement` are metadata for the webhook consumer; they are not user-facing.

### `WebhookEvent` (new — sentinel data parsed by frontend)

```ts
export interface WebhookEvent {
  status: 'success' | 'failed';
  endTrigger: CarSearchPayload['endTrigger'];
  errorMessage?: string;
}
```

### `TriggerLogEntry` (updated)

```ts
export interface TriggerLogEntry {
  timestamp: string;
  webhookUrl: string;
  payload: CarSearchPayload;
  error: string;
}
```

### `WebhookResult` (new — return type of `fireWebhookWithRetry`)

```ts
export interface WebhookResult {
  status: 'success' | 'failed';
  errorMessage?: string;
}
```

---

## `ConcludeConversationInput` — tool input schema (used in `route.ts`)

This is the JSON input the model provides when it calls `conclude_conversation`. It matches `CarSearchPayload` minus `endTrigger` and `isRefinement` (those are added server-side).

```ts
// Inferred from the Anthropic tool input_schema; not a named export —
// validated at runtime via the tool definition in route.ts.
interface ConcludeConversationInput {
  budgetMin: number | null;
  budgetMax: number | null;
  bodyTypes: string[];
  fuelTypes: string[];
  transmission: 'manual' | 'automatic' | 'any';
  minSeats: number | null;
  features: Array<{ name: string; mandatory: boolean }>;
  timeline: 'asap' | '3months' | '6months+' | 'any';
  usageContext: 'commute' | 'family' | 'offroad' | 'performance' | 'any';
  annualMileage: string | null;
}
```

---

## State transitions

```
active
  → concluding   (end signal detected; loading indicator shown)
  → concluded    (webhook fired successfully)
  → refining     (user sends message after conclusion)

concluding
  → concluded    (webhook success)
  → active       (webhook failed after retry — user may retry)

refining
  → concluding   (agent calls conclude_conversation again with updated payload)
```

Resetting the conversation (user clicks "New conversation") returns all state to the `active` defaults.
