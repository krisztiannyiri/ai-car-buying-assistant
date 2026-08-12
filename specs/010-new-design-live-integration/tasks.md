# Tasks: New Design Live Integration

**Input**: Design documents from `specs/010-new-design-live-integration/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Tests**: No automated tests per constitution (Principle V).

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- No story label = Setup / Foundational / Polish phase

---

## Phase 1: Setup

**Purpose**: Install missing dependencies and bootstrap Tailwind v4 so `NewDesign.tsx`
and `newdesign.css` can be compiled by Next.js.

- [X] T001 Install new npm dependencies: `npm install framer-motion lucide-react tailwindcss @tailwindcss/postcss` (updates `package.json`)
- [X] T002 Create `postcss.config.js` at project root with content: `module.exports = { plugins: { "@tailwindcss/postcss": {} } };`

**Checkpoint**: `npm run dev` starts without import errors from `framer-motion` or `lucide-react`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core changes that every user story depends on — type definitions, entry-point
wiring, and the backend API extension. No user story phase can begin until all four tasks
below are complete.

**⚠️ CRITICAL**: Complete this phase before any user story work.

- [X] T003 [P] Extend `lib/types/chat.ts`: (a) export new `WizardAnswers` interface matching the `Answers` type in `components/NewDesign.tsx` (driving, priorities, budget, payment, seats, parking, powertrain, price, notes); (b) add optional `wizardAnswers?: WizardAnswers` and `userEmail?: string | null` to `ChatRequestBody`; (c) add `searchResults: SearchResultItem[] | null` and `totalResultCount: number` to `ConversationState`
- [X] T004 [P] Update `app/layout.tsx`: add `import "../components/newdesign.css"` after the existing `globals.css` import so Tailwind utilities are available for `NewDesign.tsx`
- [X] T005 Update `app/page.tsx`: replace the `<ChatInterface />` render with `<NewDesign />` imported from `components/NewDesign.tsx`; remove the `ChatInterface` import; keep the `<main>` wrapper or adjust to match the new layout (NewDesign renders its own full-screen container)
- [X] T006 Extend `app/api/chat/route.ts`: (a) import `WizardAnswers` from `lib/types/chat`; (b) add `wizardAnswers: WizardAnswers | undefined` to the parsed request body variables; (c) update `buildSystemPrompt` signature to `buildSystemPrompt(isRefinement, roundCount, wizardAnswers?)` — when `wizardAnswers` is provided, replace the "Conversation flow / Ask ONE question" section with a "What the user already told us" block that lists all wizard fields (see `contracts/api-chat.md` for exact wording), and instruct the AI to proceed directly to recommendation and call `search_cars` without asking lifestyle questions; keep the Expert Recommendation, Tie-breaking, Inference rules, and Round-limit sections unchanged; (d) pass `wizardAnswers` through to the `buildSystemPrompt` call

**Checkpoint**: `npm run dev` opens `http://localhost:3000` and renders the new Cora wizard UI (dark green sidebar, five steps). Browsing through steps 1–4 works with the existing mock `sendChat`.

---

## Phase 3: User Story 1 — Complete wizard → real search results (Priority: P1) 🎯 MVP

**Goal**: User completes steps 1–4, clicks "Find my matches", advances immediately to step 5
with a loading indicator, and sees real `SearchResultItem` cards when the search completes.

**Independent Test**: Quickstart Scenario 1 — navigate all five steps, click "Find my matches",
verify real car cards (make/model/year/price) appear after the loading state.

### Implementation for User Story 1

