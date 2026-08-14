# Feature Specification: MCP Vehicle Search Layer

**Feature Branch**: `009-mcp-vehicle-search`

**Created**: 2026-08-11

**Status**: Implemented

**Input**: User description: "I want to add a custom MCP server as the structured vehicle search layer between the agent and n8n. Route all vehicle search requests from the agent through the MCP server instead of calling n8n directly. I imagine the flow as: agent → MCP → n8n → MCP → agent. Expose a search_cars(filters) MCP tool that the agent can call for structured vehicle search, ensure the MCP server is designed to support additional future tools. Validate incoming search parameters in the MCP server before forwarding requests to n8n. Forward validated search requests from the MCP server to the local n8n workflow via webhook. Keep n8n responsible for querying the mock database and applying search and filtering logic. Return n8n results to the MCP server and normalize them into a consistent response format for the agent."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Structured Vehicle Search via MCP (Priority: P1)

A car buyer describes what they are looking for in the chat interface. The AI agent translates the buyer's natural-language request into a structured set of search filters and invokes the MCP `search_cars` tool. The MCP server validates the filters, forwards them to the n8n workflow via webhook, receives the results, and returns a normalized list of matching vehicles back to the agent. The agent then presents the results to the buyer in a readable format.

**Why this priority**: This is the core data flow change. Every vehicle search in the system must pass through the MCP layer once this feature is live. Without it, the entire feature has no value.

**Independent Test**: Can be fully tested by sending a well-formed search request through the chat interface and verifying that matching vehicles are returned to the user. Delivers the primary end-to-end value: buyer → agent → MCP → n8n → MCP → agent → buyer.

**Acceptance Scenarios**:

1. **Given** a buyer asks "Show me SUVs under $30,000 with low mileage", **When** the agent invokes `search_cars` with the extracted filters, **Then** the MCP server forwards the request to n8n, receives matching vehicles, and returns a consistent normalized list to the agent.
2. **Given** the agent invokes `search_cars` with valid but empty filters (no constraints), **When** n8n returns all available vehicles, **Then** the MCP server normalizes and returns the full vehicle list.
3. **Given** n8n returns zero matching vehicles, **When** the MCP server receives the empty result, **Then** the agent receives an empty list with a clear indication that no results were found (not an error).

---

### User Story 2 - Invalid Search Parameters Rejected at the MCP Layer (Priority: P2)

A developer or an agent call attempts to invoke `search_cars` with parameters that do not conform to the defined filter contract (e.g., a negative price, an unrecognized field, an out-of-range year). The MCP server rejects the request before it reaches n8n and returns a clear, structured error describing what is invalid.

**Why this priority**: Validation at the MCP boundary prevents malformed data from polluting n8n and the mock database. It also gives the agent and future callers immediate, actionable feedback without relying on n8n error handling for input mistakes.

**Independent Test**: Can be fully tested by sending malformed `search_cars` invocations directly to the MCP server and verifying that each returns a descriptive validation error without forwarding anything to n8n.

**Acceptance Scenarios**:

1. **Given** the agent sends a `search_cars` call with a price value below zero, **When** the MCP server validates the parameters, **Then** the call is rejected with a structured error identifying the invalid field, and n8n receives no request.
2. **Given** the agent sends a `search_cars` call with an unrecognized filter field, **When** the MCP server validates the parameters, **Then** the call is rejected with a structured error listing the unknown field.
3. **Given** the agent sends a `search_cars` call with a year range where the minimum year exceeds the maximum year, **When** the MCP server validates the parameters, **Then** the call is rejected with a clear explanation of the constraint violation.

---

### User Story 3 - MCP Server Supports Future Tool Additions (Priority: P3)

A developer adds a second MCP tool (e.g., `get_vehicle_details`) to the MCP server without modifying the `search_cars` tool or changing how the agent connects to the MCP server. The new tool follows the same registration and validation pattern as `search_cars`.

**Why this priority**: The requirement explicitly states the MCP server must be designed for future extensibility. A second tool proves the architecture is not hard-coded around the single `search_cars` function.

**Independent Test**: Can be fully tested by adding a stub second tool to the MCP server and verifying it is discoverable and callable by the agent independently of `search_cars`.

**Acceptance Scenarios**:

1. **Given** a second tool is registered on the MCP server, **When** the agent requests the list of available tools, **Then** both `search_cars` and the new tool appear in the tool manifest.
2. **Given** a second tool is registered, **When** the agent invokes it with valid parameters, **Then** it executes successfully without interfering with `search_cars`.

---

### Edge Cases

