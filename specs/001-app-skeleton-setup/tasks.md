# Tasks: App Skeleton Setup

**Input**: Design documents from `specs/001-app-skeleton-setup/`

**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | data-model.md ✓ | contracts/ ✓

**Tests**: None — Constitution Principle V prohibits test frameworks.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- No story label = Setup, Foundational, or Polish phase

---

## Phase 1: Setup

**Purpose**: Bootstrap the Next.js project from a blank repo.

- [ ] T001 Scaffold Next.js 16.3.0 + React 19 project at repo root — run `npx create-next-app@16.3.0 . --typescript --app --no-src-dir --no-tailwind --no-eslint --import-alias "@/*"` to generate `package.json`, `tsconfig.json`, `next.config.ts`, and initial `app/` directory
- [ ] T002 [P] Configure Prettier — create `prettier.config.js` (Constitution I) with `semi: true`, `singleQuote: true`, `trailingComma: 'es5'`, `printWidth: 100`; create `.prettierignore` excluding `.next/` and `node_modules/`
- [ ] T003 [P] Remove default Next.js boilerplate — delete auto-generated `app/page.tsx`, `app/globals.css` placeholder, `app/layout.tsx` default, `public/*.svg` files; keep `public/` directory; the skeleton versions of these files are created in later phases

**Checkpoint**: Repo has a valid Next.js 16 project that compiles (even if `app/page.tsx` is temporarily absent).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens and root layout shell that every page depends on. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: Phases 3–5 all depend on this phase completing first.

- [ ] T004 Create `app/globals.css` — define all 32 CSS custom properties from `research.md §Design Tokens` (8 colour tokens, 12 typography tokens, 8 spacing tokens, 4 radius tokens); add CSS reset (`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`); set base `html` and `body` styles using `--font-family`, `--font-size-base`, `--line-height-base`, `--color-bg`, `--color-text-primary`; add `overflow-x: hidden` on `html` to prevent horizontal scroll (FR-005)
- [ ] T005 Create `app/layout.tsx` — bare root Server Component layout: `<html lang="en">`, `<body>` importing `globals.css`; include Next.js `metadata` export with `title` and `description`; render `{children}` only — Header is added in Phase 4 (T011); satisfies the Layout Shell entity from `data-model.md`

**Checkpoint**: `npm run dev` starts without errors; visiting `/` shows a blank page with correct base font and background colour from design tokens.

---

## Phase 3: User Story 1 — Open the Chat Interface (Priority: P1) 🎯 MVP

**Goal**: User lands at `/` and sees the chat interface immediately with a message input area — no intermediate step.

**Independent Test**: Open `http://localhost:3000` — page loads, product name visible, `<textarea>` and send `<button>` present and reachable. See `quickstart.md §SC-001` and `§SC-002`.

- [ ] T006 [P] [US1] Create `components/ChatInterface/ChatInterface.tsx` — Server Component; renders a `<section>` containing: (1) a scrollable message display area `<div>` with placeholder copy ("Your conversation will appear here"), (2) a message input row with a `<textarea placeholder="Ask me anything about buying a car…">` and a `<button type="button">Send</button>`; non-functional placeholder — no state, no handlers; satisfies FR-001 and Chat Interface entity in `data-model.md`
- [ ] T007 [P] [US1] Create `components/ChatInterface/ChatInterface.module.css` — style the chat section using only design tokens; section fills available viewport height (`flex: 1`); message display area `flex-grows` and is scrollable (`overflow-y: auto`); input row is `display: flex`, `gap: var(--spacing-2)`; send button uses `--color-accent` background, `--color-text-primary` (white override), `--radius-md`, `min-height: 44px`, `min-width: 44px` (FR-006, Constitution III); textarea uses `--color-border` border, `--radius-md`, `--spacing-3` padding
- [ ] T008 [US1] Create `app/page.tsx` — Server Component; exports `metadata` with `title: 'AI Car Buying Assistant'` and `description`; renders `<main className={styles.main}>` containing `<ChatInterface />`; create `app/page.module.css` for `main` layout (`display: flex`, `flex-direction: column`, `min-height: calc(100vh - <header-height>)`)

**Checkpoint**: `http://localhost:3000` shows the chat interface. `SC-001` (< 2s load) and `SC-002` (purpose visible in 10s) pass.

---

## Phase 4: User Story 2 — Persistent Navigation Shell (Priority: P2)

**Goal**: A consistent branded header appears on every page, including the 404 error page. The header links back to `/`.

**Independent Test**: Visit `http://localhost:3000` and `http://localhost:3000/does-not-exist` — same header appears on both; clicking the app name from the 404 page navigates to `/`. See `quickstart.md §SC-003`.

- [ ] T009 [P] [US2] Create `components/Header/Header.tsx` — `'use client'` directive required for `usePathname()`; renders a `<header>` containing a `<Link href="/">` wrapping the app name ("AI Car Buying Assistant") as an `<span>`; applies an active CSS class when `pathname === '/'` for FR-003; satisfies Header entity in `data-model.md` and FR-002, FR-003
- [ ] T010 [P] [US2] Create `components/Header/Header.module.css` — header is `display: flex`, `align-items: center`, `padding: var(--spacing-4) var(--spacing-6)`, `border-bottom: 1px solid var(--color-border)`, `background: var(--color-bg)`; app name link uses `--color-text-primary`, `--font-weight-bold`, `--font-size-lg`, `text-decoration: none`; active state uses `--color-accent`; link `min-height: 44px` (FR-006)
- [ ] T011 [US2] Update `app/layout.tsx` — import `Header` component and render it as the first child of `<body>` above `{children}`; wrap body content in a flex column so header + main fill the viewport height; satisfies FR-002
- [ ] T012 [US2] Create `app/not-found.tsx` — Server Component; renders a centred page with: headline ("Page not found"), short description, and a `<Link href="/">` back to the chat interface; uses design tokens for styling (inline or a `.module.css`); satisfies FR-004

