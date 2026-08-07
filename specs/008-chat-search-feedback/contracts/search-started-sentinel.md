# Stream Protocol: SEARCH_STARTED Sentinel

**Feature**: 008-chat-search-feedback | **Date**: 2026-08-07

## Overview

This document describes the `__SEARCH_STARTED__` sentinel added to the existing streaming protocol between `app/api/chat/route.ts` (server) and `ChatInterface.tsx` (client).

## Existing Protocol (unchanged)

```
[Claude text stream chunks]
\n\n__WEBHOOK_EVENT__{JSON}
```

The `__WEBHOOK_EVENT__` sentinel is emitted after the n8n webhook call completes (success or failure).

## Extended Protocol (this feature)

```
[Claude text stream chunks]
\n\n__SEARCH_STARTED__
[silence while n8n webhook executes — up to 30 seconds]
\n\n__WEBHOOK_EVENT__{JSON}
```

The `__SEARCH_STARTED__` sentinel is emitted immediately before `fireWebhookWithRetry` is called.

## Sentinel Definitions

| Constant | Value | Source |
|---|---|---|
| `SEARCH_STARTED_SENTINEL` | `\n\n__SEARCH_STARTED__` | Defined in `app/api/chat/route.ts` |
| `SENTINEL` (existing) | `\n\n__WEBHOOK_EVENT__` | Existing constant in `ChatInterface.tsx` |

## Server Emission (`app/api/chat/route.ts`)

```
1. content_block_stop fires for conclude_conversation tool
2. controller.enqueue('\n\n__SEARCH_STARTED__')   ← NEW
3. await fireWebhookWithRetry(...)
4. controller.enqueue('\n\n__WEBHOOK_EVENT__' + JSON.stringify(webhookEvent))
```

## Client Parsing (`ChatInterface.tsx`)

During stream processing (live chunks):
- If `__SEARCH_STARTED__` found in `accumulated`:
  - Strip from `displayContent` (same pattern as `__WEBHOOK_EVENT__` stripping)
  - Set `isSearching: true`

After stream closes (final parse):
1. Look for `__WEBHOOK_EVENT__` sentinel first (existing behavior)
2. Also clear `isSearching: false` after processing the webhook event

## Display Content Stripping

The display content shown while streaming strips both sentinels:

```
const webhookIdx = accumulated.indexOf(SENTINEL);
const searchStartedIdx = accumulated.indexOf(SEARCH_STARTED_SENTINEL);
const firstMarker = [webhookIdx, searchStartedIdx].filter(i => i !== -1).sort()[0] ?? -1;
const displayContent = firstMarker !== -1 ? accumulated.slice(0, firstMarker) : accumulated;
```

## In-Progress UI (when `isSearching: true`)

A `.assistantBubble` is rendered below the last persisted message containing:
- Text: "Searching for matching cars…"
- Followed by the existing `.loadingIndicator` animated dots

When `isSearching` becomes `false`, this bubble is unmounted and the result/error message is appended to `state.messages`.

## Error Message Copy

When `webhookEvent.status === 'failed'`, a bot message is injected with content:

> "The search could not be completed. Please try again using the button below."

The existing `webhookError` banner with retry button is still shown below the messages (unchanged).

## No-Results Message Copy

When `webhookEvent.status === 'success'` and `results.length === 0`:

> "No matching cars were found for your criteria. Try broadening your search — for example, consider a wider budget range or additional body types."
