# Route Contracts: App Skeleton Setup

**Feature**: 001-app-skeleton-setup | **Date**: 2026-08-04

---

## Routes

### GET /

**Description**: Home page — renders the ChatInterface placeholder directly.

**Response**: `200 OK` — HTML document containing the Layout Shell (Header) and ChatInterface.

**Viewport behaviour**:
- 320–767px: single-column, full-width chat
- 768–1279px: constrained width, centred
- ≥1280px: constrained width (max ~800px), centred

**No-JS**: Page structure and chat input area visible as static HTML.

---

### GET /[any-unmatched-path]

**Description**: 404 error page — rendered by `app/not-found.tsx` for all unmatched routes.

**Response**: `404 Not Found` — HTML document containing the Layout Shell (Header) and the 404 error content.

**Required elements**:
- Human-readable headline
- Short description
- Link back to `/`

---

## Out of Scope (this skeleton)

The following route patterns are **not** created by this feature and will return 404 until a subsequent feature introduces them:

| Future path | Future feature |
|-------------|---------------|
| `/chat` or any assistant-specific sub-path | Assistant feature |
| `/api/*` | Any backend integration feature |
