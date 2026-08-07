# Implementation Plan: Chat Search Feedback

**Branch**: `008-chat-search-feedback` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-chat-search-feedback/spec.md`

## Summary

Surface vehicle search results directly in the chat window as a bot/assistant message after the n8n workflow completes. Currently the n8n webhook discards its response body and the chat remains silent after `conclude_conversation` fires. This feature threads results back through the existing streaming sentinel protocol, adds a "Searching…" in-progress indicator during the webhook round-trip, and caps the in-chat display at 5 items with an email-overflow note.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js (Next.js runtime)

**Primary Dependencies**: Next.js 16.3, React 19, `@anthropic-ai/sdk` (claude-haiku-4-5)

**Storage**: n8n Data Table `car_listings` (accessed from n8n workflow only — not directly from Next.js)

**Testing**: None (per constitution — no test files created)

**Target Platform**: Next.js App Router (server + browser)

**Project Type**: Web application — Next.js frontend + API routes + n8n workflow backend

**Performance Goals**: Feedback message appears ≤ 2 s after webhook completes (SC-001); 30-second webhook timeout (FR-007)

**Constraints**: No new npm packages; all changes use existing React, Next.js, TypeScript, and existing CSS variables

**Scale/Scope**: Single-tenant assistant; no concurrent-search concurrency requirements beyond what the existing webhook retry handles

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| I. Clean Code | PASS | New identifiers (`SearchResultItem`, `isSearching`, `SEARCH_STARTED_SENTINEL`) are self-explanatory; no `any` types introduced |
| II. Simple UX | PASS | Result list capped at 5; text + animated dots for in-progress; no new navigation surface |
| III. Responsive Design | PASS | `SearchResultMessage` inherits `.assistantBubble` fluid max-width; source links use `word-break: break-word` |
| IV. Minimal Dependencies | PASS | Zero new npm packages |
| V. No Automated Testing | PASS | No test files created |
| Technology Stack | PASS | App Router only; no Pages Router APIs; `any` types avoided |

No violations — Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/008-chat-search-feedback/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── n8n-webhook-response.schema.json   # n8n → Next.js response contract
│   └── search-started-sentinel.md         # SEARCH_STARTED stream protocol
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
└── api/
    └── chat/
        └── route.ts              (modified)

components/
└── ChatInterface/
    ├── ChatInterface.tsx          (modified)
    ├── ChatInterface.module.css   (modified)
    └── SearchResultMessage.tsx    (new)

lib/
├── n8n/
│   └── trigger.ts                (modified)
└── types/
    ├── n8n.ts                    (modified)
    └── chat.ts                   (modified)
```

n8n workflow changes are applied in the n8n UI (not in Next.js source). The response contract is documented in `contracts/n8n-webhook-response.schema.json`.

**Structure Decision**: Web application layout. Changes are localized to `components/ChatInterface/`, `lib/`, and `app/api/chat/`. No new top-level directories required.
