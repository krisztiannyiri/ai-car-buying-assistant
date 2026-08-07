# Quickstart Validation Guide: Chat Search Feedback

**Branch**: `008-chat-search-feedback` | **Date**: 2026-08-07

## Prerequisites

- n8n instance running with the car-search workflow updated (see [n8n workflow changes](#n8n-workflow-changes) below)
- `N8N_WEBHOOK_CAR_SEARCH_URL` environment variable set in `.env.local`
- `ANTHROPIC_API_KEY` set in `.env.local`
- Next.js dev server running: `npm run dev`

## n8n Workflow Changes

Before validating, the n8n car-search workflow must be updated:

1. Open the workflow in the n8n UI
2. Edit the **Webhook** trigger node:
   - Change `Response Mode` from `Immediately` (onReceived) to `Using Respond to Webhook Node`
3. Add a **Respond to Webhook** node as the final node in the workflow's success path
4. Wire the node to respond with:
   ```json
   {
     "status": "success",
     "results": "{{ $json.mappedResults }}",
     "totalCount": "{{ $json.totalCount }}"
   }
   ```
   where `mappedResults` is built by a preceding Code node that maps `CarListing` records to `SearchResultItem` shape (see [data-model.md](./data-model.md) for the field mapping)
5. Ensure the no-results path also reaches the Respond to Webhook node with `results: []` and `totalCount: 0`

For the contract that the response must satisfy, see [contracts/n8n-webhook-response.schema.json](./contracts/n8n-webhook-response.schema.json).

## Scenario 1: Search returns results

**Goal**: Verify FR-001, FR-002, FR-005, FR-008 — results appear as a bot message

**Steps**:
1. Open the app at `http://localhost:3000`
2. Start a conversation; answer the advisor's questions with broad criteria (e.g., any budget, any body type, city driving)
3. When the advisor makes a recommendation, respond "search now" or "let's go"
4. Observe the chat window

**Expected**:
- While n8n is executing: a bot message bubble appears containing "Searching for matching cars…" and the animated three-dot indicator
- After n8n responds: the searching bubble disappears and a new bot message appears listing up to 5 cars
- Each listed car shows: body type + make + model (year), price (or "Not available"), and a source link (or "Not available")
- If more than 5 results exist: a note appears saying "X more results — check your email for the full list" (only if email was provided)
- The result message remains in the conversation history when scrolling up

---

## Scenario 2: Search returns no results

**Goal**: Verify FR-003, FR-004 — no-results message with suggestion

**Steps**:
1. Open the app at `http://localhost:3000`
2. Give the advisor very restrictive criteria that will match nothing (e.g., budget €1,000, seats ≥ 8, year ≥ 2024)
3. Trigger the search

**Expected**:
- The searching indicator appears (same as Scenario 1)
- After n8n responds: a bot message appears stating no matching cars were found
- The message includes a suggestion to broaden criteria

---

## Scenario 3: Search times out

**Goal**: Verify FR-007 — 30-second timeout produces an error message

**Steps**:
1. Temporarily stop the n8n webhook from responding (pause the workflow or set it to a very long delay)
2. Trigger a search in the app
3. Wait 30 seconds

**Expected**:
- The searching indicator appears immediately after `conclude_conversation` fires
- After 30 seconds, the searching indicator disappears
- A bot message appears in the chat: "The search could not be completed. Please try again using the button below."
- The existing "Try again" retry banner also appears below the messages

---

## Scenario 4: Existing email notification is unaffected

**Goal**: Verify FR-009, SC-005 — email still sends alongside chat feedback

**Steps**:
1. Enter a valid email in the "Get results by email" field before starting
2. Trigger a search that returns results

**Expected**:
- The chat result message appears (Scenario 1 behavior)
- AND an email is received at the provided address with the full result list

---

## Regression check: Normal Q&A round

**Goal**: Verify the searching indicator does NOT appear during regular conversation

**Steps**:
1. Open the app and send a message that does NOT trigger `conclude_conversation` (e.g., "I drive about 20 km a day")
2. Observe the chat window

**Expected**:
- The standard three-dot loading indicator appears while Claude responds
- No "Searching for matching cars…" text appears
- The assistant's response appears as normal

---

## Key Files

| File | Role |
|---|---|
| `lib/types/n8n.ts` | `SearchResultItem`, extended `WebhookResult` / `WebhookEvent` |
| `lib/types/chat.ts` | Extended `Message` with `searchResults`, `isSearching` in `ConversationState` |
| `lib/n8n/trigger.ts` | Parses n8n response body; 30-second timeout per fetch |
| `app/api/chat/route.ts` | Emits `__SEARCH_STARTED__`; forwards results in `WebhookEvent` |
| `components/ChatInterface/ChatInterface.tsx` | Detects sentinels; renders searching indicator and result messages |
| `components/ChatInterface/SearchResultMessage.tsx` | Compact result list component |
| `components/ChatInterface/ChatInterface.module.css` | Styles for result list and source links |
