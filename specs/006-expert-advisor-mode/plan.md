# Implementation Plan: Expert Advisor Mode

**Branch**: `006-expert-advisor-mode` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-expert-advisor-mode/spec.md`

## Summary

Transform the car buying assistant from a passive question-relay into an expert advisor by rewriting the system prompt in `app/api/chat/route.ts`. The assistant will ask only lifestyle and usage questions, infer all technical vehicle requirements internally, and proactively recommend specific vehicle categories with explicit tradeoff explanations. The change is entirely confined to `buildSystemPrompt()` — no other files are modified.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.3.0, React 19.2.8

**Primary Dependencies**: `@anthropic-ai/sdk ^0.115.0` (sole AI integration); no new dependencies required

**Storage**: N/A — user profile is ephemeral; no persistence layer involved

**Testing**: No automated testing (Constitution Principle V); validation via manual conversation scenarios documented in `quickstart.md`

**Target Platform**: Next.js App Router server-side API route (`app/api/chat/route.ts`)

**Project Type**: Web application (Next.js)

**Performance Goals**: No additional latency introduced; prompt rewrite does not affect streaming pipeline or token budget in a meaningful way

**Constraints**: Prompt-only change; n8n workflow unchanged; mobile-first response formatting; corrections scoped to automotive topics; user profile ephemeral (no retention)

**Scale/Scope**: Single-user conversation session; stateless between sessions

## Constitution Check

_GATE: Must pass before implementation. Re-checked after Phase 1 design — all gates pass._

| Principle | Status | Notes |
|---|---|---|
| I. Clean Code | Pass | `buildSystemPrompt()` grows in complexity; the inference rules section will be extracted into clearly named inline comments or a separate helper to maintain readability. No commented-out code. |
| II. Simple UX | Pass | This feature directly improves UX by eliminating technical questions. No UI changes required. |
| III. Responsive Design | Pass | No UI changes; not applicable to this backend-only change. |
| IV. Minimal Dependencies | Pass | Zero new dependencies. |
| V. No Automated Testing | Pass | Validation via manual scenarios in `quickstart.md` only. |

## Project Structure

### Documentation (this feature)

```text
specs/006-expert-advisor-mode/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── chat-api.md      ← Phase 1 output
├── checklists/
│   └── requirements.md  ← quality checklist
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
app/
└── api/
    └── chat/
        └── route.ts     ← ONLY FILE CHANGED
```

All other source files (`lib/`, `components/`, `app/page.tsx`, etc.) are untouched.

**Structure Decision**: Single-file change. The entire feature is delivered by rewriting `buildSystemPrompt()` in `app/api/chat/route.ts`. No new files, no new routes, no component changes.
