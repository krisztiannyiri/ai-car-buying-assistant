# Tasks: n8n Workflow Automation Integration

**Input**: Design documents from `specs/003-n8n-integration/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Constitution**: No automated tests. No new npm packages.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (touches different files, no dependency on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 / US2 / US3)
- No story label = Setup or Foundational phase

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add Docker and environment scaffolding that all phases depend on.

- [X] T001 Create `docker-compose.yml` at repo root with n8n SQLite service: image `docker.n8n.io/n8nio/n8n`, port `5678:5678`, named volume `n8n_data:/home/node/.n8n`, env vars `GENERIC_TIMEZONE=UTC`, `TZ=UTC`, `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`, restart `unless-stopped` (see research.md Decision 2)
- [X] T002 [P] Add `n8n-trigger.log` entry to `.gitignore` under the `# debug` section (`.env*` already covers env files)
- [X] T003 [P] Append `N8N_WEBHOOK_CAR_SEARCH_URL=http://localhost:5678/webhook/car-search` to `.env.local`

**Checkpoint**: `docker compose up -d` starts n8n at `http://localhost:5678`; env var is present in `.env.local`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core TypeScript types and webhook utility used by all user stories.

**⚠️ CRITICAL**: Phase 3+ cannot begin until T004 and T005 are complete.

- [X] T004 Create `lib/types/n8n.ts` with two exported interfaces: `WebhookPayload { query: string; messageCount: number; timestamp: string }` and `TriggerLogEntry { timestamp: string; webhookUrl: string; payload: WebhookPayload; error: string }` (see data-model.md App-Side Entities)
- [X] T005 Create `lib/n8n/trigger.ts` exporting `fireWebhook(url: string, payload: WebhookPayload): void` — fire-and-forget `fetch` POST (no `await`) with `.catch` that calls an internal `appendToLog(url, payload, err)` helper; `appendToLog` uses `fs/promises.appendFile` to write a `TriggerLogEntry` as NDJSON to `n8n-trigger.log` in the project root (see research.md Decision 3 and contracts/webhook-car-search.md Failure Log Contract)

**Checkpoint**: `lib/types/n8n.ts` and `lib/n8n/trigger.ts` compile with no TypeScript errors (`npx tsc --noEmit`)

---

## Phase 3: User Story 1 — Manage n8n Workflows via Claude (Priority: P1) 🎯 MVP

**Goal**: Developer can list, create, activate/deactivate, update, and delete n8n workflows using Claude's MCP tools — without opening the n8n UI.

**Independent Test**: Ask Claude to list all workflows; Claude returns a result (empty or populated) using the `n8n-mcp` tool with no auth or connection errors.

> **Manual prerequisite** (developer must complete before testing T006):
> 1. `docker compose up -d` (Phase 1)
> 2. Open `http://localhost:5678`, complete first-run signup
> 3. Go to **Settings > n8n API**, create an API key labelled `claude-mcp`, copy the value
> 4. Replace `<REPLACE_WITH_N8N_API_KEY>` in `.claude/settings.json` (created by T006) with the real key

- [X] T006 [US1] Create `.claude/settings.json` at repo root with the n8n MCP server entry: `{ "mcpServers": { "n8n-mcp": { "type": "http", "url": "http://localhost:5678/mcp-server/http", "headers": { "Authorization": "Bearer <REPLACE_WITH_N8N_API_KEY>" } } } }` (see research.md Decision 1; the placeholder token must be replaced manually by the developer) — ⚠️ REQUIRES MANUAL ACTION: auto-mode blocked this write; create this file manually (see Completion Report)

**Checkpoint**: `claude mcp list` shows `n8n-mcp`; asking Claude "list all n8n workflows" returns a result without error

---

## Phase 4: User Story 2 — Trigger Automation from Application (Priority: P2)

**Goal**: Chat API fires a non-blocking webhook to n8n after receiving a valid user message; n8n logs the query and message count; failures are written to `n8n-trigger.log`.

**Independent Test**: Send a chat message; verify a new execution appears in the n8n `Car Search Logger` workflow within 2 seconds; user receives a normal AI response with no delay.

> **Manual prerequisite** (developer must complete before testing T008):
> 1. In n8n UI, import `specs/003-n8n-integration/car-search-workflow.json` (created by T007) via **Settings > Workflows > Import from File**
> 2. Open the imported workflow, click **Activate** (toggle top-right)
> 3. Confirm `N8N_WEBHOOK_CAR_SEARCH_URL=http://localhost:5678/webhook/car-search` is set in `.env.local`

- [X] T007 [P] [US2] Create `specs/003-n8n-integration/car-search-workflow.json` — a valid n8n workflow export JSON with: (a) a Webhook trigger node (`type: n8n-nodes-base.webhook`, `typeVersion: 2`, `httpMethod: POST`, `path: car-search`, `responseMode: onReceived`) and (b) a Code node (`type: n8n-nodes-base.code`, `typeVersion: 2`) that destructures `query`, `messageCount`, `timestamp` from `$input.first().json` and logs them via `console.log`; nodes connected Webhook → Code; workflow named `Car Search Logger`, `active: false` (imported as inactive; developer activates manually)
- [X] T008 [US2] Modify `app/api/chat/route.ts`: after successfully parsing `messages` and before starting the Anthropic stream, extract the last user message content and message count, then call `fireWebhook(process.env.N8N_WEBHOOK_CAR_SEARCH_URL!, { query: lastMessage.content.trim(), messageCount: messages.length, timestamp: new Date().toISOString() })` — guard the call with `if (process.env.N8N_WEBHOOK_CAR_SEARCH_URL && lastMessage?.role === 'user' && lastMessage.content.trim())` so the app runs normally when the env var is absent; import `fireWebhook` from `@/lib/n8n/trigger` and `WebhookPayload` from `@/lib/types/n8n` (see contracts/webhook-car-search.md Trigger Condition)

