# Data Model: MCP as Canonical Tool Layer

This feature introduces no new persistent entities or database schema changes. It restructures how the in-memory tool definition flows between components at request time.

## Data Flow (before → after)

### Before

```
route.ts
  │
  ├── searchCarsTool: Anthropic.Tool   ← hardcoded constant (DUPLICATE of MCP schema)
  │
  └── POST /api/chat
        ├── build system prompt
        ├── call Anthropic API { tools: [searchCarsTool] }
        │     stream → detect tool_use
        ├── inject isRefinement + userEmail
        └── call callSearchCars() → MCP server → n8n
```

### After

```
route.ts
  │
  └── POST /api/chat
        ├── build system prompt
        ├── fetchMcpToolSchemas() → MCP server listTools() → Anthropic.Tool[]
        ├── call Anthropic API { tools: fetchedSchemas }
        │     stream → detect tool_use
        ├── inject isRefinement + userEmail
        └── call callSearchCars() → MCP server → n8n
```

## Schema Conversion

`listTools()` returns MCP-format tools; the Anthropic API requires a renamed key.

| MCP Tool field | Anthropic Tool field | Notes |
|---|---|---|
| `name` | `name` | Unchanged |
| `description` | `description` | Unchanged |
| `inputSchema` | `input_schema` | Key rename only; value shape is identical |

**Conversion function signature** (in `lib/mcp/client.ts`):

```
fetchMcpToolSchemas(): Promise<Anthropic.Tool[]>
```

- Opens a new MCP `Client` connection per call
- Calls `client.listTools()`
- Maps each tool: `{ name, description, input_schema: tool.inputSchema }`
- Closes connection in `finally`
- Throws on any connection or protocol error (route catches and maps to HTTP error)

## MCP Tool Schema Changes

### `search_cars` inputSchema — fields removed

| Field | Removed from inputSchema | Kept in executeSearchCars signature | Reason |
|---|---|---|---|
| `isRefinement` | Yes | Yes | Route-level context; injected after tool_use detected, not filled by Claude |
| `userEmail` | Yes | Yes | Route-level context; injected after tool_use detected, not filled by Claude |

All other fields (`budgetMax`, `bodyTypes`, `fuelTypes`, `transmission`, `minSeats`, `features`, `yearMin`, `yearMax`, `engineDisplacements`, `usageContext`, `annualMileage`, `endTrigger`) remain unchanged in the schema.

## Deleted Entities

| Entity | File | Reason |
|---|---|---|
| `list_body_types` tool | `mcp-server/tools/list-body-types.ts` | Never called from chat flow; returns a static list duplicated inside `search-cars.ts`; would appear in `listTools()` output and unnecessarily expand Claude's tool context |
| `registerListBodyTypesTool` call | `mcp-server/tools/registry.ts` | Registration removed along with the tool file |