- [X] T007 [US1] Add conversation and search state to `App` in `components/NewDesign.tsx`: replace the existing `isThinking/messages` state with the full set — `messages: Message[]`, `isStreaming`, `streamingContent`, `error`, `sessionStatus`, `roundCount`, `isRefinement`, `webhookError`, `isSearching`, `searchResults: SearchResultItem[] | null`, `totalResultCount: number`; add `abortControllerRef` and `retryPayloadRef` using `useRef`; import `Message`, `ConversationState`, `SearchResultItem` from `lib/types/` and `CarSearchPayload` from `lib/types/n8n`
- [X] T008 [US1] Implement `sendChat(text: string, wizardContext?: WizardAnswers)` in `App` (`components/NewDesign.tsx`): real streaming `fetch` to `/api/chat` sending `{ messages, isRefinement, roundCount, userEmail, wizardAnswers: wizardContext }`; parse `__SEARCH_STARTED__` and `__WEBHOOK_EVENT__` sentinels; on success set `searchResults` + `totalResultCount` + `sessionStatus: "concluded"`; on failure set `webhookError` + store `retryPayload`; on plain text response increment `roundCount`; port logic from `components/ChatInterface/ChatInterface.tsx` `sendMessage()` function
- [X] T009 [US1] Implement `retryWebhook()` in `App` (`components/NewDesign.tsx`): `POST /api/webhook-retry` with stored `retryPayloadRef.current`; on success clear `webhookError` and set `sessionStatus: "concluded"`; port from `components/ChatInterface/ChatInterface.tsx`
- [X] T010 [US1] Update `continueFlow` in `App` (`components/NewDesign.tsx`): when `currentStep === 3` (i.e., about to advance to step 4 / results), after calling `setCurrentStep(4)` also invoke `sendChat("", answers)` passing the current wizard `answers` as `wizardContext` — this is the hidden initial trigger message (empty string is replaced with a fixed trigger phrase inside `sendChat` when `wizardContext` is present)
- [X] T011 [US1] Update `resetFlow` in `App` (`components/NewDesign.tsx`): call `abortControllerRef.current?.abort()`, reset `retryPayloadRef.current` to null, then clear all conversation + search state fields: `messages` reset to `initialMessages`, `isStreaming: false`, `streamingContent: ""`, `error: null`, `sessionStatus: "active"`, `roundCount: 0`, `isRefinement: false`, `webhookError: null`, `isSearching: false`, `searchResults: null`, `totalResultCount: 0`
- [X] T012 [P] [US1] Refactor `Results` component in `components/NewDesign.tsx`: remove the static `cars` array and `carImages` constant; add props `isLoading: boolean`, `items: SearchResultItem[] | null`, `totalCount: number`, `userEmail: string | null`, `onAsk: (text: string) => void`; render one card per item using `make`, `model`, `year`, `price` (formatted as currency or "Not available"), and a "View listing" link when `sourceUrl` is non-null
- [X] T013 [P] [US1] Add loading skeleton to `Results` in `components/NewDesign.tsx`: when `isLoading` is true, render three placeholder cards with animated pulse shimmer (CSS `animate-pulse` Tailwind class) in place of real cards
- [X] T014 [P] [US1] Add zero-results state to `Results` in `components/NewDesign.tsx`: when `isLoading` is false and `items` is an empty array, render a message: "No matching cars were found for your criteria. Try broadening your search — for example, consider a wider budget range or additional body types."
- [X] T015 [US1] Wire `App` state down to `Results` in `components/NewDesign.tsx`: on step 5 pass `isLoading={isSearching}`, `items={searchResults ?? []}`, `totalCount={totalResultCount}`, `userEmail={userEmail}` to `<Results />`; `isLoading` should be true while `isStreaming || isSearching` and `searchResults` is still null
- [X] T016 [US1] Add webhook error display and retry control to `ChatPanel` in `components/NewDesign.tsx`: add optional `webhookError: string | null` and `onRetry: () => void` props; when `webhookError` is non-null, render an error message with a "Try again" button that calls `onRetry`; wire from `App` (pass `webhookError={webhookError}` and `onRetry={retryWebhook}`)

**Checkpoint**: User Story 1 fully functional — completing the wizard shows a loading state on step 5, then real car cards from the backend. Quickstart Scenario 1 passes.

---

## Phase 4: User Story 2 — Real AI streaming in chat (Priority: P2)

