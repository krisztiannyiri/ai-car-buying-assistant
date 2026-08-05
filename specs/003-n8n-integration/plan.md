# Implementation Plan: n8n Workflow Automation Integration

**Branch**: `003-n8n-integration` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-n8n-integration/spec.md`

## Summary

Introduce a self-hosted n8n instance (Docker/SQLite) to the local development environment,
register n8n's built-in MCP server with Claude Code so developers can manage workflows via
tool calls, and add a fire-and-forget webhook trigger to the existing chat API route that
fires when a user sends a car search query. An illustrative n8n workflow (webhook → log
payload) proves the full trigger-to-execute chain. No new npm packages are added to the
Next.js app — the webhook trigger uses native `fetch`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 (via Next.js runtime)

**Primary Dependencies**: Next.js 16.3.0, React 19.2.8, @anthropic-ai/sdk ^0.115.0 — no new npm packages added

**Storage**: n8n uses SQLite via a named Docker volume (`n8n_data`) — the Next.js app has no persistent storage

**Testing**: None (constitution principle V)

**Target Platform**: Next.js 16 App Router, local development only

**Performance Goals**: Webhook trigger fires within 2 seconds of user message receipt (SC-002); trigger is non-blocking

**Constraints**: localhost-only n8n; no webhook auth; no new npm dependencies in the app; all credentials via env vars

**Scale/Scope**: Single local developer environment; illustrative single workflow

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Clean Code | PASS | Trigger logic extracted into `lib/n8n/trigger.ts`; no inline fetch in route handler |
| II. Simple UX | PASS | No user-facing UI changes in this feature |
| III. Responsive Design | PASS | No UI components introduced |
| IV. Minimal Dependencies | PASS | Zero new npm packages — native `fetch` for webhook; n8n in Docker (not in the app's dependency graph); MCP is a Claude Code config entry |
| V. No Automated Testing | PASS | No test files added |

**Post-Design Re-check**: All gates still pass. The `docker-compose.yml` adds a Docker service but no npm dependency. The MCP registration is a `.claude/settings.json` entry. The `lib/n8n/trigger.ts` module uses only built-in Node.js `fetch` and `fs/promises`.

**Complexity Tracking**: No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-n8n-integration/
├── plan.md              ✓ this file
├── research.md          ✓ Phase 0 output
├── data-model.md        ✓ Phase 1 output
├── quickstart.md        ✓ Phase 1 output
├── contracts/           ✓ Phase 1 output
│   └── webhook-car-search.md
└── tasks.md             (Phase 2 — /speckit-tasks)
```

### Source Code (repository root)

```text
docker-compose.yml            # new — n8n service (SQLite, port 5678)
.env.local                    # add N8N_WEBHOOK_CAR_SEARCH_URL
.gitignore                    # add n8n-trigger.log

lib/
├── n8n/
│   └── trigger.ts            # new — fireWebhook() utility
└── types/
    ├── chat.ts               # existing — unchanged
    └── n8n.ts                # new — WebhookPayload, TriggerLogEntry types

app/
└── api/
    └── chat/
        └── route.ts          # modify — fire webhook after extracting user query

.claude/
└── settings.json             # modify — add n8n MCP server entry
```

**Structure Decision**: Single Next.js project (Option 1). n8n trigger utility lives under
`lib/n8n/` alongside the existing `lib/types/` pattern. Docker Compose lives at the repo
root alongside the app. No new top-level directories beyond `lib/n8n/`.
