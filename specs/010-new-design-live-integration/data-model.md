# Data Model: New Design Live Integration

**Branch**: `010-new-design-live-integration` | **Date**: 2026-08-12

---

## WizardAnswers _(new — lib/types/chat.ts)_

Structured answers collected across wizard steps 1–4. Sent to `/api/chat` as `wizardAnswers`.

```ts
export interface WizardAnswers {
  driving: string[];       // selected driving scenarios, max 3
                           // values: "Daily commute" | "Family life" | "City errands"
                           //         | "Road trips" | "Outdoors & gear" | "Work use"
  priorities: string[];    // selected priorities, max 3
                           // values: "Safety tech" | "Low running cost" | "Comfort"
                           //         | "Easy parking" | "Cargo room" | "Fun to drive"
                           //         | "Winter ready" | "Premium feel"
  budget: number;          // target monthly payment in USD, range 250–1200
  payment: string;         // "Finance" | "Cash" | "Lease"
  seats: string;           // "2-4 people" | "5 people" | "6+ people"
  parking: string;         // "Driveway" | "Garage" | "Street"
  powertrain: string;      // "Open to any" | "Hybrid" | "Electric"
  price: number;           // total vehicle price in USD, range 15000–70000
  notes: string;           // optional free-text, may be empty string
}
```

**Constraints**:
- `driving.length` ∈ [0, 3]
- `priorities.length` ∈ [0, 3]
- `budget` ∈ [250, 1200], step 25
- `price` ∈ [15000, 70000], step 1000

**Source**: Mirrors the existing `Answers` type in `components/NewDesign.tsx` (lines 35–45).
The local `Answers` type remains in NewDesign.tsx for component use; `WizardAnswers` is the
exported shared type used at the API boundary.

---

## ChatRequestBody _(modified — lib/types/chat.ts)_

```ts
export interface ChatRequestBody {
  messages: MessageParam[];
  isRefinement: boolean;
  roundCount: number;
  userEmail?: string | null;       // already present in route.ts; add to interface
  wizardAnswers?: WizardAnswers;   // NEW: present on initial search call; absent on chat follow-ups
}
```

`wizardAnswers` is optional so the backend degrades gracefully for refinement turns where the
wizard context was already captured in the system prompt on the first call.

---

## ConversationState _(modified — lib/types/chat.ts)_

```ts
export interface ConversationState {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  sessionStatus: SessionStatus;
  roundCount: number;
  consecutiveRefusals: number;
  isRefinement: boolean;
  webhookError: string | null;
  isSearching: boolean;
  searchResults: SearchResultItem[] | null;   // NEW: populated after successful search
  totalResultCount: number;                   // NEW: total count from backend (for overflow message)
}
```

---

## SearchResultItem _(unchanged — lib/types/n8n.ts)_

Returned by the backend after a successful `search_cars` tool call. Rendered in step 5 cards.

```ts
export interface SearchResultItem {
  make: string;
  model: string;
  bodyType: string | null;
  year: number;
  price: number | null;
  sourceUrl: string | null;
}
```

---

## Message _(unchanged — lib/types/chat.ts)_

```ts
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  searchResults?: { items: SearchResultItem[]; totalCount: number };
}
```

Used for chat panel messages. The initial step-5 trigger message is NOT added to `messages`
state (it is hidden from the UI).

---

## Session state transitions

```
App.sessionStatus:

  "active"      User is in steps 1–4 or chatting before first search
      │
      │  "Find my matches" clicked / search completes
      ▼
  "concluded"   Step 5 results shown; App.searchResults populated
      │
      │  User types a follow-up in the chat panel
      ▼
  "refining"    Refinement conversation active; isRefinement=true sent to API
```

The `"concluding"` and `"consecutiveRefusals"` fields are retained in the interface for
compatibility but are not actively used by the new design's simplified flow.