**Checkpoint**: Header visible on both Home and 404 pages. `SC-003` passes. 404 route returns correct content.

---

## Phase 5: User Story 3 — Consistent Responsive Layout (Priority: P3)

**Goal**: All pages render correctly at 320px, 768px, and 1280px — no horizontal scroll, no overlap, chat input reachable on all viewports.

**Independent Test**: Use DevTools to resize from 320px to 1280px+ on Home and 404 pages — no horizontal scrollbar at any width. See `quickstart.md §SC-004` and `§Edge case — Large browser font size`.

- [ ] T013 [P] [US3] Update `components/ChatInterface/ChatInterface.module.css` — add mobile-first responsive rules: `width: 100%` at base (320px); at `min-width: 768px` apply `max-width: 720px; margin-inline: auto`; at `min-width: 1280px` apply `max-width: 800px`; ensure chat section fills viewport without horizontal overflow; FR-005
- [ ] T014 [P] [US3] Update `components/Header/Header.module.css` — add responsive rules: at base (320px) header padding reduces to `var(--spacing-3) var(--spacing-4)`; app name truncates with `text-overflow: ellipsis` at narrow widths; ensures header never causes horizontal overflow; FR-005, FR-006
- [ ] T015 [US3] Update `app/layout.tsx` and `app/page.module.css` — wrap page content in a `max-width` container that centres at wider viewports; verify `overflow-x: hidden` on body is sufficient; update `app/globals.css` if any base responsive styles were missed; ensures `SC-004` passes at all three breakpoints

**Checkpoint**: Manual resize check at 320px, 768px, 1280px passes for both pages. `SC-004` verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality checks across all user stories.

- [ ] T016 Run `npm run build` — resolve any TypeScript compile errors; confirm zero `any` types (Constitution — `noImplicitAny: true`); confirm build output is clean with no warnings
- [ ] T017 [P] Run `npx prettier --write .` — auto-format all source files; verify formatting is consistent across `app/` and `components/` (Constitution I)
- [ ] T018 Manual validation per `specs/001-app-skeleton-setup/quickstart.md` — walk through all 7 scenarios: SC-001 (load time), SC-002 (10s comprehension), SC-003 (header on both pages), SC-004 (responsive check), SC-005 (no blank screens), edge case (large font size), edge case (no-JS)

**Checkpoint**: All quickstart.md scenarios pass. Feature complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001) — blocks all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (T004 + T005)
- **US2 (Phase 4)**: Depends on Phase 2 (T004 + T005)
- **US3 (Phase 5)**: Depends on Phase 3 (T006, T007, T008) and Phase 4 (T009, T010, T011, T012)
- **Polish (Phase 6)**: Depends on Phase 5

### User Story Dependencies

- **US1 (P1)**: No dependencies on US2 or US3
- **US2 (P2)**: No dependencies on US1 or US3 (US1 and US2 can build in parallel after Phase 2)
- **US3 (P3)**: Depends on US1 and US2 being structurally in place (CSS refine pass)

### Within Each Phase

- T001 must complete before T002 and T003 (create-next-app generates the repo structure)
- T004 and T005 must complete before any page component is built
- T006 and T007 (ChatInterface component + CSS) can run in parallel; T008 (page.tsx) needs both
- T009 and T010 (Header component + CSS) can run in parallel; T011 (layout update) needs both
- T013 and T014 can run in parallel; T015 follows

---

## Parallel Opportunities

### Phase 3 (US1)

```
Parallel: T006 (ChatInterface.tsx) + T007 (ChatInterface.module.css)
Sequential: T008 (app/page.tsx) — after both above
```

### Phase 4 (US2)

```
Parallel: T009 (Header.tsx) + T010 (Header.module.css) + T012 (not-found.tsx)
Sequential: T011 (update layout.tsx) — after T009 + T010
```

### Phases 3 + 4 together (if two developers)

```
Developer A: T006 → T007 → T008  (US1)
Developer B: T009 → T010 → T011 → T012  (US2)
Both can run after Phase 2 completes.
```

### Phase 5 (US3)

```
Parallel: T013 (ChatInterface responsive CSS) + T014 (Header responsive CSS)
Sequential: T015 (layout/globals responsive polish) — after both above
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004–T005)
3. Phase 3: US1 — Chat Interface (T006–T008)
4. **Stop and validate**: `http://localhost:3000` shows chat interface; SC-001 and SC-002 pass
5. Ship or demo MVP

### Incremental Delivery

1. Phase 1 + Phase 2 → project boots
2. Phase 3 → chat interface visible at `/` (MVP)
3. Phase 4 → header + 404 page complete
4. Phase 5 → all viewports polished
5. Phase 6 → build clean, validated

---

## Notes

- [P] = different files, no cross-task dependencies — safe to parallelize
- [US1/US2/US3] maps to user stories in `specs/001-app-skeleton-setup/spec.md`
- No test tasks — Constitution Principle V prohibits test frameworks
- Design token values are in `research.md §Decision 3`; component contracts in `contracts/components.ts`
- Commit after each phase checkpoint at minimum
- `not-found.tsx` is wired to the Layout Shell automatically by Next.js — no manual routing needed
