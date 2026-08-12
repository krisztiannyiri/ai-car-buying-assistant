# Feature Specification: MCP as Canonical Tool Layer

**Feature Branch**: `011-mcp-canonical-tool-layer`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Remove the redundant tool creation in app/api/chat/route.ts and use MCP as the actual tool provider, keeping the route focused on: building the system prompt, passing conversation/messages, handling stream output, transforming MCP results into frontend events if needed"

## Clarifications

### Session 2026-08-12

- Q: When the Anthropic API manages MCP tool execution directly, how should `isRefinement` and `userEmail` reach the MCP server? → A: Hybrid — use MCP for tool schema discovery only; the route still intercepts tool_use events and calls the MCP tool itself with the injected values.
- Q: When the route fetches tool schemas from the MCP server, should it pass all discovered tools or filter to only `search_cars`? → A: Pass all discovered tools — the MCP registry is the allowlist. Note: `list_body_types` is likely not needed and should be removed from the MCP registry as part of this feature.
- Q: Should the route fetch tool schemas from the MCP server on every request, or cache them? → A: Per-request — stateless, always current, no caching logic needed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Car Search Works End-to-End After Refactor (Priority: P1)

A user submits a car search query. The assistant searches, returns results, and the frontend displays the results exactly as before — from the user's perspective nothing changes.

**Why this priority**: This is the core regression test. The refactor must preserve all observable user-facing behaviour while the internals change.

**Independent Test**: Can be fully tested by submitting a search query in the chat interface and verifying results appear, including refinement flows and error cases.

**Acceptance Scenarios**:

1. **Given** a user asks for a car matching specific criteria, **When** the assistant processes the request, **Then** the vehicle results appear in the UI with the same content and format as before the refactor.
2. **Given** the user asks to refine a previous search, **When** the assistant calls the search tool with updated filters, **Then** the refined results appear without degradation.
3. **Given** the search service is unavailable, **When** the tool call fails, **Then** the frontend receives a failure event and displays an appropriate error message.

---

### User Story 2 - Tool Schema Maintained in One Place (Priority: P2)

A developer who needs to update the `search_cars` tool schema (add a filter, change an enum) can make the change in the MCP server's tool definition and it automatically takes effect — without touching the chat route.

**Why this priority**: This is the primary maintenance benefit of the refactor. Divergence between two copies of the same schema has already caused bugs and will cause more.

**Independent Test**: Update a field description in `mcp-server/tools/search-cars.ts` and confirm the route sends the correct updated schema to the AI model with no changes to the route file.

**Acceptance Scenarios**:

1. **Given** the `search_cars` tool definition exists only in the MCP server, **When** a developer adds a new filter parameter to the MCP tool, **Then** the AI model receives the updated schema without any change to the route.
2. **Given** no duplicate tool definition exists in `app/api/chat/route.ts`, **When** a code review is performed, **Then** there is a single source of truth for the tool contract.

---

### User Story 3 - Route Responsibilities Clearly Separated (Priority: P3)

A developer reading `app/api/chat/route.ts` can understand its responsibilities at a glance: system prompt construction, conversation forwarding, stream handling, and event transformation. No tool schema definitions or manual tool execution logic live in the route.

**Why this priority**: Maintainability and cognitive load. A clean route is easier to reason about and test independently.

**Independent Test**: Read `app/api/chat/route.ts` after the refactor. It should contain no tool schema objects, no `SearchCarsInput` type, and no inline tool schema definition.

**Acceptance Scenarios**:

1. **Given** the refactored route file, **When** it is reviewed, **Then** it contains no `searchCarsTool` object and no `SearchCarsInput` type.
2. **Given** the refactored route, **When** the MCP server's tool schema changes, **Then** the route requires no modification.

---

### Edge Cases

- What happens when the MCP server is unreachable at schema-fetch time (startup / per-request)?
- What happens when the MCP server returns a tool result that does not match the expected shape?
- What happens when the route encounters a `tool_use` event for a tool it has no execution handler for (e.g., a newly added MCP tool)?
- Should `list_body_types` be removed from the MCP tool registry as part of this feature, or deferred to a separate cleanup?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The `search_cars` tool schema MUST be defined exclusively in the MCP server; no copy or re-declaration of the schema MUST exist in the chat route.
- **FR-002**: The chat route MUST fetch tool schemas from the MCP server on every request (via `tools/list`) and pass all discovered schemas to the AI model API call so the model always uses the current schema.
- **FR-003**: The chat route MUST intercept `tool_use` stream events, inject `isRefinement` and `userEmail`, and call the MCP tool directly — tool execution is NOT delegated to the Anthropic API's built-in MCP execution.
- **FR-004**: The `isRefinement` flag and `userEmail` value MUST be forwarded to the MCP tool invocation so the search payload remains complete.
- **FR-005**: The chat route MUST transform tool execution results from the stream into `WebhookEvent` frontend events (`__SEARCH_STARTED__`, `__WEBHOOK_EVENT__`) in the same format the frontend currently expects.
- **FR-006**: The chat route MUST preserve all error handling for MCP-unreachable and tool-failure cases, surfacing them as `failed` status `WebhookEvent`s to the frontend.
- **FR-007**: The chat route MUST continue to stream AI text tokens to the client in real time; tool execution MUST NOT block text streaming.
- **FR-008**: The system prompt construction logic MUST remain unchanged in the route.

### Key Entities

- **MCP Tool Registry**: The single source of truth for tool schemas and execution logic, living in `mcp-server/tools/`. `list_body_types` is a candidate for removal from the registry as it is not used by the chat flow.
- **Chat Route**: A thin orchestration layer responsible for prompt building, dynamic schema fetching, stream forwarding, tool execution with injected context, and frontend event emission.
- **WebhookEvent**: The frontend event contract (`__SEARCH_STARTED__`, `__WEBHOOK_EVENT__`) emitted by the route when a tool execution completes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The `search_cars` tool schema appears in exactly one location in the codebase after the refactor.
- **SC-002**: All existing end-to-end search scenarios (initial search, refinement, error) produce identical frontend events before and after the refactor.
- **SC-003**: The `app/api/chat/route.ts` file shrinks in line count, with no `searchCarsTool` object, `SearchCarsInput` type, or inline schema definition remaining.
- **SC-004**: A developer can add or rename a field in the MCP tool definition and the model uses the updated schema on the next request without touching the route.

## Assumptions

- The MCP server exposes a standard `tools/list` endpoint the route calls on every request to fetch the current tool schemas. If the fetch fails the request fails fast with a clear error — no stale fallback.
- The MCP server is available at the URL configured in `MCP_SERVER_URL` for all requests that reach the chat route.
- The frontend event contract (`__SEARCH_STARTED__`, `__WEBHOOK_EVENT__`) is unchanged; only the source of the tool schema changes.
- `isRefinement` and `userEmail` are injected into the tool call arguments by the route at the point where a `tool_use` event is detected in the stream, before forwarding to the MCP — this mechanism is preserved from the current implementation.
- `lib/mcp/client.ts` (`callSearchCars`) continues to be used for tool execution; a companion utility is introduced (or the same client is extended) to fetch tool schemas via `tools/list`.