- What happens when the n8n webhook is unreachable or returns a non-success HTTP status? The MCP server must surface a structured error to the agent rather than crashing or returning raw HTTP error output.
- What happens when n8n returns a response that does not match the expected schema? The MCP server must handle partial or unexpected response shapes gracefully, emit a log warning identifying the mismatched fields, and return a normalized (possibly empty) result rather than propagating raw unexpected data.
- What happens when the agent sends a `search_cars` call with all optional fields omitted? The MCP server must treat this as a valid "no filters" search and forward it to n8n.
- What happens if n8n takes longer than expected to respond? The MCP server must respect a request timeout and return a structured timeout error to the agent.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST expose a `search_cars` MCP tool that accepts a structured set of vehicle filter parameters.
- **FR-002**: The MCP server MUST validate all incoming `search_cars` filter parameters before forwarding any request to n8n.
- **FR-003**: The MCP server MUST reject invalid requests with a structured error response containing: a machine-readable `code` identifying the error type, a human-readable `message`, and a `details` list identifying which parameters failed and why.
- **FR-004**: The MCP server MUST forward all validated `search_cars` requests to the existing local n8n workflow via its webhook endpoint.
- **FR-005**: The n8n workflow MUST remain solely responsible for querying the mock vehicle database and applying search and filtering logic; the MCP server MUST NOT duplicate this logic.
- **FR-006**: The MCP server MUST normalize all responses received from n8n into a consistent vehicle result format before returning them to the agent.
- **FR-007**: The agent MUST route all vehicle search requests through the MCP server and MUST NOT call n8n directly for vehicle searches.
- **FR-008**: The MCP server MUST be architected to support registering additional tools beyond `search_cars` without requiring changes to the server's core infrastructure or to existing tools.
- **FR-009**: The MCP server MUST handle n8n communication failures (unreachable endpoint, non-success response, timeout) and return a structured error to the agent.
- **FR-010**: The MCP server MUST enforce a 5-second request timeout when communicating with n8n; if n8n does not respond within 5 seconds, the MCP server MUST return a structured error with `code: TIMEOUT` to the agent.
- **FR-011**: The MCP server MUST support optional injection of an authentication credential (e.g., a shared secret or API key) for the n8n webhook via environment configuration; when no credential is configured, requests are forwarded without authentication.
- **FR-012**: The MCP server MUST emit a log entry for every validation failure (identifying the invalid parameters), every n8n communication error (including timeouts and non-success responses), and every schema mismatch in an n8n response (identifying which fields were missing or unexpected); successful requests with fully conformant responses MUST NOT produce log output.

### Key Entities

- **Search Filters**: The structured input to `search_cars`. Attributes include: make, model, year range (min/max), price range (min/max), maximum mileage, fuel type, transmission type, and body type. All attributes are optional; omitting all attributes means "no constraints."
- **Vehicle Result**: The normalized output record returned per matching vehicle. Attributes include: identifier (passed through unchanged from n8n; must uniquely identify the vehicle within the mock database, with no cross-request stability guarantee beyond what n8n provides), make, model, year, price, mileage, fuel type, transmission, body type, and availability status.
- **MCP Tool Manifest**: The set of tools the MCP server exposes to the agent, each with a name, description, and parameter schema.
- **Normalized Response**: The consistent envelope returned by the MCP server to the agent. On success: contains a list of Vehicle Results (empty if no matches). On error: contains a structured error with three fields — `code` (machine-readable error type, e.g., `VALIDATION_ERROR`, `N8N_UNREACHABLE`, `TIMEOUT`), `message` (human-readable description), and `details` (list of affected fields or contextual information about the failure).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of vehicle search requests initiated through the chat interface are routed through the MCP server; zero direct agent-to-n8n search calls exist in the codebase.
- **SC-002**: All invalid search parameter combinations are rejected at the MCP boundary and never reach n8n; n8n receives only well-formed requests.
- **SC-003**: The agent always receives a response in a consistent format, regardless of whether the search returned results, returned no results, or encountered an error from n8n.
- **SC-004**: Adding a new MCP tool requires changes only within the MCP server's tool registry; no changes are needed to the agent's connection configuration or to other existing tools.
- **SC-005**: Vehicle search results are returned to the user within a time that is equal to or faster than the current direct agent-to-n8n search path under equivalent load.

## Assumptions

- The existing n8n workflow's webhook endpoint and its input/output contract remain unchanged; this feature adds a new caller (the MCP server) but does not modify the n8n workflow itself.
- The n8n webhook currently requires no authentication in the local development environment; the optional auth credential support (FR-011) prepares the system for future secured deployments without requiring it now.
- The mock vehicle database schema and the fields it returns are stable and known; the normalized Vehicle Result format is derived from what n8n already returns.
- The agent's MCP client configuration supports adding a locally-hosted MCP server without changes to the agent's core logic beyond updating its tool source.
- All filter fields in `search_cars` are optional; a call with no filters is a valid "return all vehicles" request.
- The MCP server runs locally alongside the agent and n8n instance; network latency between the MCP server and n8n is negligible.
- The n8n webhook responds well within 5 seconds under normal local operating conditions; the 5-second timeout is chosen to absorb transient startup latency without blocking the agent for an unacceptable duration.

## Clarifications

### Session 2026-08-11

- Q: Does the existing n8n webhook require authentication that the MCP server must include? → A: No authentication required now; the MCP server must support optional auth credential injection via environment configuration for future use.
- Q: Does the agent need the `identifier` field to reference vehicles across separate requests, or only within a single result list? → A: Pass-through with uniqueness — n8n's identifier is passed unchanged and must uniquely identify the vehicle in the mock database; no cross-request stability guarantee is specified now.
- Q: Should schema mismatches in n8n responses trigger a log entry alongside normalization? → A: Yes — log a warning identifying the missing or unexpected fields; return the normalized result regardless.
- Q: What fields must the structured error response contain? → A: `code` (machine-readable error type) + `message` (human-readable) + `details` (list of affected fields or contextual info).
- Q: What should the request timeout threshold be for outbound n8n calls? → A: 5 seconds.
- Q: Should the MCP server produce observability output for local debugging? → A: Log validation failures and n8n communication errors only; successful requests produce no log output.
