# Implementation Plan: New Design Live Integration

**Branch**: `010-new-design-live-integration` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

## Summary

Replace the simulated logic in `components/NewDesign.tsx` with real AI streaming from `/api/chat`,
extend the backend to accept structured wizard answers and deliver a simplified system prompt,
render live `SearchResultItem` data on step 5, and delete the superseded `ChatInterface`
component tree once the new design is the verified primary entry point.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16.3, React 19.2

**Primary Dependencies**: `@anthropic-ai/sdk` ^0.115 (existing); `framer-motion`, `lucide-react`,
`tailwindcss` ^4, `@tailwindcss/postcss` (all new — required by NewDesign.tsx / newdesign.css)

**Storage**: N/A — no database changes

**Testing**: None (per constitution)

**Target Platform**: Web browser; responsive 320 px → desktop (sm/lg/xl breakpoints in NewDesign.tsx)

**Project Type**: Web application — Next.js App Router, client components

**Performance Goals**: Step-5 search latency consistent with current chat system (~3–8 s end-to-end)

**Constraints**: No packages beyond the four listed above; touch targets ≥ 44×44 px (already met
in NewDesign.tsx); no horizontal scroll; no TypeScript `any` without `// TODO: remove any`

**Scale/Scope**: Single-user sequential flow; two API routes unchanged in capacity; three
component files deleted at migration close

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| I. Clean Code | ✅ Pass | Old component tree deleted after migration; no dead code left |
| II. Simple UX | ✅ Pass | Wizard pre-collects context; AI skips question-gathering; step 5 shows loading immediately |
| III. Responsive Design | ✅ Pass | NewDesign.tsx already implements mobile/tablet/desktop breakpoints |
| IV. Minimal Dependencies | ⚠️ Justified | Four new packages required — see Complexity Tracking |
| V. No Automated Testing | ✅ Pass | No test suite additions |

_Post-Phase 1 re-check_: All gates still pass. No new violations introduced by design decisions.

## Project Structure

### Documentation (this feature)

```text
specs/010-new-design-live-integration/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api-chat.md      ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
app/
├── api/
│   └── chat/
│       └── route.ts     ← MODIFIED: add wizardAnswers param; simplified buildSystemPrompt
├── globals.css          ← REPLACED: merged into newdesign.css at migration close
├── layout.tsx           ← MODIFIED: swap CSS import
└── page.tsx             ← MODIFIED: render NewDesign instead of ChatInterface

components/
├── NewDesign.tsx        ← PRIMARY CHANGE: real API integration, search results state
├── newdesign.css        ← UNCHANGED: Tailwind v4 import + custom slider/scrollbar rules
├── ChatInterface/       ← DELETE after migration verified
│   ├── ChatInterface.tsx
│   ├── ChatInterface.module.css
│   └── SearchResultMessage.tsx
└── Header/              ← DELETE after migration verified
    └── Header.tsx

lib/
└── types/
    └── chat.ts          ← MODIFIED: export WizardAnswers; extend ChatRequestBody

postcss.config.js        ← NEW: Tailwind v4 PostCSS plugin registration
```

**Structure Decision**: Single Next.js App Router project. All changes are in the existing
`/app`, `/components`, and `/lib` trees. One new file (`postcss.config.js`) at root. No
new directories.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `framer-motion` new dependency | NewDesign.tsx uses `AnimatePresence`, `motion.*`, and spring layout animations for step transitions and card entrances | CSS transitions cannot replicate `AnimatePresence` exit sequences or spring physics; rewriting would require significant scope increase and risk degrading approved UX |
| `lucide-react` new dependency | NewDesign.tsx uses 30+ icon symbols throughout every step and the sidebar | Inline SVGs for 30+ icons add noise with no maintenance benefit; no existing icon solution in the project |
| `tailwindcss` + `@tailwindcss/postcss` new dependencies | `newdesign.css` uses `@import "tailwindcss"` (v4 syntax); all layout, spacing, and colour utilities in NewDesign.tsx are Tailwind classes | Re-implementing ~200 Tailwind utility combinations in plain CSS is impractical and would produce an unmaintainable stylesheet |
