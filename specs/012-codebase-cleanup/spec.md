# Feature Specification: Codebase Cleanup — Gaps, Drift, and Structure

**Feature Branch**: `012-codebase-cleanup`

**Created**: 2026-08-13

**Status**: Implemented

**Input**: User description: "explore the codebase and identify further gaps and drifts, and suggest improvement ideas, e.g.: the NewDesign.tsx is very general name and the component has too many responsibilities, it should be splitted. analyze the currently applied solutions and provide better alternatives if there's any. ARCHITECTURE.md already contains some known gaps and drift, those must be fixed"

## Scope

Two mandates:

1. Close all thirteen gaps recorded in `ARCHITECTURE.md` §13.
2. Address the further defects, dead code, and structural problems found by a fresh read of the
   codebase — most visibly `components/NewDesign.tsx`, a 1421-line client component holding twelve
   sub-components, eighteen `useState` hooks, and all network logic.

No user-facing behaviour changes, with one intentional exception (User Story 3).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The Wizard Still Works End-to-End (Priority: P1)

A user completes steps 1–4 and receives a shortlist on step 5, exactly as before the refactor.

**Why this priority**: The component split and hook extraction touch every line of the UI. This is
the regression gate.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the user completes all four wizard steps, **Then** step 5
   shows up to five result cards and the search email is sent when an address was supplied.
2. **Given** results are displayed, **When** the user sends a refinement in the chat panel,
   **Then** the results refresh in place and `isRefinement` is true on the request.
3. **Given** any step, **When** the user clicks a previously visited step in the sidebar,
   **Then** navigation succeeds; unvisited steps remain unreachable.

### User Story 2 - A Failed Search Recovers Correctly (Priority: P1)

A user whose search fails clicks **Try again** and sees results.

**Why this priority**: This was gap 4 — a real defect. The retry cleared the error but never
rendered the cars it had just fetched.

**Acceptance Scenarios**:

1. **Given** n8n was down and a retryable error is shown, **When** n8n recovers and the user
   clicks **Try again**, **Then** result cards appear and the error clears.
2. **Given** a retry, **When** it reaches n8n, **Then** it passes through the same MCP validation,
   auth, timeout, and normalization as the original request.

### User Story 3 - Unsatisfiable Filters Fail Loudly (Priority: P2)

A user asking for a body or fuel type the catalogue cannot contain gets an explanation instead of
an empty list.

**Why this priority**: This was gap 12. It is the one intentional behaviour change: `crossover`,
`mpv`, `convertible`, `mild-hybrid`, and `plugin-hybrid` previously passed validation and then
matched zero rows silently.

**Acceptance Scenarios**:

1. **Given** a request for a convertible, **When** `search_cars` validates it, **Then** it returns
   `VALIDATION_ERROR` whose `details` name the searchable body types.

### User Story 4 - Malformed Data Never Hangs the UI (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the model emits unparseable `tool_use` JSON, **When** the route processes it, **Then**
   it emits a failed `__WEBHOOK_EVENT__` and closes the stream — the client does not sit in
   `isSearching` forever.
2. **Given** a POST of invalid JSON to the MCP server, **When** it is handled, **Then** the server
   answers 400 and stays alive.
3. **Given** n8n omits an optional field, **When** the result is normalized, **Then** the field
   arrives as `null` (or `[]` for `features`), never `undefined`.

## Requirements _(mandatory)_

### Functional

- **FR-001** The MCP server MUST bind `0.0.0.0` so its published Docker port is reachable.
- **FR-002** Every `JSON.parse` of untrusted input MUST be guarded, including inside
  `ReadableStream.start()` where a throw does not reach the enclosing `try`.
- **FR-003** `/api/webhook-retry` MUST reach n8n through the MCP tool, not a parallel direct POST.
- **FR-004** A successful retry MUST commit its results to the UI.
- **FR-005** `normalizeN8nResponse` MUST type-guard every field it emits.
- **FR-006** Malformed request bodies MUST yield 4xx, not 5xx.
- **FR-007** MCP-accepted `bodyTypes`/`fuelTypes` MUST equal the Data Store enums.
- **FR-008** The live n8n workflow MUST be committed to the repo with restore instructions.
- **FR-009** Sentinel literals MUST have exactly one definition shared by both sides of the wire.
- **FR-010** No dead code, dead types, dead files, or commented-out code may remain
  (Constitution I).
- **FR-011** `ARCHITECTURE.md` MUST match the code after the change, including §13.

### Structural

- **FR-012** No component file may own both presentation and network logic.
- **FR-013** Wizard navigation state and conversation state MUST live in separate hooks with a
  one-way dependency between them.
- **FR-014** The default export's name MUST match its filename.
- **FR-015** Duplicated markup MUST be extracted (the sidebar/drawer step list).

## Superseded decisions

Spec 011's clarification chose **per-request** tool-schema fetching: *"stateless, always current,
no caching logic needed."* Spec 012 supersedes that with a **60-second module-scope cache**
(gap 11). The reasoning that made per-request attractive — always current — is preserved by the
TTL, while the second MCP round trip per chat turn is removed. A redeployed MCP server is picked up
within a minute without restarting Next.js.

## Success Criteria

- **SC-001** `npm run typecheck` and `npm run build` are clean.
- **SC-002** All thirteen `ARCHITECTURE.md` §13 gaps are closed; §13 lists only what genuinely
  remains.
- **SC-003** No file in `components/` exceeds ~250 lines.
- **SC-004** The manual checklist in `ARCHITECTURE.md` §14 passes, including every failure path.
