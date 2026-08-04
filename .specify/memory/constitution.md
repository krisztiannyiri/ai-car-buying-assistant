<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Added sections:
  - Core Principles (5 principles defined):
      I. Clean Code
      II. Simple UX
      III. Responsive Design
      IV. Minimal Dependencies
      V. No Automated Testing
  - Technology Stack
  - Governance
Removed sections: n/a (first ratification from template)
Modified principles: n/a (first ratification from template)
Deferred TODOs: none
-->

# AI Car Buying Assistant Constitution

## Core Principles

### I. Clean Code

Code MUST be readable, self-explanatory, and maintainable. Every identifier, function, and
module MUST communicate intent without requiring supplementary comments. Deeply nested logic
MUST be extracted into well-named functions. Dead code MUST be removed immediately — it is
not archived, it is deleted. Formatting MUST follow a single, enforced style (Prettier with
project defaults). No commented-out code blocks are permitted in committed files.

**Rationale**: Readable code is the primary form of documentation. Drift between comments and
code is inevitable; clean naming eliminates the need for both.

### II. Simple UX

Every user-facing interaction MUST be achievable in the fewest possible steps. Interfaces
MUST expose only what the user needs at each point in the flow — progressive disclosure over
upfront information dumps. Error states MUST be human-readable and actionable, never raw
technical output. Defaults MUST represent the most common path; power-user options may exist
but MUST NOT clutter the primary flow.

**Rationale**: The product serves car buyers, not developers. Cognitive load reduction is a
first-class feature requirement.

### III. Responsive Design

Every UI component MUST render correctly and remain fully functional at mobile (≥320px),
tablet (≥768px), and desktop (≥1280px) breakpoints. Layouts MUST use fluid, relative units
(rem, %, vw/vh) rather than fixed pixels except where a fixed constraint is physically
mandated (e.g. icon size). Touch targets MUST be ≥44×44px. No horizontal scrolling is
permitted on any supported viewport. Components MUST be designed mobile-first and enhanced
upward.

**Rationale**: A significant share of car research happens on mobile. A desktop-only
experience is an incomplete product.

### IV. Minimal Dependencies

Every external dependency MUST be justified before it is introduced. The justification MUST
answer: (1) does the project already have something that covers this need, (2) can a small
custom implementation replace it without meaningful trade-off, and (3) is the package
actively maintained and free of known critical CVEs. Utility libraries that duplicate
functionality already present in React, Next.js, or the browser's native API MUST NOT be
added. The dependency list MUST be reviewed and trimmed at the start of each major feature
cycle.

**Rationale**: Each dependency is a maintenance liability, a security surface, and a bundle-
size cost. Keeping the graph small keeps the project fast and auditable.

### V. No Automated Testing

The project MUST NOT contain unit tests, integration tests, end-to-end tests, snapshot tests,
or any automated test suites of any kind. No test runners, test frameworks, or testing
utilities (Jest, Vitest, Cypress, Playwright, Testing Library, etc.) MUST be added as
dependencies. CI pipelines MUST NOT include test steps. Quality is enforced through code
review, manual verification, and adherence to the other principles in this constitution.

**Rationale**: For this project's scope and team size, the overhead of maintaining a test
suite outweighs the benefit. Investment goes into clean, simple, reviewable code instead.

## Technology Stack

The project MUST use the latest stable releases of Next.js and React.js at the time a feature
is started. "Latest stable" means the highest non-RC, non-alpha version published on npm.
Version pins MUST be updated at least once per major feature cycle. Deprecated Next.js APIs
(Pages Router, `getServerSideProps`, etc.) MUST NOT be used in new code; the App Router
and React Server Components are the standard. TypeScript MUST be used for all source files;
`any` types MUST be avoided except where a third-party type gap makes them unavoidable, and
every such use MUST include a `// TODO: remove any` comment.

## Governance

This constitution is the authoritative governance document for the AI Car Buying Assistant
project. It supersedes any conflicting conventions found in tooling config, ad-hoc READMEs,
or verbal agreements.

**Amendment procedure**: Any principle change MUST be proposed as a pull request that edits
this file directly. The PR description MUST state which principle is affected, what changes,
and why. The change takes effect when the PR is merged by the project lead.

**Versioning policy**: MAJOR bump for principle removals or incompatible redefinitions; MINOR
bump for new principles or materially expanded guidance; PATCH bump for clarifications and
wording fixes.

**Compliance review**: Every code review MUST verify that the change does not violate any
principle. Non-compliance found post-merge MUST be remediated before the next feature is
started.

**Version**: 1.0.0 | **Ratified**: 2026-08-04 | **Last Amended**: 2026-08-04
