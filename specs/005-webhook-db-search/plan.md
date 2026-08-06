# Implementation Plan: Webhook Database Search and Logging

**Branch**: `005-webhook-db-search` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-webhook-db-search/spec.md`

## Summary

The existing "Car Search Logger" n8n workflow receives a `CarSearchPayload` via POST webhook when a user finishes a car-buying conversation. This feature extends that workflow with three new nodes: (1) a Data Store reader that fetches all rows from a pre-seeded `car_listings` table, (2) a Code node that filters the listings against the structured criteria in the payload (budget, fuel type, body type, transmission, seat count, mandatory features — AND logic), and (3) a Set node that logs the result count and matched listings in the execution output. A mock dataset of 12 realistic UK marketplace listings is seeded into the Data Store during setup. No application code changes are required.

## Technical Context

**Language/Version**: n8n (self-hosted) — workflow nodes only; no application code changes

**Primary Dependencies**: n8n built-in nodes — Webhook Trigger (existing), n8n Data Store (Table · Get Many), Code node (JavaScript), Set node. No new npm packages, no external services.

**Storage**: n8n Data Store — `car_listings` table (12 seed rows, 13 columns). See [data-model.md](data-model.md) and [contracts/car-search-data-store.md](contracts/car-search-data-store.md).

**Testing**: None — manual validation only (Constitution Principle V). See [quickstart.md](quickstart.md).

**Target Platform**: n8n self-hosted instance (same instance used by features 003 and 004)

**Project Type**: n8n workflow extension — no changes to the Next.js application

**Performance Goals**: Workflow execution completes within 3 seconds per SC-001 (in-memory filtering of 12 records; no network calls beyond the initial webhook receipt)

**Constraints**: No external services · No new npm dependencies · All filtering logic in a single Code node · No automated tests

**Scale/Scope**: 12 mock listings · single workflow · single-trigger execution

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| I. Clean Code | ✅ Pass | The Code node filter logic uses descriptive variable names (`mandatoryFeatures`, `matchedListings`); no comments beyond the one non-obvious WHY allowed. The Set node output fields are named for clarity (`matchCount`, `listings`, `noResults`). |
| II. Simple UX | ✅ Pass | No user-facing UI changes in this feature. |
| III. Responsive Design | ✅ Pass | No UI changes. |
| IV. Minimal Dependencies | ✅ Pass | Zero new dependencies — uses only n8n's built-in Data Store, Code, and Set nodes already available on the existing n8n instance. |
| V. No Automated Testing | ✅ Pass | No test files. Manual validation via quickstart.md. |

All gates pass. No complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-webhook-db-search/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── car-search-data-store.md  ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

This feature makes no changes to the Next.js application source. All implementation work is within the n8n UI:

```text
n8n workflow: "Car Search Logger" (id: FPu7nerQuXt54T78)
  └── [existing] Webhook Trigger node
  └── [NEW] Get Car Listings node  — n8n Data Store · Table · Get Many
  └── [NEW] Filter Listings node   — Code node (JavaScript filter logic)
  └── [NEW] Log Results node       — Set node (formats execution output)

n8n Data Store:
  └── car_listings table (13 columns, 12 seed rows)
```

**Structure Decision**: Pure n8n workflow extension. No application file tree changes. The spec documentation is the only file output of this feature in the repository.
