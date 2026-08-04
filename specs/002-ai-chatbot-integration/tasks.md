# Tasks: AI Chatbot Integration

**Input**: Design documents from `/specs/002-ai-chatbot-integration/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: None — Constitution Principle V prohibits automated test frameworks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the Anthropic SDK, provision the API key file, and define shared TypeScript types used by both the Route Handler and the client component.

- [ ] T001 Add `@anthropic-ai/sdk` to `package.json` by running `npm install @anthropic-ai/sdk`
- [ ] T002 [P] Create `.env.local` at the repository root with `ANTHROPIC_API_KEY=` placeholder (file is gitignored by Next.js default)
- [ ] T003 [P] Create `lib/types/chat.ts` with the shared TypeScript types from `specs/002-ai-chatbot-integration/contracts/types.ts`: `MessageRole`, `Message`, `ConversationState`, `MessageParam`, `ChatRequestBody`, `ChatErrorType`, `ChatErrorResponse`, `ChatInterfaceProps`

---

## Phase 2: Foundational (Route Handler — Blocking Prerequisite)

**Purpose**: Build the server-side Anthropic proxy at `app/api/chat/route.ts`. All four user stories require a working Route Handler. No user story implementation can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create `app/api/chat/route.ts` with a named `POST` export and request body parsing — read `messages: MessageParam[]` from JSON body, validate array is non-empty
- [ ] T005 Instantiate the Anthropic client with `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` in `app/api/chat/route.ts`
- [ ] T006 Add the static car-buying system prompt string constant in `app/api/chat/route.ts` (canonical text from `research.md` Decision 4)
- [ ] T007 Implement the streaming `ReadableStream` response in `app/api/chat/route.ts` — call `client.messages.stream()` with `model: 'claude-sonnet-4-6'`, `system` prompt, `max_tokens`, and `messages`; enqueue each `content_block_delta` text chunk into a `ReadableStream`; return `new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`
- [ ] T008 Add typed error handling in `app/api/chat/route.ts` — catch `Anthropic.RateLimitError` → 429 `rate_limit`, `Anthropic.APIConnectionError` → 503 `connection`, `Anthropic.APIStatusError` → 502 `api_error`, all others → 500 `unknown`; return `Response.json({ error: { type, message } }, { status })` per the contract in `contracts/api.md`

**Checkpoint**: Route Handler complete — send a `curl -X POST http://localhost:3000/api/chat -d '{"messages":[{"role":"user","content":"test"}]}'` to confirm a streaming text response.

---

## Phase 3: User Story 1 — Send a Message and Receive an AI Response (Priority: P1) 🎯 MVP

**Goal**: A user types a car-buying question, submits it, and sees a real AI-generated response stream word-by-word into the chat thread.

**Independent Test**: Type "What should I consider when buying a used car?" and press Send. Verify a relevant, non-static AI response appears and streams token-by-token within 3 seconds (SC-001).

### Implementation for User Story 1

- [ ] T009 [P] [US1] Add `'use client'` directive and import `useState`, `useRef`, `useEffect` from `react` in `components/ChatInterface/ChatInterface.tsx`
- [ ] T010 [P] [US1] Declare `ConversationState` via `useState<ConversationState>` initialised to `{ messages: [], isStreaming: false, streamingContent: '', error: null }` in `components/ChatInterface/ChatInterface.tsx`
- [ ] T011 [US1] Implement `sendMessage` handler in `components/ChatInterface/ChatInterface.tsx` (depends on T009, T010): create a `Message` with `id: crypto.randomUUID()`, append to `messages`, set `isStreaming: true`, POST to `/api/chat` with `{ messages: [{ role: 'user', content }] }`, read the `ReadableStream` body with `response.body.getReader()` + `TextDecoder`, accumulate decoded chunks into `streamingContent`, on stream close append completed assistant `Message` to `messages` and reset `streamingContent` and `isStreaming`
- [ ] T012 [US1] Render the `messages` array in `components/ChatInterface/ChatInterface.tsx` — map each `Message` to a bubble element styled by `role`; render the in-progress `streamingContent` as a temporary assistant bubble while `isStreaming` is true
- [ ] T013 [US1] Show a loading indicator in `components/ChatInterface/ChatInterface.tsx` from the moment `isStreaming` becomes `true` until the first character appears in `streamingContent`; once `streamingContent` is non-empty, replace the indicator with the live text
- [ ] T014 [US1] Disable the message `<input>` and submit `<button>` when `isStreaming` is `true` in `components/ChatInterface/ChatInterface.tsx`
- [ ] T015 [US1] Add a `useEffect` that scrolls the chat container ref to `scrollHeight` whenever `messages` or `streamingContent` changes in `components/ChatInterface/ChatInterface.tsx`
- [ ] T016 [P] [US1] Add message bubble variant styles (`.userBubble`, `.assistantBubble`), loading indicator animation, and disabled-input styles to `components/ChatInterface/ChatInterface.module.css`
- [ ] T017 [US1] Guard `sendMessage` to return early without making a request when the trimmed input value is empty (FR-007) in `components/ChatInterface/ChatInterface.tsx`

