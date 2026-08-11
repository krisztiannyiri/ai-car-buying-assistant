# Data Model: MCP Vehicle Search Layer

**Feature**: 009-mcp-vehicle-search | **Date**: 2026-08-11

## Overview

The MCP server introduces two new type boundaries in the system:

1. **Inbound** — the `search_cars` tool input (what Claude sends to the MCP server)
2. **Outbound** — the normalized response envelope (what the MCP server returns to the agent)

All other types (`CarSearchPayload`, `SearchResultItem`) remain unchanged and continue to describe the n8n wire format.

---

## Entity: SearchFilters

The validated input accepted by the `search_cars` MCP tool. All fields are optional except where noted.

| Field | Type | Constraints | Maps to `CarSearchPayload` |
| --- | --- | --- | --- |
| `budgetMax` | `number \| null` | If present: must be > 0 | `budgetMax` |
| `bodyTypes` | `string[]` | Each value in: `["hatchback","saloon","estate","suv","crossover","mpv","coupe","convertible","any"]`; empty array = no constraint | `bodyTypes` |
| `fuelTypes` | `string[]` | Each value in: `["petrol","diesel","hybrid","mild-hybrid","plugin-hybrid","electric","any"]`; empty array = no constraint | `fuelTypes` |
| `transmission` | `"manual" \| "automatic" \| "any"` | Required | `transmission` |
| `minSeats` | `number \| null` | If present: integer ≥ 1 | `minSeats` |
| `features` | `FeatureEntry[]` | Each entry: `{ name: string (non-empty), mandatory: boolean }` | `features` |
| `yearMin` | `number \| null` | If present: integer in [1900, currentYear]; if both yearMin and yearMax present: yearMin ≤ yearMax | `yearMin` |
| `yearMax` | `number \| null` | If present: integer in [1900, currentYear + 1] | `yearMax` |
| `engineDisplacements` | `string[]` | Each value in: `["1.0","1.2","1.4","1.5","1.6","1.8","2.0","2.5","3.0","any"]`; empty array = no constraint | `engineDisplacements` |
| `usageContext` | `"commute" \| "family" \| "offroad" \| "performance" \| "any"` | Required | `usageContext` |
| `annualMileage` | `string \| null` | If present: non-empty string | `annualMileage` |
| `endTrigger` | `"explicit" \| "implicit" \| "length-limit" \| "refinement" \| "unknown"` | Required | `endTrigger` |

**Note**: `isRefinement` and `userEmail` are conversation-context fields injected by the Next.js route handler, not part of `SearchFilters`. They are added by the route handler when assembling the final `CarSearchPayload` before calling the MCP server.

### FeatureEntry

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | `string` | Non-empty |
| `mandatory` | `boolean` | Required |

---

## Entity: VehicleResult

The normalized output record for a single matched vehicle. Fields are passed through from `SearchResultItem` returned by n8n, with normalization applied.

| Field | Type | Normalization rule |
| --- | --- | --- |
| `id` | `string` | Passed through from n8n's identifier field (see Note below) |
| `make` | `string` | Passed through unchanged |
| `model` | `string` | Passed through unchanged |
| `bodyType` | `string \| null` | Passed through; null if absent in n8n response |
| `year` | `number` | Passed through unchanged |
| `price` | `number \| null` | Passed through; null if absent |
| `sourceUrl` | `string \| null` | Passed through; null if absent |

**Note on `id`**: The current `SearchResultItem` from n8n does not include an explicit `id` field. Until n8n returns one, `id` is synthesized as `"{make}-{model}-{year}"` (a stable-within-response discriminator). When n8n adds an explicit identifier field, the normalization rule switches to pass-through. This is documented so the switch requires a one-line change in `search-cars.ts`.

---

## Entity: NormalizedResponse (success)

The envelope returned by the MCP server to the agent on a successful search.

| Field | Type | Notes |
| --- | --- | --- |
| `results` | `VehicleResult[]` | Empty array if n8n returns no matches |
| `totalCount` | `number` | Passed through from n8n's `totalCount`; 0 if absent |

---

## Entity: ErrorEnvelope

The envelope returned by the MCP server to the agent on any failure.

| Field | Type | Notes |
| --- | --- | --- |
| `code` | `string` | Machine-readable error type (see Error Codes below) |
| `message` | `string` | Human-readable description |
| `details` | `string[]` | List of affected fields (validation errors) or contextual info (communication errors) |

### Error Codes

| Code | Trigger |
| --- | --- |
| `VALIDATION_ERROR` | One or more `SearchFilters` fields fail validation |
| `N8N_UNREACHABLE` | n8n webhook endpoint could not be reached (network error) |
| `N8N_ERROR` | n8n webhook returned a non-2xx HTTP status |
| `TIMEOUT` | n8n did not respond within 5 seconds |
| `SCHEMA_MISMATCH` | n8n response did not match the expected `SearchResultItem[]` shape |

---

## Entity: CarSearchPayload (existing — unchanged)

Defined in `lib/types/n8n.ts`. Remains the wire format sent to n8n. The MCP server constructs a `CarSearchPayload` from validated `SearchFilters` + injected metadata (`isRefinement`, `userEmail`) before forwarding to n8n.

---

## State Transitions

The MCP server is stateless. Each `search_cars` invocation follows a single linear path:

```
Receive SearchFilters
  → Validate (error: VALIDATION_ERROR)
  → Build CarSearchPayload
  → POST to n8n webhook (error: N8N_UNREACHABLE | N8N_ERROR | TIMEOUT)
  → Parse n8n response (error: SCHEMA_MISMATCH → log + partial normalize)
  → Return NormalizedResponse
```

There are no retries inside the MCP server (the existing `fireWebhookWithRetry` retry logic is not reproduced; the route handler may implement retry at a higher level if needed).
