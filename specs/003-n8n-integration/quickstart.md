# Quickstart: n8n Workflow Automation Integration

**Branch**: `003-n8n-integration` | **Date**: 2026-08-04

This guide validates the feature end-to-end. Follow the steps in order. Each section has
an expected outcome — use these to confirm the integration is working.

---

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin) installed and running
- The Next.js dev server can be started (`npm run dev`)
- Claude Code CLI available (`claude` in PATH)

---

## Step 1: Start n8n

From the project root:

```bash
docker compose up -d
```

**Expected outcome**: `http://localhost:5678` loads the n8n setup screen (first run) or
the n8n login page (subsequent runs).

Complete the first-run setup (create an account). Remember these credentials — they are
stored in the Docker volume and persist across restarts.

---

## Step 2: Generate an n8n API Key

1. Log in to `http://localhost:5678`
2. Go to **Settings > n8n API** (bottom-left gear icon → API)
3. Click **Create an API key**
4. Set label: `claude-mcp`, leave expiration as default
5. Copy the key — it is shown only once

---

## Step 3: Register the n8n MCP Server with Claude Code

Run from the project root (replace `<YOUR_API_KEY>` with the key from Step 2):

```bash
claude mcp add --transport http n8n-mcp http://localhost:5678/mcp-server/http \
  --header "Authorization: Bearer <YOUR_API_KEY>"
```

**Expected outcome**: No error. Claude Code can now use n8n tools.

**Verify**:
```bash
claude mcp list
```
`n8n-mcp` should appear in the list.

**Note on MCP token vs API key**: If the command above returns an authentication error,
n8n may require a separate MCP credential. In that case, check n8n under
**Settings > Credentials** for an MCP-specific token option, generate one, and use
that value instead of the API key.

---

## Step 4: Validate MCP Workflow Management (User Story 1)

Open a Claude Code session in this project and ask:

> "List all n8n workflows"

**Expected outcome**: Claude returns a list (empty if no workflows exist yet) using the
`n8n-mcp` tool. No error about authentication or connection.

If this fails, verify n8n is running (`docker compose ps`) and the MCP server entry is
correct (`claude mcp list`).

---

## Step 5: Create the Car Search Webhook Workflow

In the n8n UI (`http://localhost:5678`):

1. Click **+ New Workflow**
2. Name it: `Car Search Logger`
3. Add a **Webhook** trigger node:
   - HTTP Method: `POST`
   - Path: `car-search`
   - Response Mode: `Immediately`
4. Add a **Code** node connected to the Webhook:
   - Language: JavaScript
   - Paste this code:
     ```javascript
     const { query, messageCount, timestamp } = $input.first().json;
     console.log(`[car-search] query="${query}" messageCount=${messageCount} at ${timestamp}`);
     return $input.all();
     ```
5. Click **Save**, then click **Activate** (toggle top-right)

**Note**: The workflow must be **activated** for the production webhook URL to be live.
The URL is: `http://localhost:5678/webhook/car-search`

---

## Step 6: Configure the App's Webhook URL

Add the webhook URL to `.env.local`:

```bash
N8N_WEBHOOK_CAR_SEARCH_URL=http://localhost:5678/webhook/car-search
```

Restart the Next.js dev server if it was already running.

---

## Step 7: Validate the Webhook Trigger (User Story 2)

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Send any car-related message (e.g., "What's a good family SUV?")
4. In n8n, go to **Executions** for the `Car Search Logger` workflow

**Expected outcome**:
- The workflow shows a new execution with status **Success**
- The execution data shows the `query`, `messageCount`, and `timestamp` from the app
- The user received a normal AI response with no visible delay

---

## Step 8: Validate Graceful Degradation (FR-006 / SC-003)

1. Stop n8n: `docker compose stop`
2. Send another message in the chat UI

**Expected outcome**:
- The AI chat response works normally — no error shown to the user
- A new line appears in `n8n-trigger.log` in the project root:
  ```json
  {"timestamp":"...","webhookUrl":"/webhook/car-search","payload":{...},"error":"fetch failed: ..."}
  ```

3. Restart n8n: `docker compose start`

---

## Step 9: Validate Execution History via Claude (User Story 3)

In a Claude Code session, ask:

> "Show me the last 5 executions of the Car Search Logger workflow"

**Expected outcome**: Claude returns a summary with status (success/error) and timestamps
for each execution, using the `n8n-mcp` tool — without opening the n8n UI.

---

## Completion Criteria

| Criterion | How to verify |
|---|---|
| SC-001: CRUD via Claude in <30s | Step 4 (list) + create/delete a workflow via Claude chat |
| SC-002: Trigger within 2 seconds | Step 7: check execution timestamp vs user message time |
| SC-003: Graceful degradation | Step 8: log entry present, chat unaffected |
| SC-004: Execution history via Claude | Step 9: 10 executions returned in one request |
| SC-005: No secrets in codebase | Confirm `N8N_WEBHOOK_CAR_SEARCH_URL` is only in `.env.local` (gitignored) |

---

## Teardown

To stop n8n without losing workflow data:
```bash
docker compose stop
```

To destroy n8n and all data (workflows, credentials, execution history):
```bash
docker compose down -v
```