**Checkpoint**: User Story 1 independently functional — streaming response visible, input disabled during stream, auto-scroll working.

---

## Phase 4: User Story 2 — Multi-Turn Conversation with Context (Priority: P2)

**Goal**: Each subsequent message includes full conversation history so the AI can answer follow-up questions without the user restating context.

**Independent Test**: Send "Tell me about the Toyota Camry." Then send "Is it good for families?" The second response references the Camry without being prompted.

### Implementation for User Story 2

- [ ] T018 [US2] Update the POST body construction in `sendMessage` in `components/ChatInterface/ChatInterface.tsx`: replace the single-message array with `messages.slice(-20).map(({ role, content }) => ({ role, content }))` plus the new user message appended — this sends the pruned history (last 20 messages, `id` stripped) on every call (FR-003)

**Checkpoint**: Multi-turn context working — "Is it good for families?" answered in the context of the Toyota Camry. User Stories 1 and 2 both pass their independent tests.

---

## Phase 5: User Story 3 — Graceful Error Handling (Priority: P3)

**Goal**: When the API returns a non-2xx response, the user sees a clear, specific, actionable error message — not a blank screen or infinite spinner — and can retry without reloading.

**Independent Test**: Set `ANTHROPIC_API_KEY=invalid` in `.env.local`, restart the dev server, send any message. Verify a human-readable error appears and the input is re-enabled (SC-003, SC-004).

### Implementation for User Story 3

- [ ] T019 [US3] After `fetch()` resolves in `sendMessage`, check `response.ok`; if false, read and parse the `ChatErrorResponse` JSON body and map `error.type` to user-visible strings: `rate_limit` → "Too many requests — please wait a moment and try again", `connection` → "Couldn't reach the AI service — check your connection and retry", `api_error` → "The AI service returned an error — please try again", `unknown` → "Something went wrong — please try again"; set `error` in state and reset `isStreaming` in `components/ChatInterface/ChatInterface.tsx`
- [ ] T020 [US3] Render the `error` string from state below the chat thread when non-null in `components/ChatInterface/ChatInterface.tsx`; clear `error` when the user submits a new message
- [ ] T021 [P] [US3] Add error message display styles (`.errorMessage`) to `components/ChatInterface/ChatInterface.module.css`

**Checkpoint**: Error handling complete — specific rate-limit vs generic error messages shown; input re-enabled after error; retry succeeds without page reload.

---

## Phase 6: User Story 4 — Start a New Conversation (Priority: P3)

**Goal**: A user can clear the conversation thread and reset all state with one tap, including cancelling any in-flight AI stream.

**Independent Test**: Complete a short conversation about one car model. Press "New conversation". Verify the thread is empty and a follow-up question is answered without reference to the prior conversation.

### Implementation for User Story 4

- [ ] T022 [P] [US4] Add `abortControllerRef = useRef<AbortController | null>(null)` to `components/ChatInterface/ChatInterface.tsx`; in a `useEffect` cleanup function call `abortControllerRef.current?.abort()` on component unmount
- [ ] T023 [US4] Create a fresh `AbortController` (`new AbortController()`) at the start of `sendMessage`, assign it to `abortControllerRef.current`, and pass `signal: abortControllerRef.current.signal` to `fetch()` in `components/ChatInterface/ChatInterface.tsx`
- [ ] T024 [US4] Add a "New conversation" `<button>` to the ChatInterface UI in `components/ChatInterface/ChatInterface.tsx`
- [ ] T025 [US4] Implement `startNewConversation` handler in `components/ChatInterface/ChatInterface.tsx`: call `abortControllerRef.current?.abort()`, then reset state to `{ messages: [], isStreaming: false, streamingContent: '', error: null }`; ensure the fetch rejection from abort is caught silently (do not set `error` state on abort)
- [ ] T026 [P] [US4] Add "New conversation" button styles to `components/ChatInterface/ChatInterface.module.css`