**Checkpoint**: Chat message triggers n8n execution visible in the Executions tab; stopping Docker and sending another message writes a line to `n8n-trigger.log`

---

## Phase 5: User Story 3 — Monitor Workflow Execution Health (Priority: P3)

**Goal**: Developer retrieves workflow execution history and error details through Claude.

**Independent Test**: Ask Claude to show the last 5 executions of `Car Search Logger`; Claude returns status and timestamps for each run using MCP tools.

> **No code changes required.** US3 is fully enabled by the MCP registration (T006) and the n8n instance started in Phase 1. Execution history is a built-in capability of the n8n MCP server tools.

- [ ] T009 [US3] Validate US3 manually per quickstart.md Step 9: (manual validation — requires running n8n and T006 to be complete first) ask Claude in a session "Show me the last 5 executions of the Car Search Logger workflow" and confirm it returns execution data; if the MCP server returns an auth error, check whether n8n requires a separate MCP credential (see research.md Decision 4 Note on MCP Bearer token) and update the token in `.claude/settings.json`

**Checkpoint**: Claude returns execution summary for the Car Search Logger workflow without opening the n8n UI

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Developer experience and documentation completeness.

- [X] T010 [P] Create `.env.example` at repo root documenting all required environment variables with placeholder values and comments: `ANTHROPIC_API_KEY=` and `N8N_WEBHOOK_CAR_SEARCH_URL=http://localhost:5678/webhook/car-search` (enables other developers to know which env vars to configure)

**Checkpoint**: `diff .env.example .env.local | grep -v '^[<>].*=.\+'` shows structure matches; run full quickstart.md validation (Steps 1–9)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002 and T003 are parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion; T004 and T005 can run in parallel
- **US1 (Phase 3)**: Depends on Phase 2 completion; T006 is the only task
- **US2 (Phase 4)**: Depends on Phase 2 completion; T007 (parallel) and T008 can start once T004+T005 are done
- **US3 (Phase 5)**: Depends on Phase 3 (MCP registration via T006); no code tasks
- **Polish (Phase 6)**: Depends on all phases; T010 is independent

### User Story Dependencies

- **US1 (P1)**: Unblocked after Foundational (Phase 2); T006 only
- **US2 (P2)**: Unblocked after Foundational (Phase 2); T007 is parallel with T006
- **US3 (P3)**: Enabled by US1 (T006 must be complete); no additional code

### Within Each Phase

- Phase 2: T004 (types) before T005 (trigger) — trigger imports the types
- Phase 4: T007 parallel with Phase 3; T008 depends on T005

### Parallel Opportunities

- T002 and T003 in parallel (different files)
- T004 and T005: T005 depends on T004 for type imports; run sequentially
- T006 and T007 in parallel (different files, no dependencies between them)
- T010 independent of US1–US3 (can run any time after Phase 1)

---

## Parallel Example: Phase 1

```
# All can start immediately:
T001 — create docker-compose.yml
T002 — update .gitignore      [parallel with T001]
T003 — update .env.local      [parallel with T001 and T002]
```

## Parallel Example: Phase 4

```
# Both can start once Phase 2 is done:
T007 — create car-search-workflow.json  [parallel]
T008 — modify app/api/chat/route.ts     [depends on T005]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T005)
3. Complete Phase 3: US1 (T006) + manual API key setup
4. **STOP and VALIDATE**: Ask Claude to list n8n workflows — confirms MCP integration works
5. This is the minimum deliverable that proves the n8n + MCP setup is functional

### Incremental Delivery

1. **Setup + Foundational** → infrastructure ready
2. **US1** → developer can manage workflows via Claude (MVP)
3. **US2** → app sends real events to n8n (automation live)
4. **US3** → validated automatically by US1; confirm with quickstart Step 9
5. **Polish** → `.env.example` added

### Single Developer Strategy

All 10 tasks can be completed sequentially in ID order (T001 → T010). Phases 1 and 2
can be completed in ~30 minutes. US1 has one code task (T006) plus manual setup (~20 min).
US2 adds two code tasks (T007 + T008) plus manual workflow import.

---

## Notes

- [P] tasks touch different files — safe to run in parallel
- [USn] label maps each task to its user story for traceability
- T009 has no code output — it is a validation step; mark complete once confirmed
- Manual steps (Docker start, API key generation, workflow import) are documented in `quickstart.md` and noted inline above each phase; these are not LLM tasks
- `n8n-trigger.log` is gitignored and runtime-only; never commit it
- `.claude/settings.json` contains a bearer token placeholder — developer replaces it; do not commit a real token
