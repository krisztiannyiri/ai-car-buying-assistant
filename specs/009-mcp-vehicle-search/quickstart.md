# Quickstart & Validation Guide: MCP Vehicle Search Layer

**Feature**: 009-mcp-vehicle-search | **Date**: 2026-08-11

## Prerequisites

- Node.js 20+ and npm installed
- n8n running locally (existing setup)
- `N8N_WEBHOOK_CAR_SEARCH_URL` set in `.env.local`
- `ANTHROPIC_API_KEY` set in `.env.local`

## Setup

1. Install new dependency:
   ```bash
   npm install @modelcontextprotocol/sdk
   ```

2. Start the MCP server (separate terminal):
   ```bash
   npm run dev:mcp
   ```
   Expected output: `MCP vehicle search server listening on http://localhost:3001/mcp`

3. Start the Next.js app (separate terminal):
   ```bash
   npm run dev
   ```

4. Confirm both processes are running before proceeding.

---

## Validation Scenarios

### SC-001 — All vehicle search requests route through the MCP server

**How to verify**:
1. Open the chat interface in a browser.
2. Complete a car-buying conversation until the agent calls `search_cars`.
3. Observe MCP server terminal — it must log no entry for successful requests (FR-012), confirming it received and processed the call.
4. Observe n8n execution log — the webhook execution must show the MCP server's IP/loopback as the caller (not the Next.js app directly).
5. Verify no direct call to `N8N_WEBHOOK_CAR_SEARCH_URL` exists in `app/api/chat/route.ts` (code inspection).

**Expected outcome**: Results appear in the chat UI; n8n log shows one execution triggered by the MCP server.

---

### SC-002 — Invalid parameters rejected before reaching n8n

**How to verify** (manual MCP client call):

Send a malformed `search_cars` call with `budgetMax: -500` to the MCP server. This can be done by temporarily calling the MCP client from a test script or by modifying the route handler to inject a bad payload during a local dev session.

```
Expected MCP server response:
{
  "code": "VALIDATION_ERROR",
  "message": "Search parameter validation failed",
  "details": ["budgetMax must be greater than 0"]
}
```

Confirm n8n execution log shows **no new execution** triggered during this test.

---

### SC-002 (Year range) — yearMin > yearMax rejected

Send `yearMin: 2022, yearMax: 2018`.

```
Expected:
{
  "code": "VALIDATION_ERROR",
  "message": "Search parameter validation failed",
  "details": ["yearMin (2022) must not exceed yearMax (2018)"]
}
```

---

### SC-003 — Consistent response format regardless of outcome

Run three scenarios and confirm the agent receives a well-formed response in each case:

| Scenario | How to trigger | Expected agent behavior |
| --- | --- | --- |
| Results found | Normal conversation with a common filter | Agent presents vehicle list |
| No results | Set a very restrictive filter (e.g., budgetMax: 1) | Agent presents "no matches found" message |
| n8n timeout | Stop n8n, attempt a search | Agent presents an error message (not a crash) |

---

### SC-004 — New tool addition does not require agent reconfiguration

**How to verify**:
1. Register a stub second tool (e.g., `list_body_types`) on the MCP server that returns a static list.
2. Restart only the MCP server (not the Next.js app).
3. Call the MCP server's tool list endpoint — both `search_cars` and `list_body_types` must appear.
4. Confirm `search_cars` still works correctly (run SC-001 scenario).
5. Confirm the Next.js `app/api/chat/route.ts` required no changes.

---

### SC-005 — Response time parity with previous direct path

**How to verify**:
1. Note approximate response time for a vehicle search in the current branch (before this feature).
2. Run the same search scenario after this feature is implemented.
3. Compare end-to-end time (user sends message → results appear in UI).

**Expected outcome**: Time difference is imperceptible (MCP overhead ≤ 100ms per research.md).

---

### FR-012 — Logging behavior

Start the MCP server and verify the following:

| Action | Expected MCP server log output |
| --- | --- |
| Successful search (results returned) | No log output |
| Validation failure | Log entry identifying invalid field(s) |
| n8n unreachable | Log entry with `N8N_UNREACHABLE` and error detail |
| Timeout | Log entry with `TIMEOUT` |
| Schema mismatch from n8n | Log warning with field names that were missing/unexpected |

---

### FR-011 — Optional auth credential injection

1. Set `N8N_WEBHOOK_AUTH_TOKEN=test-token` in `.env.local`.
2. Run a vehicle search.
3. In n8n's execution details, verify the incoming request includes `Authorization: Bearer test-token`.
4. Remove `N8N_WEBHOOK_AUTH_TOKEN` from `.env.local`.
5. Run another search — verify it succeeds without an `Authorization` header.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| MCP server not starting | Port 3001 in use | Set `MCP_SERVER_PORT=3002` in `.env.local` and update `MCP_SERVER_URL` accordingly |
| Agent returns no results unexpectedly | n8n not running | Start n8n and verify `N8N_WEBHOOK_CAR_SEARCH_URL` is correct |
| `TIMEOUT` errors in MCP server log | n8n slow to start | Wait for n8n workflow to fully activate before testing |
| Agent sends searches directly to n8n | Old code path not removed | Verify `app/api/chat/route.ts` calls MCP client, not `fireWebhookWithRetry` |