**Goal**: Every message sent through the chat panel receives an incremental AI-generated
response; the "Searching…" indicator appears when a vehicle search is running.

**Independent Test**: Quickstart Scenario 2 — type a question in the chat panel, observe
streaming text and typing indicator; confirm no hardcoded responses remain.

### Implementation for User Story 2

- [X] T017 [US2] Update `ChatPanel` props in `components/NewDesign.tsx`: add `isSearching: boolean` prop; when `isSearching` is true AND `isThinking` is true, render a "Searching for matching cars…" message with the animated dots indicator (instead of the plain dots) — matching the `ChatInterface.tsx` behaviour
- [X] T018 [US2] Update `App` in `components/NewDesign.tsx`: pass `isThinking={isStreaming}` and `isSearching={isSearching}` to `<ChatPanel />`; remove the now-unused local `isThinking` state variable if one exists
- [X] T019 [US2] Add AI error messages to chat thread in `App` (`components/NewDesign.tsx`): when `error` state is set after a failed chat API call, append an assistant-role `Message` with the error text to `messages` so it appears inline in the chat panel (rather than as a separate UI element)

**Checkpoint**: User Story 2 functional — chat panel streams real AI text incrementally; typing indicator shows while waiting; "Searching…" state displays when vehicle search is active. Quickstart Scenarios 2 and 3 pass.

---

## Phase 5: User Story 3 — Email capture (Priority: P3)

**Goal**: User optionally enters their email address; the email is sent to the backend with
every search; overflow results message references the email when set.

**Independent Test**: Quickstart Scenario 6 — enter email, complete wizard, verify overflow
message includes email reference; verify omitting email omits the reference.

### Implementation for User Story 3

- [X] T020 [US3] Add `userEmail` state and email input to `ChatPanel` in `components/NewDesign.tsx`: add a small labeled email `<input type="email">` above the message textarea in the chat panel footer; add `userEmail: string` + `onEmailChange: (email: string) => void` props; render the field with the placeholder "your@email.com"
- [X] T021 [US3] Lift `userEmail` state to `App` in `components/NewDesign.tsx`: move `userEmail` state to the `App` component (remove any existing local `userEmail` in ChatPanel); pass `userEmail={userEmail}` and `onEmailChange={(e) => setUserEmail(e)}` down to `ChatPanel`
- [X] T022 [US3] Pass `userEmail` to backend calls in `App` (`components/NewDesign.tsx`): include `userEmail: userEmail || null` in the `/api/chat` fetch body inside `sendChat`; also include it in the `retryPayload` stored for `retryWebhook`
- [X] T023 [US3] Pass `userEmail` to `Results` in `components/NewDesign.tsx`: pass `userEmail={userEmail}` to `<Results />` on step 5 so the overflow count message can display "check your email for the full list" when `userEmail` is set and `totalCount > items.length`

**Checkpoint**: User Story 3 functional — email field visible in chat panel; email forwarded to backend; overflow message references email correctly. Quickstart Scenario 6 passes.

---

## Phase 6: User Story 4 — Reset (Priority: P4)

**Goal**: "New car search" and "Start over" controls abort any in-flight request and
fully clear wizard and chat state.

**Independent Test**: Quickstart Scenario 7 — click "New car search" on step 5 with results,
verify return to step 1 with all state cleared.

### Implementation for User Story 4

- [X] T024 [US4] Verify reset wiring in `App` (`components/NewDesign.tsx`): confirm `AppSidebar` receives `onReset={resetFlow}`, `MobileNav` receives `onReset={resetFlow}`, and the header "Start over" button calls `resetFlow`; confirm `resetFlow` (updated in T011) aborts the in-flight `AbortController` and clears all state including `userEmail` reset to `""` — adjust if any wiring is missing

**Checkpoint**: User Story 4 functional — all reset controls work, in-flight requests are
cancelled, state is clean on return to step 1. Quickstart Scenario 7 passes.

---

## Phase 7: Polish & Migration Close

**Purpose**: CSS consolidation, old component deletion, build verification.

