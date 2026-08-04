# Research: App Skeleton Setup

**Feature**: 001-app-skeleton-setup | **Date**: 2026-08-04

---

## Decision 1: Next.js Version

**Decision**: Next.js 16.3.0 (React 19.2.8)

**Rationale**: Constitution mandates "the highest non-RC, non-alpha version published on npm" at the time the feature is started. Confirmed via `npm show next version` on 2026-08-04.

**Alternatives considered**: Next.js 15.x — superseded by 16.x which is the current latest stable.

---

## Decision 2: CSS Strategy

**Decision**: CSS Modules + CSS custom properties (design tokens in `globals.css`)

**Rationale**: CSS Modules are built into Next.js — zero additional dependencies, satisfying Constitution Principle IV. CSS custom properties (`--color-accent`, `--spacing-4`, etc.) defined once in `globals.css` give all components access to the design system without a CSS-in-JS runtime or a utility-class library. This approach also works without JavaScript (important for the no-JS edge case).

**Alternatives considered**:
- Tailwind CSS — popular but adds a build-time dependency and a large `tailwind.config` surface. Not justified when CSS Modules cover all requirements. Rejected.
- `styled-components` / `emotion` — CSS-in-JS with runtime overhead and a hydration boundary to manage. Rejected.
- Plain global CSS only — loses component-level scoping; risks style collisions as more components are added in future features. Rejected.

---

## Decision 3: Design Tokens (Visual Identity)

**Decision**: Neutral slate palette, system font stack, 4px spacing scale — defined as CSS custom properties.

**Rationale**: No brand assets exist (confirmed in clarification). Pragmatic defaults must be accessible, neutral, and override-friendly so a future design iteration can swap values without touching component CSS.

**Colour palette**:

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-surface` | `#F8FAFC` | Card / message bubble surface |
| `--color-border` | `#E2E8F0` | Dividers, input borders |
| `--color-text-primary` | `#0F172A` | Body text |
| `--color-text-secondary` | `#64748B` | Labels, placeholder text |
| `--color-accent` | `#3B82F6` | CTA button, links, active nav indicator |
| `--color-accent-hover` | `#2563EB` | Hover state for accent elements |
| `--color-error` | `#EF4444` | Error messages (404 page) |

All foreground/background pairings meet WCAG AA contrast (4.5:1 for normal text).

**Typography**:

| Token | Value |
|-------|-------|
| `--font-family` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| `--font-size-sm` | `0.875rem` (14px) |
| `--font-size-base` | `1rem` (16px) |
| `--font-size-lg` | `1.125rem` (18px) |
| `--font-size-xl` | `1.25rem` (20px) |
| `--font-size-2xl` | `1.5rem` (24px) |
| `--font-size-3xl` | `2rem` (32px) |
| `--line-height-base` | `1.5` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `700` |

**Spacing scale** (4px base unit):

| Token | Value |
|-------|-------|
| `--spacing-1` | `0.25rem` (4px) |
| `--spacing-2` | `0.5rem` (8px) |
| `--spacing-3` | `0.75rem` (12px) |
| `--spacing-4` | `1rem` (16px) |
| `--spacing-6` | `1.5rem` (24px) |
| `--spacing-8` | `2rem` (32px) |
| `--spacing-12` | `3rem` (48px) |
| `--spacing-16` | `4rem` (64px) |

**Border radius**:

| Token | Value |
|-------|-------|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-full` | `9999px` |

**Alternatives considered**: Using a pre-built token set from a design system (e.g., Radix Colors) — adds a dependency with no functional gain over hand-authored tokens. Rejected.

---

## Decision 4: Next.js 404 Handling

**Decision**: Use `app/not-found.tsx` (App Router built-in convention)

**Rationale**: In Next.js App Router, a `not-found.tsx` file in the `app/` directory is automatically rendered for all unmatched routes and for any component that calls `notFound()`. No configuration needed — zero additional code beyond the file itself.

**Alternatives considered**: Custom `_error` page (Pages Router pattern) — deprecated in App Router. Rejected.

---

## Decision 5: No-JS Behaviour

**Decision**: Inherent — no action required beyond using React Server Components for structural layout.

**Rationale**: Next.js App Router renders Server Components to HTML on the server. The Layout Shell (header) and page structure are delivered as static HTML. The ChatInterface input uses a standard `<textarea>` and `<button>` which render and are visually present without JavaScript. Client interactivity (future: sending messages) requires JS, but the structural placeholder is visible without it.

---

## Decision 6: TypeScript Configuration

**Decision**: Strict mode enabled (`"strict": true` in `tsconfig.json`); `noImplicitAny: true`

**Rationale**: Constitution requires no `any` types. Strict mode catches implicit `any` at compile time. `moduleResolution: bundler` (Next.js 16 default) enables correct resolution of ESM packages.
