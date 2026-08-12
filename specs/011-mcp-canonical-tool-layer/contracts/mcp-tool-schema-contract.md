# Contract: MCP Tool Schema (Chat Route Consumer)

## Overview

The chat route consumes tool schemas from the MCP server at request time. This contract describes what the route expects from the `listTools()` response and what it guarantees to produce for the Anthropic API.

## Input Contract: MCP `listTools()` response

The route calls `client.listTools()` and expects at minimum one tool named `search_cars`.

**Each tool in the response must have**:

| Field | Type | Required |
|---|---|---|
| `name` | `string` | Yes |
| `description` | `string` | No (omitted if missing) |
| `inputSchema` | `{ type: "object", properties?: Record<string, object>, required?: string[] }` | Yes |

**Guaranteed tool present**: `search_cars`

If `listTools()` returns zero tools, or throws, the route fails the request with a connection error. No stale fallback.

## Output Contract: Anthropic API `tools` array

Each fetched MCP tool is converted and passed to the Anthropic API call as:

```json
{
  "name": "<tool.name>",
  "description": "<tool.description>",
  "input_schema": {
    "type": "object",
    "properties": { ... },
    "required": [ ... ]
  }
}
```

The only transformation is the key rename `inputSchema` → `input_schema`. All nested values are passed through unchanged.

## `search_cars` tool schema (canonical — defined in MCP server)

Fields visible to Claude (post-refactor):

| Parameter | Type | Required by Claude | Notes |
|---|---|---|---|
| `budgetMax` | `number \| null` | Yes | Max budget in euros |
| `bodyTypes` | `string[]` | Yes | e.g. `["suv", "hatchback"]` or `["any"]` |
| `fuelTypes` | `string[]` | Yes | e.g. `["electric"]` or `["any"]` |
| `transmission` | `"manual" \| "automatic" \| "any"` | Yes | |
| `minSeats` | `number \| null` | Yes | |
| `features` | `Array<{name: string, mandatory: boolean}>` | Yes | |
| `yearMin` | `number \| null` | Yes | |
| `yearMax` | `number \| null` | Yes | |
| `engineDisplacements` | `string[]` | Yes | |
| `usageContext` | `"commute" \| "family" \| "offroad" \| "performance" \| "any"` | Yes | |
| `annualMileage` | `string \| null` | Yes | |
| `endTrigger` | `"explicit" \| "implicit" \| "length-limit" \| "refinement" \| "unknown"` | Yes | |

Fields injected by the route (NOT in schema shown to Claude):

| Parameter | Type | Who sets it |
|---|---|---|
| `isRefinement` | `boolean` | Route — read from request body |
| `userEmail` | `string \| null` | Route — read from request body |

## Frontend Event Contract (unchanged)

The route emits the same stream events as before:

| Event token | When emitted | Payload |
|---|---|---|
| `\n\n__SEARCH_STARTED__` | When `tool_use` block completes in stream | None |
| `\n\n__WEBHOOK_EVENT__{json}` | After MCP tool execution completes | `WebhookEvent` JSON |

`WebhookEvent` shape (unchanged from `lib/types/n8n.ts`):

```typescript
{
  status: 'success' | 'failed';
  endTrigger: string;
  results?: SearchResultItem[];      // present on success
  totalCount?: number;               // present on success
  errorMessage?: string;             // present on failure
  retryPayload?: CarSearchPayload;   // present on failure
}
```
