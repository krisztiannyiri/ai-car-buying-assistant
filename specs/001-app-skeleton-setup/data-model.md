# Data Model: App Skeleton Setup

**Feature**: 001-app-skeleton-setup | **Date**: 2026-08-04

This skeleton has no persistent data storage. The "model" is the component hierarchy and its prop interfaces (defined authoritatively in [contracts/components.ts](./contracts/components.ts)).

---

## Component Hierarchy

```
RootLayout          (app/layout.tsx)       — wraps every page
  └─ Header         (components/Header/)   — persistent across all routes
  └─ {children}                            — page content slot

HomePage            (app/page.tsx)         — renders at /
  └─ ChatInterface  (components/ChatInterface/) — chat placeholder

NotFoundPage        (app/not-found.tsx)    — renders for all unmatched routes
  └─ (inline content — static, no sub-components needed)
```

---

## Entities

### RootLayout

Wraps `<html>` and `<body>`. Renders the Header and the page slot. Server Component.

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `children` | `React.ReactNode` | Yes | Page content injected by Next.js router |

**Validation rules**: None — Next.js mandates this signature.

---

### Header

Persistent brand bar across all routes. Server Component.

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| *(none)* | — | — | Reads current path via `usePathname` hook in a Client Component sub-element for active-state styling |

**State**: Active page indicator — driven by current URL path. No local state in the skeleton (only Home `/` is active; always active on the one real page).

---

### ChatInterface

Structural placeholder for the conversational interface. Contains a message display area and a message input row. **No AI or network integration in this skeleton.**

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| *(none)* | — | — | Skeleton — all content is static placeholder copy |

**Sub-elements**:

| Element | Role |
|---------|------|
| Message display area | Scrollable container for conversation history — empty in skeleton |
| Message input | `<textarea>` for user input |
| Send button | `<button>` — visually present but non-functional in skeleton |

**State**: None in skeleton. Future features will introduce message state (client-side).

---

### NotFoundPage

Static 404 error page. Server Component. No props — Next.js renders this automatically.

| Element | Content |
|---------|---------|
| Headline | "Page not found" (or equivalent) |
| Description | Short human-readable message |
| Home link | Navigates to `/` |

---

## Design Token Schema

All tokens are CSS custom properties defined in `app/globals.css`. See [research.md §Design Tokens](./research.md#decision-3-design-tokens-visual-identity) for the full value table.

| Category | Token prefix | Count |
|----------|-------------|-------|
| Colour | `--color-*` | 8 |
| Typography — font size | `--font-size-*` | 7 |
| Typography — other | `--font-family`, `--line-height-*`, `--font-weight-*` | 5 |
| Spacing | `--spacing-*` | 8 |
| Border radius | `--radius-*` | 4 |

**Total**: 32 design tokens. No token depends on runtime JavaScript — all are static CSS values.
