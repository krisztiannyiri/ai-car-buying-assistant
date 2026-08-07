# Data Model: Chat Search Feedback

**Branch**: `008-chat-search-feedback` | **Date**: 2026-08-07

## Entities

### SearchResultItem _(new — runtime only, not persisted)_

Represents a single vehicle result returned from the n8n workflow and displayed in the chat. Built by the n8n Respond to Webhook node from `CarListing` records and passed through the sentinel protocol to the browser.

| Field       | Type             | Nullable | Source (CarListing field) | Notes |
| ----------- | ---------------- | -------- | ------------------------- | ----- |
| `make`      | string           | No       | `make`                    | Vehicle manufacturer (e.g., Toyota) |
| `model`     | string           | No       | `model`                   | Model name (e.g., Corolla) |
| `bodyType`  | string \| null   | Yes      | `bodyType`                | e.g., hatchback, suv. `null` if absent in record |
| `year`      | number           | No       | `year`                    | Production year (e.g., 2022) |
| `price`     | number \| null   | Yes      | `price`                   | Asking price in EUR; `null` if absent |
| `sourceUrl` | string \| null   | Yes      | `source`                  | Dealer URL if `source` is a valid URL; otherwise `null` |

**Display rule**: Any `null` field MUST render as `"Not available"` in the chat result list (FR-002).

---

### WebhookResult _(existing — extended)_

Returned by `lib/n8n/trigger.ts:fireWebhookWithRetry` after the n8n webhook call completes.

| Field          | Type                   | Nullable | Notes |
| -------------- | ---------------------- | -------- | ----- |
| `status`       | `"success" \| "failed"` | No      | Existing field |
| `errorMessage` | string                 | Yes      | Existing field — present on failure |
| `results`      | SearchResultItem[]     | Yes      | **New** — present on success; `[]` means no matches |
| `totalCount`   | number                 | Yes      | **New** — total results found in DB (may exceed 5) |

---

### WebhookEvent _(existing — extended)_

Encoded in the `__WEBHOOK_EVENT__` sentinel and decoded by `ChatInterface.tsx`.

| Field          | Type                    | Nullable | Notes |
| -------------- | ----------------------- | -------- | ----- |
| `status`       | `"success" \| "failed"` | No      | Existing field |
| `endTrigger`   | string                  | No       | Existing field |
| `errorMessage` | string                  | Yes      | Existing field |
| `retryPayload` | CarSearchPayload        | Yes      | Existing field |
| `results`      | SearchResultItem[]      | Yes      | **New** — forwarded from WebhookResult |
| `totalCount`   | number                  | Yes      | **New** — forwarded from WebhookResult |

---

### Message _(existing — extended)_

Client-side representation of a single chat message.

| Field           | Type                                                | Nullable | Notes |
| --------------- | --------------------------------------------------- | -------- | ----- |
| `id`            | string                                              | No       | Existing field |
| `role`          | `"user" \| "assistant"`                             | No       | Existing field |
| `content`       | string                                              | No       | Existing field — empty string for result messages |
| `searchResults` | `{ items: SearchResultItem[]; totalCount: number }` | Yes      | **New** — present only on system-generated result messages |

When `searchResults` is present, the render branch in `ChatInterface.tsx` delegates to `SearchResultMessage` and ignores `content`.

---

### ConversationState _(existing — extended)_

React state shape for `ChatInterface.tsx`.

| Field                 | Type          | Notes |
| --------------------- | ------------- | ----- |
| `messages`            | Message[]     | Existing |
| `isStreaming`         | boolean       | Existing |
| `streamingContent`    | string        | Existing |
| `error`               | string \| null | Existing |
| `sessionStatus`       | SessionStatus | Existing |
| `roundCount`          | number        | Existing |
| `consecutiveRefusals` | number        | Existing |
| `isRefinement`        | boolean       | Existing |
| `webhookError`        | string \| null | Existing — kept for retry button; set on webhook failure |
| **`isSearching`**     | **boolean**   | **New** — true while n8n webhook is in-flight (between SEARCH_STARTED and WEBHOOK_EVENT sentinels) |

---

## State Transitions

```
User message sent
     │
     ▼
isStreaming: true, isSearching: false
     │ (Claude streams text)
     ▼
__SEARCH_STARTED__ detected in stream
     │
     ▼
isSearching: true  ◄──── "Searching for matching cars…" + dots shown
     │
     ├─ __WEBHOOK_EVENT__ received (success, results.length > 0)
     │        │
     │        ▼
     │   isSearching: false
     │   Message injected: { role: 'assistant', searchResults: { items, totalCount } }
     │   sessionStatus: 'concluded'
     │
     ├─ __WEBHOOK_EVENT__ received (success, results.length === 0)
     │        │
     │        ▼
     │   isSearching: false
     │   Message injected: { role: 'assistant', content: "No matching cars found…" }
     │   sessionStatus: 'concluded'
     │
     └─ __WEBHOOK_EVENT__ received (failed) OR timeout after 30 s
              │
              ▼
         isSearching: false
         webhookError set (existing retry banner) OR
         Message injected: { role: 'assistant', content: "<error text>" }
         (see contracts/search-started-sentinel.md for error message copy)
```

**Note**: The existing `webhookError` banner with retry button is preserved for the failure path. The spec requirement to show the error "in the chat window" (FR-007) is satisfied by the error bot message; the retry button remains in the existing banner below the messages.