**Checkpoint**: New conversation fully functional — stream cancelled mid-flight, thread cleared, input re-enabled; no partial assistant message persists.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories — TypeScript correctness, responsive layout, and end-to-end manual verification.

- [ ] T027 Run `npm run build` from the repository root and resolve any TypeScript errors or Next.js build errors in `app/api/chat/route.ts` and `components/ChatInterface/ChatInterface.tsx`
- [ ] T028 [P] Verify zero `any` types exist in `app/api/chat/route.ts` and `components/ChatInterface/ChatInterface.tsx`; remove any introduced during implementation
- [ ] T029 [P] Confirm responsive layout in `components/ChatInterface/ChatInterface.module.css` at 320px, 768px, and 1280px viewports; verify touch targets (input, send button, "New conversation" button) are ≥44×44px; confirm no horizontal overflow
- [ ] T030 Run all validation scenarios in `specs/002-ai-chatbot-integration/quickstart.md` — SC-001 through SC-005 and all edge cases (empty message, off-topic redirect, new-conversation mid-stream, auto-scroll, rate-limit error message)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (SDK must be installed) — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 completion — must have a working Route Handler
- **US2 (Phase 4)**: Depends on Phase 3 (needs `messages` state and `sendMessage` handler in place)
- **US3 (Phase 5)**: Depends on Phase 3 (needs fetch flow; Route Handler error responses ready from Phase 2)
- **US4 (Phase 6)**: Depends on Phase 3 (needs `sendMessage` and state in place)
- **Polish (Phase 7)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (message history requires the send flow to exist)
- **US3 (P3)**: Depends on US1 (requires the fetch flow established in US1)
- **US4 (P3)**: Depends on US1 (requires `sendMessage` and AbortController integration point)
- **US3 and US4**: Can proceed in parallel after US1 if working on separate branches (both modify `ChatInterface.tsx` — coordinate to avoid conflicts)

### Within Each User Story

- State setup before handler logic
- Handler logic before rendering
- Rendering before CSS polish
- Core happy path before edge cases

---

## Parallel Opportunities

```bash
# Phase 1 — T002 and T003 can run in parallel:
Task: "Create .env.local with ANTHROPIC_API_KEY= placeholder"
Task: "Create lib/types/chat.ts with shared TypeScript types"

# Phase 3 — T009 and T010 can run in parallel (both in ChatInterface.tsx setup, no conflict):
Task: "Add 'use client' directive and React hook imports"
Task: "Declare ConversationState via useState"

# Phase 3 — T016 (CSS) can run in parallel with T011–T015 (logic):
Task: "Add message bubble variants and loading indicator styles to ChatInterface.module.css"

# Phase 5 + Phase 6 (after Phase 3 completes) — US3 and US4 can proceed concurrently on separate branches:
Developer A: T019–T021 (error handling UI)
Developer B: T022–T026 (new conversation / AbortController)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational Route Handler (**critical — blocks everything**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run SC-001 — first streamed token within 3 seconds
5. Demo the live streaming chatbot

### Incremental Delivery

1. Phase 1 + Phase 2 → Route Handler verified via curl
2. Phase 3 (US1) → Live streaming chat working → **Demo MVP**
3. Phase 4 (US2) → Multi-turn context added → follow-up questions work
4. Phase 5 (US3) → Error handling refined → retry flow polished
5. Phase 6 (US4) → New conversation added → stream cancellation working
6. Phase 7 → Build clean, all quickstart scenarios pass

---

## Notes

- **No test tasks** — Constitution Principle V prohibits test frameworks; quickstart.md provides manual validation scenarios
- `[P]` tasks modify different files or have no shared state dependencies — safe to run concurrently
- `[Story]` labels map each task to its user story for traceability
- The `lib/types/chat.ts` file must be imported by both `app/api/chat/route.ts` (server) and `components/ChatInterface/ChatInterface.tsx` (client) — keep it free of browser-only or server-only imports
- After T025, ensure the `AbortError` from `fetch()` is caught silently (check `error.name === 'AbortError'` in the catch block) so aborting a stream does not set `error` state
- `.env.local` is gitignored by default in Next.js — never commit the actual API key
