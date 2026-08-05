# Feature Specification: n8n Workflow Automation Integration

**Feature Branch**: `003-n8n-integration`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "I want to introduce n8n to this project. I want to use the official n8n mcp to manage workflows."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Manage n8n Workflows via Claude (Priority: P1)

As a developer working on the AI Car Buying Assistant, I want to create, inspect, update, and
delete n8n workflows directly from Claude Code using the official n8n MCP server, so that I
can manage automation logic without leaving my development environment.

**Why this priority**: The core ask of this feature is MCP-based workflow management. Without
this, no other automation scenarios are possible.

**Independent Test**: Can be fully tested by asking Claude to list existing n8n workflows, create
a new workflow, and delete it — delivering full lifecycle management without touching the n8n UI.

**Acceptance Scenarios**:

1. **Given** the n8n MCP server is configured and running, **When** I ask Claude to list all workflows, **Then** Claude returns an accurate list of workflow names and their active/inactive status.
2. **Given** the n8n MCP server is configured, **When** I describe a new workflow to Claude, **Then** Claude creates the workflow in n8n and confirms its ID and activation status.
3. **Given** an existing workflow, **When** I ask Claude to update or deactivate it, **Then** the workflow is updated in n8n and Claude confirms the change.
4. **Given** an existing workflow, **When** I ask Claude to delete it, **Then** the workflow is removed from n8n and Claude confirms deletion.

---

### User Story 2 - Trigger Automation from the Application (Priority: P2)

As the application, I want to trigger n8n workflows in response to user actions (such as a
car search completing or a user saving a listing), so that downstream tasks like
notifications or data enrichment run automatically without blocking the user interface.

**Why this priority**: Connecting application events to n8n workflows delivers the
business value of automation — the MCP integration alone is a developer tool; this story
makes the system useful to end users.

**Independent Test**: Can be fully tested by saving a car listing in the application and
verifying that the corresponding n8n workflow is triggered and executes successfully (visible
in n8n execution history).

**Acceptance Scenarios**:

1. **Given** a user completes a car search, **When** the search results are returned, **Then** a configured n8n webhook workflow is triggered within 2 seconds, receives the search query and result count, and the user is not blocked.
2. **Given** a triggered workflow, **When** the workflow executes, **Then** execution results are logged and any errors are captured without crashing the application.
3. **Given** n8n is unreachable, **When** a workflow trigger is attempted, **Then** the application continues to function normally and the failure is logged silently.

---

### User Story 3 - Monitor Workflow Execution Health (Priority: P3)

As a developer, I want to view recent workflow execution history and error details through
Claude, so that I can diagnose automation failures without opening the n8n UI.

**Why this priority**: Operational visibility reduces debugging time, but is a quality-of-life
improvement that can be deferred until the core integration is stable.

**Independent Test**: Can be fully tested by asking Claude to show the last 10 executions of a
specific workflow and verifying that it returns status, timestamps, and any error messages.

**Acceptance Scenarios**:

1. **Given** a workflow with recent executions, **When** I ask Claude for its execution history, **Then** Claude returns a summary with status (success/failure) and timestamps for each run.
2. **Given** a failed execution, **When** I ask Claude for error details, **Then** Claude returns the error message and the step where the failure occurred.

---

### Edge Cases

- What happens when n8n is offline when a workflow trigger is attempted from the app?
- How does the system handle a workflow that runs longer than the application's request timeout?
- What happens when a workflow is triggered with malformed or missing data?
- How does the MCP connection behave when the n8n API key is invalid or rotated?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The project MUST include a self-hosted n8n instance accessible in the local development environment.
- **FR-002**: The official n8n MCP server MUST be configured so Claude can interact with n8n workflows via tool calls.
- **FR-003**: The MCP configuration MUST support at minimum: listing workflows, creating workflows, activating/deactivating workflows, deleting workflows, and retrieving execution history.
- **FR-004**: The application MUST trigger n8n workflows by sending an HTTP POST request to an n8n webhook URL configured per workflow; no direct n8n API calls or message queues are used for runtime triggering.
- **FR-005**: Workflow triggers from the application MUST be non-blocking — they MUST NOT delay or interrupt the user-facing response.
- **FR-006**: The application MUST handle n8n unavailability gracefully; failures MUST be appended to a dedicated log file (`n8n-trigger.log`) in the project root and MUST NOT propagate as user-visible errors.
- **FR-007**: n8n credentials (API keys, webhook URLs) MUST NOT be hardcoded; they MUST be supplied via environment variables. Webhook endpoints require no authentication token as they are accessible on localhost only.
- **FR-008**: At least one end-to-end workflow MUST be created to demonstrate the integration: when a car search completes, the application MUST POST the search query and result count to an n8n webhook, which logs the payload. This proves the full trigger-to-execute chain with no external service dependencies.

### Key Entities

- **Workflow**: An automation sequence defined in n8n; has an ID, name, activation status, and execution history.
- **Workflow Trigger**: An event emitted by the application that initiates a specific n8n workflow.
- **Execution**: A single run of a workflow; has a status (success/error), timestamps, and per-step results.
- **MCP Tool**: A capability exposed by the n8n MCP server that Claude uses to manage workflows.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer can create, read, update, and delete n8n workflows entirely through Claude without opening the n8n UI, completing each operation in under 30 seconds.
- **SC-002**: Application-triggered workflows start executing within 2 seconds of the originating user action completing.
- **SC-003**: When n8n is unreachable, the application remains fully functional for users with zero visible degradation; the failure is recorded in `n8n-trigger.log`.
- **SC-004**: A developer can retrieve the last 10 executions of any workflow through Claude in a single request.
- **SC-005**: All workflow credentials are externalized; removing the environment variable file leaves no secrets in the codebase.

## Clarifications

### Session 2026-08-04

- Q: How should the Next.js application trigger n8n workflows at runtime? → A: HTTP POST to an n8n webhook URL (webhook trigger node in n8n; app POSTs a payload to the URL)
- Q: Should the n8n instance be deployable beyond the local development environment? → A: Local development only; no staging or production deployment is in scope for this feature
- Q: Should the application include a shared secret when calling n8n webhook URLs? → A: No authentication; webhook URLs are localhost-only and no shared secret is required
- Q: What should the illustrative end-to-end workflow (FR-008) do? → A: Car search completed → n8n logs the search query and result count (proves the trigger chain with no external dependencies)
- Q: Where should the application write trigger failure logs when an n8n webhook call fails? → A: Dedicated log file (failures appended to a file in the project root, e.g., `n8n-trigger.log`)

## Assumptions

- n8n will be run as a self-hosted instance (e.g., via Docker) in the local development environment only. Staging and production deployments of n8n are explicitly out of scope for this feature.
- The official n8n MCP server package is available and compatible with the version of n8n being used.
- Claude Code's MCP configuration will be updated to register the n8n MCP server; this is a developer machine setup step, not a runtime application dependency.
- The first concrete workflow is illustrative (e.g., triggered on car save); additional domain-specific workflows are out of scope and will be added as separate features.
- Mobile responsiveness and UI changes are not in scope — this feature has no direct user-facing interface components.
- The n8n instance does not need to be accessible to end users; it is an internal automation tool.
