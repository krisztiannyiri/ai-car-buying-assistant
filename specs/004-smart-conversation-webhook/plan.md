# Implementation Plan: Smart Conversation Webhook

**Branch**: `004-smart-conversation-webhook` | **Date**: 2026-08-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-smart-conversation-webhook/spec.md`

## Summary

The assistant currently fires the n8n webhook on every user message with a minimal `{query, messageCount, timestamp}` payload. This feature replaces that behaviour: the webhook fires exactly once per conversation conclusion (explicit end, repeated refusal, or 5-round limit), carrying a structured `CarSearchPayload` instead of raw text. The agent gains a `conclude_conversation` tool it calls when concluding; the API route detects this tool call, fires the webhook (with one automatic retry), and signals the frontend via an end-of-stream sentinel. The frontend gains round-count tracking, a loading indicator during conclusion, and a "refining" mode for post-conclusion amendments.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16.3.0 / React 19.2.8

**Primary Dependencies**: `@anthropic-ai/sdk ^0.115.0` (existing) — tool_use feature used, no new packages needed

**Storage**: N/A — sessions are in-memory, no persistence between page loads

**Testing**: None (Constitution Principle V)

**Target Platform**: Web — Next.js App Router server (API route) + React browser client

**Project Type**: Web application (Next.js monolith: `app/`, `components/`, `lib/`)

**Performance Goals**: Loading indicator covers the conclusion processing time; no hard latency target beyond what the existing streaming approach already achieves

**Constraints**: No automated tests · No new npm dependencies · App Router only · Mobile-first (≥320px) · TypeScript strict (no `any`)

**Scale/Scope**: Single-user sessions, no concurrent-user state sharing

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| I. Clean Code | ✅ Pass | New identifiers (`concludeConversation`, `CarSearchPayload`, `SessionStatus`) are self-documenting; no comments beyond the one non-obvious WHY allowed |
| II. Simple UX | ✅ Pass | Loading indicator during conclusion, clear "Refining your search" label, no new modals or multi-step flows |
| III. Responsive Design | ✅ Pass | Refinement mode indicator and loading state are CSS-only additions; all breakpoints (≥320px) supported |
| IV. Minimal Dependencies | ✅ Pass | Zero new npm packages — tool_use is a native SDK feature; retry is a plain `async`/`await` wrapper |
| V. No Automated Testing | ✅ Pass | No test files created |

All gates pass. No complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-smart-conversation-webhook/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── chat-api.md      ← Phase 1 output
│   └── conclude-tool.md ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
app/
└── api/
    └── chat/
        └── route.ts        ← update: add tool_use, selective webhook trigger, sentinel injection

components/
└── ChatInterface/
    ├── ChatInterface.tsx    ← update: round tracking, status state, refinement indicator, sentinel parsing
    └── ChatInterface.module.css  ← update: refinement badge, loading indicator styles (if needed)

lib/
├── n8n/
│   └── trigger.ts          ← update: add fireWebhookWithRetry
└── types/
    ├── chat.ts              ← update: SessionStatus enum, extended ConversationState
    └── n8n.ts              ← replace WebhookPayload with CarSearchPayload; add FeatureEntry, WebhookEvent
```

**Structure Decision**: The project is a Next.js monolith. No new directories are introduced. All changes are extensions to existing files under `app/api/chat/`, `components/ChatInterface/`, and `lib/`. This satisfies Principle IV (minimal surface area).
