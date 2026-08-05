# Research: n8n Workflow Automation Integration

**Date**: 2026-08-04 | **Branch**: `003-n8n-integration`

---

## Decision 1: n8n MCP Server Mechanism

**Decision**: Use n8n's built-in instance-level MCP HTTP server (introduced in n8n v2.18.4),
registered in Claude Code via HTTP transport. No separate npm package needed.

**Rationale**: The n8n instance exposes a built-in MCP endpoint at
`http://localhost:5678/mcp-server/http`. Claude Code supports HTTP transport natively
(`claude mcp add --transport http`), so no `npx` proxy or `mcp-remote` bridge is required.
This is the recommended path for Claude Code specifically.

**Registration command**:
```bash
claude mcp add --transport http n8n-mcp http://localhost:5678/mcp-server/http \
  --header "Authorization: Bearer <N8N_MCP_TOKEN>"
```

**`.claude/settings.json` entry**:
```json
{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "http://localhost:5678/mcp-server/http",
      "headers": {
        "Authorization": "Bearer <N8N_MCP_TOKEN>"
      }
    }
  }
}
```

**Alternatives considered**:
- `mcp-remote` stdio bridge — only needed for Claude Desktop (stdio-only clients); not applicable here
- Per-workflow MCP Server Trigger node — exposes a specific workflow's tools, not general
  workflow management; out of scope for this feature

**Source**: https://docs.n8n.io/connect/connect-to-n8n-mcp-server.md

---

## Decision 2: n8n Docker Compose Setup

**Decision**: Single-service SQLite Docker Compose at the repo root. No external database.

**Rationale**: SQLite is the default n8n storage backend and sufficient for a single local
developer. Adding PostgreSQL doubles the service count and adds a `healthcheck`/init-script
dependency with no benefit at this scope.

**docker-compose.yml**:
```yaml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=UTC
      - TZ=UTC
      - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

**Key details**:
- Image registry: `docker.n8n.io/n8nio/n8n` (not Docker Hub)
- Data directory inside container: `/home/node/.n8n` (SQLite DB, credentials, encryption key)
- UI accessible at: `http://localhost:5678`

**Alternatives considered**:
- PostgreSQL setup — adds complexity (init scripts, healthcheck, separate runner service);
  not justified for a local-only single-developer environment

**Source**: https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker.md

---

## Decision 3: Webhook Trigger Pattern in Next.js

**Decision**: Fire-and-forget native `fetch` call inside the chat API route, with errors
caught and appended to `n8n-trigger.log` via `fs/promises.appendFile`.

**Rationale**:
- Native `fetch` is available in Node.js 18+ and in the Next.js runtime — zero new dependencies
- Fire-and-forget (no `await`) means the AI streaming response is never delayed (FR-005)
- Error logging to a dedicated file satisfies FR-006 without adding a logging library

**Pattern**:
```typescript
// lib/n8n/trigger.ts
export function fireWebhook(url: string, payload: WebhookPayload): void {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    appendToLog(err); // fs/promises.appendFile — no await needed
  });
}
```

**Unhandled rejection safety**: The `.catch()` on the fetch promise prevents an unhandled
promise rejection. The inner `appendFile` error (e.g., disk full) is a best-effort
secondary failure and does not need further handling.

**Alternatives considered**:
- `await` the fetch inside the route — blocks the streaming response; violates FR-005
- Message queue (Redis, BullMQ) — adds infrastructure and dependencies; unjustified for one
  fire-and-forget call

---

## Decision 4: n8n REST API Authentication

**Decision**: Use `X-N8N-API-KEY` header with an API key generated from Settings > n8n API.

**Generation steps** (one-time setup):
1. Open `http://localhost:5678` → log in
2. Navigate to **Settings > n8n API**
3. Click **Create an API key**, set a label (e.g., `claude-mcp`)
4. Copy the key — shown only once

**Header for REST API calls (used by the MCP server internally)**:
```
X-N8N-API-KEY: <your-api-key>
```

**Note on MCP Bearer token**: The MCP server HTTP endpoint uses `Authorization: Bearer`
format. The Bearer token may be the same API key or a separate MCP credential generated
in n8n. Verify during setup: try the API key first; if rejected, check n8n docs for
a separate MCP token generation step.

**Source**: https://docs.n8n.io/connect/n8n-api/authentication.md

---

## Decision 5: n8n Webhook URL Format

**Decision**: Use production webhook URLs (`/webhook/{path}`) for the illustrative workflow.

| Mode | URL pattern | When active |
|---|---|---|
| Test | `http://localhost:5678/webhook-test/{path}` | When clicking "Listen for Test Event" in editor |
| Production | `http://localhost:5678/webhook/{path}` | When workflow is activated/published |

**For the car-search workflow**:
- Set a static, human-readable path in the Webhook node (e.g., `car-search`)
- Production URL: `http://localhost:5678/webhook/car-search`
- This URL is stored in `.env.local` as `N8N_WEBHOOK_CAR_SEARCH_URL`

**Alternatives considered**:
- Auto-generated UUID path — works but is not human-readable and harder to document
- Test URL in production code — only active during editor session; unreliable for the app

**Source**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook.md
