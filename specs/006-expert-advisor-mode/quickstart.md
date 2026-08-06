# Quickstart Validation Guide: Expert Advisor Mode

**Branch**: `006-expert-advisor-mode` | **Date**: 2026-08-06

## Prerequisites

- Local dev server running: `npm run dev`
- Anthropic API key set in `.env.local` (`ANTHROPIC_API_KEY`)
- n8n webhook URL set in `.env.local` (`N8N_WEBHOOK_CAR_SEARCH_URL`)
- Browser open at `http://localhost:3000`

---

## Scenario 1 — Lifestyle-only input produces a technical recommendation (SC-001)

**Goal**: Verify the assistant never asks a technical question before recommending.

**Steps**:
1. Open a fresh chat session.
2. Send: _"Hi, I need help finding a car."_
3. Answer every question the assistant asks using only lifestyle answers (distance, passengers, no garage, budget). Example responses:
   - "I drive about 30km a day, mostly city roads"
   - "Just me and my partner, occasionally our two kids"
   - "We don't have a garage or any place to charge a car"
   - "Budget is about €22,000"
   - "Heated seats would be nice but not essential"
4. When asked "would you like to search?", say yes.

**Expected outcome**:
- The assistant asks only about lifestyle (distance, journey type, charging, passengers, cargo, towing, budget, features)
- The assistant does NOT ask about fuel type, drivetrain, engine size, or transmission
- Before searching, the assistant presents a named vehicle category or model with 2+ pros and 1 con, each tied to the lifestyle answers provided
- The `__WEBHOOK_EVENT__` suffix in the streaming response shows `status: "success"`

**Pass condition**: Zero technical-spec questions appear in the assistant's turns before the first recommendation.

---

## Scenario 2 — Technical misconception is corrected (FR-003)

**Goal**: Verify the assistant corrects a car-specific incorrect belief in plain language.

**Steps**:
1. Open a fresh chat session.
2. When asked about commute or driving style, respond: _"I want a diesel — I heard they're much more powerful than petrol."_

**Expected outcome**:
- The assistant acknowledges the preference.
- It provides a plain-language factual correction explaining why diesel power advantage is marginal in modern cars and specifically how it relates to the user's city/commute use case.
- It does NOT lecture or repeat the correction — it moves on to the next lifestyle question.
- It does NOT simply accept the stated fuel preference and continue as if it were correct.

**Pass condition**: Correction is present in the response, tied to the user's situation, and the conversation continues normally.

---

## Scenario 3 — Contradictory constraints are surfaced (FR-008, SC-004)

**Goal**: Verify the assistant surfaces a conflict within the same turn.

**Steps**:
1. Open a fresh chat session.
2. Provide these answers across two messages:
   - Budget: _"€13,000"_
   - Towing: _"Yes, I need to tow a caravan"_

**Expected outcome**:
- The assistant identifies and states the conflict (€13k budget + towing requirement cannot be fully satisfied simultaneously).
- It explains why (suitable tow vehicles start from a higher price point).
- It asks which constraint takes priority before proceeding.

**Pass condition**: Conflict is raised in the same turn where the second contradictory constraint is received; no silent defaulting.

---

## Scenario 4 — Tie-breaking produces exactly one preference question (FR-006, SC-005)

**Goal**: Verify only one preference question is asked when two options are equally matched.

**Steps**:
1. Open a fresh chat session.
2. Provide a profile that produces two equally matched options. Example:
   - Daily distance: 25km, mixed city/motorway
   - Home charging: yes
   - Passengers: 2
   - No towing, no large cargo
   - Budget: €32,000
   - No specific features
3. Wait for the assistant to identify tie-breaking candidates.

**Expected outcome**:
- The assistant presents exactly two named options.
- It provides a one-line plain-language differentiator for each.
- It asks exactly ONE preference question (lifestyle-framed, not technical).
- After receiving the user's answer, it immediately confirms one option and does not ask further preference questions.

**Pass condition**: Exactly one preference question appears before the final recommendation is confirmed.

---

## Scenario 5 — User overrides recommendation (FR-009)

**Goal**: Verify the assistant respects user override without repeated corrections.

**Steps**:
1. Complete Scenario 2 (diesel correction).
2. After the correction, respond: _"I understand, but I still want a diesel — I prefer it."_

**Expected outcome**:
- The assistant acknowledges the decision.
- It briefly notes (once) the specific downside for the user's stated situation (e.g., city diesel is less economical and produces more local emissions for short trips).
- It then assists with finding a diesel option — it does NOT repeat the correction or continue to argue.

**Pass condition**: Override is accepted in the same turn; correction note appears at most once; conversation continues toward a diesel recommendation.
