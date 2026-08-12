# Research: New Design Live Integration

**Branch**: `010-new-design-live-integration` | **Date**: 2026-08-12

All research was resolved from direct codebase inspection. No external lookups required.

---

## D-001: Wizard-to-backend API contract

**Decision**: Add `wizardAnswers: WizardAnswers` as a new field in the `/api/chat` POST body.
`buildSystemPrompt()` receives `wizardAnswers` as a new parameter and embeds the user's
selections directly in the system prompt preamble, replacing the conversational question-asking
section.

**Rationale**: Type-safe and explicit. No fake messages are injected into the conversation
history. The AI receives complete context on the first request and can proceed directly to
making a recommendation and calling `search_cars`. The existing `messages`, `isRefinement`,
`roundCount`, and `userEmail` fields remain unchanged.

**Alternatives considered**:
- *Inject as first user message in `messages` array*: Pollutes conversation history with
  system-generated text the user did not write; breaks coherence if the user later scrolls the
  chat history or the conversation is replayed.
- *Inject as first assistant message*: Invalid — the Anthropic API requires the first turn to
  be a user message.
- *No API change; send wizard context in messages only*: Works but the system prompt is the
  correct place for persistent context that applies to every subsequent turn; mixing it into
  the messages array makes `buildSystemPrompt` harder to reason about.

---

## D-002: Initial trigger message for the step-5 API call

**Decision**: A synthetic, hidden user message ("Find me the best matching cars based on my
profile.") is sent as the only message in the initial step-5 API call. This message is NOT
added to the visible `messages` state in the chat panel. The AI's streamed reply is the first
item the user sees in the chat.

**Rationale**: The Anthropic Messages API requires at least one user message — an empty array
returns a 400 error. Hiding the synthetic trigger keeps the chat panel clean: the panel is
positioned as "Ask Cora", not a Q&A log of the wizard flow. Users see only Cora's opening
recommendation, which is a better first impression.

**Alternatives considered**:
- *Show the synthetic message*: Confusing — the user sees words they did not type attributed
  to them.
- *Use the wizard `notes` field as the trigger message*: Notes are optional and may be empty;
  passing an empty string also causes an API error.
- *Send as a separate pre-call with no user-facing effect*: Same outcome as chosen approach but
  requires extra complexity.

---

## D-003: Missing npm dependencies

**Decision**: Install four new packages as production dependencies:

| Package | Version | Purpose |
|---|---|---|
| `framer-motion` | latest stable | `AnimatePresence`, `motion.*`, layout animations in NewDesign.tsx |
| `lucide-react` | latest stable | Icon library used throughout NewDesign.tsx (30+ symbols) |
| `tailwindcss` | v4 latest | Utility classes referenced by NewDesign.tsx |
| `@tailwindcss/postcss` | v4 latest | PostCSS plugin that processes `@import "tailwindcss"` in newdesign.css |

Add `postcss.config.js` at the project root:
```js
module.exports = { plugins: { "@tailwindcss/postcss": {} } };
```

**Rationale**: NewDesign.tsx already imports from `framer-motion` and `lucide-react`; the
design is approved and written against them. `newdesign.css` uses the Tailwind v4
`@import "tailwindcss"` directive which requires the PostCSS integration. Each package passes
the constitution's three-question test: (1) no existing equivalent in the project, (2) custom
alternatives require impractical scope, (3) all are actively maintained with no known critical
CVEs.

**Alternatives considered**:
- *Remove framer-motion, rewrite animations in CSS*: Requires rewriting every `motion.*`
  component and all `AnimatePresence` exit sequences — significant scope increase.
- *Remove lucide-react, use inline SVG*: 30+ hand-crafted SVG strings, no type safety,
  poor maintainability.
- *Remove Tailwind, use CSS modules*: Re-implementing ~200 utility combinations in plain CSS
  is impractical and produces an unmaintainable stylesheet for a single component.

---

## D-004: Results rendering in step 5

**Decision**: The `Results` component is refactored to accept `items: SearchResultItem[] | null`
and `isLoading: boolean` props. When `isLoading` is true, three skeleton placeholder cards are
rendered. When `items` is populated, one card is rendered per `SearchResultItem`. The static
`cars` array, hardcoded `carImages`, and the `fit%` / `why` / `tags` fields are removed from
the component. Cards show make, model, year, price (formatted), and a "View listing" link when
`sourceUrl` is available. The AI's chat response carries the recommendation rationale.

**Rationale**: `SearchResultItem` is the authoritative shape from the backend
(`lib/types/n8n.ts`). Fields unique to the old static cards (`fit`, `why`, `tags`) have no
backend equivalent within scope; the AI's streamed text in the chat panel serves that role.

**Alternatives considered**:
- *Augment SearchResultItem with AI-generated fields per card*: Requires a second AI call or
  structural changes to the streaming response — out of scope for this feature.
- *Keep static skeleton cards visible until AI returns*: Misleads users into thinking fake
  data is real; contradicts spec SC-001 and FR-002.

---

## D-005: Tailwind v4 PostCSS setup and CSS co-existence

**Decision**: During migration, `newdesign.css` is imported in `app/layout.tsx` alongside the
existing `globals.css`. After the old ChatInterface tree is deleted, `globals.css` content is
merged into `newdesign.css` (custom properties, font setup, `#root` sizing) and `globals.css`
is removed. This leaves a single CSS entry point.

**Rationale**: Next.js auto-discovers `postcss.config.js` and applies it to all CSS files
processed through its pipeline. Both files can coexist during migration without conflicts
because `newdesign.css` only adds Tailwind utilities (additive) while `globals.css` defines
CSS custom properties and resets. After migration the duplication is eliminated.

**Alternatives considered**:
- `@tailwindcss/nextjs` package: Still experimental; the PostCSS approach is stable and
  documented as the standard path.
- Replace `globals.css` immediately: Risks breaking the existing layout during migration
  before the new design is verified.

---

## D-006: ConversationState ownership in the App component

**Decision**: The `App` component in `NewDesign.tsx` owns all conversation state fields:
`messages`, `isStreaming`, `streamingContent`, `error`, `sessionStatus`, `roundCount`,
`isRefinement`, `webhookError`, `isSearching`, and `userEmail`. The `retryPayload` is stored
in a `useRef` (matching the existing `ChatInterface` pattern). A new `searchResults` field
(`SearchResultItem[] | null`) is added to track the vehicle results returned by the backend.

**Rationale**: The `App` component already manages wizard step state and answers. Lifting
conversation state here gives it a single source of truth to coordinate step navigation (e.g.,
"Find my matches" triggers both step advancement and an API call). Avoids additional context
providers or child-component state for logic that must interact with the wizard flow.

**Alternatives considered**:
- *Separate ConversationProvider context*: Adds abstraction overhead not justified by the
  single-page scope of this application.
- *Keep conversation state in ChatPanel*: ChatPanel must remain stateless so the parent can
  trigger the initial search call when step 4 → 5 transitions.

---

## D-007: Old component deletion sequence

**Decision**: `ChatInterface.tsx`, `ChatInterface.module.css`, `SearchResultMessage.tsx`, and
`Header.tsx` are deleted in a single commit AFTER `app/page.tsx` is confirmed rendering the
new design and the end-to-end flow is manually verified. Deletion is the last task.

**Rationale**: Keeps a working reference during development. Aligns with the constitution's
"dead code must be removed immediately" — immediately means as soon as the migration is
confirmed, not before.
