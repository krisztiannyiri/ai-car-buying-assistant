# AI Car Buying Assistant

Wizard-driven car search: answer 4 lifestyle questions → Claude + MCP validation → n8n filtering → results in chat.

## Quick start

**Prerequisites**: Node.js 18+, Docker, `.env.local` with `ANTHROPIC_API_KEY` + 4 other vars (see Setup)

```bash
docker compose up -d       # n8n on 5678
npm run dev:mcp           # MCP on 3001
npm run dev               # Next.js on 3000
```

Open `http://localhost:3000`.

---

## Setup

### .env.local

```
ANTHROPIC_API_KEY=sk-...
MCP_SERVER_URL=http://localhost:3001/mcp
MCP_SERVER_PORT=3001
N8N_WEBHOOK_CAR_SEARCH_URL=http://n8n:5678/webhook/car-search
N8N_WEBHOOK_AUTH_TOKEN=              # optional
```

**Docker note**: `N8N_WEBHOOK_CAR_SEARCH_URL` uses service hostname `http://n8n:5678/...`, not `localhost`.

### First time

1. `npm run typecheck && npm run build` — validate
2. `docker compose up -d` — start n8n + gated MCP
3. `npm run dev:mcp` — start MCP (or use container)
4. `npm run dev` — start Next.js
5. Import n8n workflow (see `n8n/README.md`)
6. Add SMTP credential in n8n UI (see `n8n/README.md`)
7. Seed data store (see `n8n/README.md`)

---

## Processes

| Process | Port | Start |
|---|---|---|
| Next.js | 3000 | `npm run dev` |
| MCP | 3001 | `npm run dev:mcp` |
| n8n | 5678 | `docker compose up` |

---

## Test checklist

1. **Happy path**:
   - Complete wizard steps 1–4
   - Inspect `/api/chat` response as raw text: prose → `__SEARCH_STARTED__` → `__WEBHOOK_EVENT__` + JSON
   - Confirm up to 5 result cards appear
   - Send refinement ("only hybrids") → results update

2. **Failure modes**:
   - Stop MCP, search → expect HTTP 502
   - Stop n8n, search → expect `N8N_UNREACHABLE` + retry button
   - Ask for invalid body type (convertible) → expect `VALIDATION_ERROR` with allowed values
   - Bad `ANTHROPIC_API_KEY` → expect HTTP 200 with `status: 'failed'` in body

3. **Responsive**:
   - At 320px, 768px, 1280px: no horizontal scroll, sidebar switches below `lg`, touch targets ≥44px
   - 404 page styled

---

## Structure

```
app/                          Next.js routes
├─ page.tsx                   shell
└─ api/chat/route.ts          Anthropic + sentinels

components/
├─ CarBuyingAssistant.tsx     layout
├─ ChatPanel.tsx              chat drawer
├─ Results.tsx                cards
├─ wizard/                    4 steps
└─ layout/                    sidebar + mobile nav

hooks/
├─ useWizardFlow.ts           step state
└─ useConversation.ts         streaming + sentinels

mcp-server/
├─ index.ts                   HTTP server
└─ tools/search-cars.ts       validation + n8n call

n8n/
├─ car-search-workflow.json   exported workflow
└─ README.md                  setup (SMTP, Data Store)

lib/
├─ mcp/client.ts              MCP schema + tool calls
├─ types/                     shared TypeScript
├─ wizard/config.ts           copy + options
└─ constants/sentinels.ts     magic strings

docker-compose.yml            n8n + MCP containers
```

---

## Development

**Build**: `npm run typecheck`, `npm run build`

**Watch**: `npm run dev` and `npm run dev:mcp` both watch and restart

**No tests** — quality via code review + manual verification (see constitution)

**Code style**: Prettier, TypeScript, self-explanatory names, no commented code

---

## Troubleshooting

| Error | Fix |
|---|---|
| Could not reach MCP | Check `MCP_SERVER_URL` in `.env.local`; `curl localhost:3001/mcp` should return 400 |
| N8N_UNREACHABLE | Check `N8N_WEBHOOK_CAR_SEARCH_URL`; in Docker use `http://n8n:5678/...` |
| No email received | SMTP credential missing in n8n UI — see `n8n/README.md` |
| Empty results | Check `car_listings` Data Store has seed rows; see `n8n/README.md` |

---

## Stack

Next.js 16, React 19, TypeScript, Tailwind v4, Framer Motion | Node.js, MCP SDK, Anthropic SDK | n8n (self-hosted Docker) | n8n Data Store (no external DB)
