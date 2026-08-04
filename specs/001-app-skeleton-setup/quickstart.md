# Quickstart Validation Guide: App Skeleton Setup

**Feature**: 001-app-skeleton-setup | **Date**: 2026-08-04

---

## Prerequisites

- Node.js ≥ 20 (LTS)
- npm ≥ 10

---

## Setup

```bash
# From repo root
npm install
```

Expected: installs `next`, `react`, `react-dom`, TypeScript, and `@types/*` — no other runtime dependencies.

---

## Run

```bash
npm run dev
```

Expected: Next.js dev server starts at `http://localhost:3000`.

---

## Validation Scenarios

### SC-001 — Home page loads in under 2 seconds

1. Open `http://localhost:3000` in a browser with DevTools Network tab open
2. Hard-reload (`Ctrl+Shift+R` / `Cmd+Shift+R`)
3. **Pass**: Page fully renders in < 2s (DOMContentLoaded + all resources)

---

### SC-002 — Chat interface is immediately understandable

1. Open `http://localhost:3000` in a fresh browser profile (no prior visits)
2. Without scrolling, note what is visible within 10 seconds
3. **Pass**: Product name visible in header; chat input area visible; purpose of the app is clear from the page content

---

### SC-003 — Header present on Home and 404

1. Visit `http://localhost:3000` — verify header with app name/logo is visible
2. Visit `http://localhost:3000/does-not-exist` — verify the same header appears
3. Click the app name/logo on the 404 page — verify it navigates to `/`
4. **Pass**: Header consistent on both pages; logo link functional

---

### SC-004 — Responsive layout at three breakpoints

Use browser DevTools device emulation or resize the window:

| Viewport | Check                                                           |
| -------- | --------------------------------------------------------------- |
| 320px    | No horizontal scrollbar; chat input fully visible and reachable |
| 768px    | Layout reflows to take advantage of wider viewport; no overlap  |
| 1280px   | Content centred/constrained; no overflow                        |

**Pass**: All three viewports render without horizontal scroll or overlapping elements.

---

### SC-005 — Both pages reachable with no errors

1. Visit `http://localhost:3000` — no console errors; no blank screen
2. Visit `http://localhost:3000/nonexistent` — 404 page renders with a link to home; no console errors
3. **Pass**: Zero unhandled errors in browser console for both routes

---

### Edge case — Large browser font size

1. Set browser default font size to 24px (Chrome: Settings → Appearance → Font size → Very large)
2. Visit `http://localhost:3000`
3. **Pass**: Text reflows cleanly; no content clipped; no horizontal overflow

---

### Edge case — No JavaScript

1. Disable JavaScript in DevTools (Settings → Debugger → Disable JavaScript)
2. Hard-reload `http://localhost:3000`
3. **Pass**: Page structure visible; header and chat input area rendered (non-interactive but present)

---

## Build Validation

```bash
npm run build
```

**Pass**: Build completes with zero TypeScript errors and zero Next.js build errors. No `any` type warnings.

---

## References

- Route contracts: [contracts/routes.md](./contracts/routes.md)
- Component interfaces: [contracts/components.ts](./contracts/components.ts)
- Design tokens: [research.md §Design Tokens](./research.md#decision-3-design-tokens-visual-identity)