- [X] T025 Merge `app/globals.css` into `components/newdesign.css`: move any custom properties or resets from `globals.css` that are not already covered by `newdesign.css` (e.g. colour tokens under `:root`); then update `app/layout.tsx` to remove the `globals.css` import and keep only the `newdesign.css` import; delete `app/globals.css`
- [X] T026 [P] Delete old `ChatInterface` component tree: remove `components/ChatInterface/ChatInterface.tsx`, `components/ChatInterface/ChatInterface.module.css`, `components/ChatInterface/SearchResultMessage.tsx`, and the `components/ChatInterface/` directory
- [X] T027 [P] Delete old `Header` component: remove `components/Header/Header.tsx` and the `components/Header/` directory
- [X] T028 Run `npm run build` from project root and confirm zero TypeScript errors, zero missing-module errors, and a clean production build
- [ ] T029 Manual end-to-end verification: run through all eight scenarios in `specs/010-new-design-live-integration/quickstart.md`; mark each scenario pass/fail (Scenario 8 — migration close verified programmatically ✓)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user story phases
- **US1 (Phase 3)**: Depends on Phase 2 — no other user story dependency
- **US2 (Phase 4)**: Depends on Phase 3 (T008 `sendChat` must exist before T017/T018)
- **US3 (Phase 5)**: Depends on Phase 3 (T007 App state, T008 sendChat must exist)
- **US4 (Phase 6)**: Depends on Phase 3 (T011 `resetFlow` must exist)
- **Polish (Phase 7)**: Depends on all user story phases being verified

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — no other story dependency
- **US2 (P2)**: Depends on US1 (specifically T008 `sendChat`) — US2 is a display enhancement on top of the same streaming function
- **US3 (P3)**: Depends on US1 (T007 state, T008 sendChat) — email is additive to the existing flow
- **US4 (P4)**: Depends on US1 (T011 `resetFlow`) — verification task only

### Within Each Story

- State additions before function implementations (T007 before T008/T009/T010)
- Core functions before wiring (T008 before T010, T015, T016)
- Component changes marked [P] (T012, T013, T014) can happen in parallel with T007–T011
- Results component changes (T012–T014) can happen concurrently with App state work (T007–T011)

### Parallel Opportunities

Within Phase 3 (US1):
- T012, T013, T014 (Results component changes) can be worked in parallel with T007–T011 (App state + functions)

Within Phase 4 (US2):
- T017, T018, T019 are independent of each other (different prop additions)

Within Phase 7:
- T026 and T027 can run in parallel (different directories)

---

## Parallel Example: User Story 1

```
Concurrent tracks:

Track A (App logic):
  T007 → T008 → T009 → T010 → T011 → T015 → T016

Track B (Results component):
  T012 → T013 → T014
  (merge into T015 once both tracks complete)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: User Story 1 (T007–T016)
4. **STOP and validate**: Run Quickstart Scenario 1 — real results on step 5
5. The app is usable for its primary purpose at this point

### Incremental Delivery

1. Setup + Foundational → wizard renders, API accepts wizard answers
2. US1 complete → real car search results on step 5 (MVP!)
3. US2 complete → streaming chat with AI responses + search indicator
4. US3 complete → email capture and overflow message
5. US4 complete → reset verified end-to-end
6. Polish → old code deleted, build clean

---

## Notes

- `[P]` tasks operate on different files or independent sections — safe to run concurrently
- `[Story]` label maps each task to its user story for traceability
- Commit after each phase checkpoint or logical group
- The initial search trigger in T010 sends an empty user message internally; do NOT add it to the `messages` state — only Cora's response appears in the chat panel
- `searchResults` is set only after a successful `__WEBHOOK_EVENT__` parse; keep `searchResults: null` until then so the loading skeleton stays visible
- The `Results` component's `isLoading` prop should be `true` while `isStreaming || isSearching` and `searchResults === null`; set it to `false` once `searchResults` is populated (even if still null after a failed search)
