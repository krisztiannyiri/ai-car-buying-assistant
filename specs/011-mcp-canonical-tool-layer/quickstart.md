# Quickstart Validation Guide: MCP as Canonical Tool Layer

## Prerequisites

- MCP server running: `npm run dev:mcp` (starts on `http://localhost:3001/mcp` by default)
- Next.js dev server running: `npm run dev`
- `.env.local` configured with `MCP_SERVER_URL`, `ANTHROPIC_API_KEY`, `N8N_WEBHOOK_CAR_SEARCH_URL`

## Validation Scenarios

### 1. Schema fetch works (MCP is the source)

**Goal**: Confirm the route fetches `search_cars` schema from MCP instead of using an inline definition.

**Steps**:
1. Start both servers.
2. Open browser devtools → Network tab.
3. Submit any car search query in the chat.
4. Observe: no JavaScript bundle or route file should contain a `searchCarsTool` object (verify with `grep -r "searchCarsTool" app/` → zero matches).
5. In the MCP server logs, look for `[mcp] → tools/list` before the `[mcp] → tools/call (search_cars)` line.

**Expected**: Two MCP server log lines per search request — first `tools/list`, then `tools/call (search_cars)`.

---

### 2. End-to-end search returns results

**Goal**: Confirm vehicle results still reach the frontend after the refactor.

**Steps**:
1. Type: "Show me a family SUV under €30,000"
2. Wait for results panel to appear.

**Expected**: Results cards displayed; no errors in browser console; `__WEBHOOK_EVENT__` event contains `status: "success"` with `results` array.

---

### 3. Refinement search works

**Goal**: Confirm `isRefinement: true` is correctly injected even though it is not in the schema Claude sees.

**Steps**:
1. Complete an initial search.
2. Type: "Only hybrids please"
3. Observe MCP server logs.

**Expected**: `[search_cars]` log line shows `refinement` tag; results update to hybrid-only vehicles.

---

### 4. MCP server unavailable at schema-fetch time

**Goal**: Confirm fail-fast behaviour — route returns an error, not a broken search.

**Steps**:
1. Stop the MCP server (`Ctrl+C` on `dev:mcp`).
2. Submit a search query.

**Expected**: Chat displays an error message (connection error); browser network tab shows a non-200 response from `/api/chat`; no silent failure or empty results.

---

### 5. Schema deduplication confirmed

**Goal**: Confirm no copy of the tool schema exists in the route.

**Steps** (static check):
```bash
grep -n "search_cars\|searchCarsTool\|SearchCarsInput\|input_schema" app/api/chat/route.ts
```

**Expected**: Zero matches for `searchCarsTool`, `SearchCarsInput`, `input_schema`. The string `search_cars` may appear only in a `tool_use` handler check (`toolUseName === 'search_cars'`).

---

### 6. `list_body_types` removed

**Goal**: Confirm the unused tool no longer exists in the MCP registry.

**Steps**:
```bash
# These should all return zero matches:
grep -r "list_body_types\|registerListBodyTypesTool" mcp-server/
ls mcp-server/tools/
```

**Expected**: No references to `list_body_types`; `ls` shows only `search-cars.ts` and `registry.ts`.
