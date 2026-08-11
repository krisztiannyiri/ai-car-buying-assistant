# Contract: `search_cars` MCP Tool

**Feature**: 009-mcp-vehicle-search | **Date**: 2026-08-11

## Overview

`search_cars` is the single MCP tool exposed by the vehicle search MCP server. It is the sole interface through which the agent triggers vehicle searches. All validation, n8n forwarding, and result normalization happen inside the MCP server; the caller receives only a normalized response or a structured error.

---

## Tool Definition (as registered with the MCP server)

**Name**: `search_cars`

**Description**: Search the vehicle database using structured filters derived from the user's conversation. All fields are optional; omitting all fields returns all available vehicles. Call this tool when the conversation is complete and you have gathered sufficient lifestyle information to construct a meaningful search.

---

## Input Schema

```json
{
  "type": "object",
  "required": ["transmission", "usageContext", "endTrigger"],
  "properties": {
    "budgetMax":           { "type": ["number", "null"], "description": "Maximum budget in euros, or null if not discussed" },
    "bodyTypes":           { "type": "array", "items": { "type": "string" }, "description": "e.g. [\"suv\", \"hatchback\"] or [] for no constraint" },
    "fuelTypes":           { "type": "array", "items": { "type": "string" }, "description": "e.g. [\"electric\"] or [\"any\"]" },
    "transmission":        { "type": "string", "enum": ["manual", "automatic", "any"] },
    "minSeats":            { "type": ["number", "null"], "description": "Minimum number of seats, or null" },
    "features":            {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "mandatory"],
        "properties": {
          "name":      { "type": "string" },
          "mandatory": { "type": "boolean" }
        }
      },
      "description": "Features the user mentioned; empty array if none"
    },
    "yearMin":             { "type": ["number", "null"], "description": "Minimum model year, or null" },
    "yearMax":             { "type": ["number", "null"], "description": "Maximum model year, or null" },
    "engineDisplacements": { "type": "array", "items": { "type": "string" }, "description": "e.g. [\"1.5\", \"2.0\"] or [\"any\"]" },
    "usageContext":        { "type": "string", "enum": ["commute", "family", "offroad", "performance", "any"] },
    "annualMileage":       { "type": ["string", "null"], "description": "e.g. \"10000-15000\" or null" },
    "endTrigger":          { "type": "string", "enum": ["explicit", "implicit", "length-limit", "refinement", "unknown"] }
  }
}
```

**Validation rules** enforced by the MCP server (in addition to schema types):

| Field | Rule |
| --- | --- |
| `budgetMax` | If present and not null: must be > 0 |
| `bodyTypes` | Each element must be one of the known body type values (see data-model.md) |
| `fuelTypes` | Each element must be one of the known fuel type values |
| `yearMin`, `yearMax` | If present: integer in [1900, currentYear+1]; if both present: yearMin ≤ yearMax |
| `minSeats` | If present: integer ≥ 1 |
| `features[].name` | Must be non-empty string |
| `engineDisplacements` | Each element must be one of the known displacement values |

---

## Output Schema — Success

```json
{
  "results": [
    {
      "id":        "string",
      "make":      "string",
      "model":     "string",
      "bodyType":  "string | null",
      "year":      "number",
      "price":     "number | null",
      "sourceUrl": "string | null"
    }
  ],
  "totalCount": "number"
}
```

- `results` is an empty array when n8n returns no matching vehicles (not an error).
- `totalCount` mirrors n8n's reported total; may differ from `results.length` in paginated future implementations.

---

## Output Schema — Error

```json
{
  "code":    "string",
  "message": "string",
  "details": ["string"]
}
```

| `code` value | When returned |
| --- | --- |
| `VALIDATION_ERROR` | Input parameters fail validation |
| `N8N_UNREACHABLE` | Network error reaching n8n webhook |
| `N8N_ERROR` | n8n returns non-2xx HTTP status |
| `TIMEOUT` | n8n does not respond within 5 seconds |
| `SCHEMA_MISMATCH` | n8n response does not match expected shape; partial normalized result returned alongside warning |

**Note on `SCHEMA_MISMATCH`**: Unlike other error codes, `SCHEMA_MISMATCH` does not prevent a response — the MCP server logs a warning, normalizes what it can, and returns a success envelope with the partial results. The `SCHEMA_MISMATCH` code only appears in a standalone error envelope when normalization produces zero usable results.

---

## MCP Server Endpoint

**Transport**: Streamable HTTP (MCP protocol over HTTP POST/SSE)

**Port**: Configured via `MCP_SERVER_PORT` environment variable (default: `3001`)

**URL pattern** (for MCP client configuration): `http://localhost:{MCP_SERVER_PORT}/mcp`

---

## Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MCP_SERVER_PORT` | No | `3001` | Port the MCP server listens on |
| `N8N_WEBHOOK_CAR_SEARCH_URL` | Yes | — | Full URL of the n8n car search webhook |
| `N8N_WEBHOOK_AUTH_TOKEN` | No | — | Optional bearer token injected into n8n requests (FR-011) |
| `MCP_SERVER_URL` | Yes (Next.js) | — | URL the Next.js MCP client uses to reach the MCP server (e.g. `http://localhost:3001/mcp`) |

---

## Claude Tool Definition (as used in `app/api/chat/route.ts`)

The `search_cars` tool definition passed to the Anthropic SDK mirrors the MCP tool's input schema above. The route handler executes the tool by calling the MCP server via the MCP client and returning the result as the tool_use result to Claude.

**Tool name**: `search_cars`

**Description** (for Claude): Same as the MCP tool description above.
