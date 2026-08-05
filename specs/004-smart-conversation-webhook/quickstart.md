# Quickstart Validation Guide: Smart Conversation Webhook

**Feature**: `004-smart-conversation-webhook` | **Date**: 2026-08-05

This guide describes how to verify the feature works end-to-end after implementation. No automated tests — manual verification only (Constitution Principle V).

---

## Prerequisites

1. App running locally: `npm run dev` → `http://localhost:3000`
2. `N8N_WEBHOOK_CAR_SEARCH_URL` set in `.env.local` (can point to a local webhook inspector such as [webhook.site](https://webhook.site) or a local n8n instance)
3. `ANTHROPIC_API_KEY` set in `.env.local`
4. A webhook inspector open and ready to receive POST requests

---

## Scenario 1 — Explicit end signal fires webhook once

**Goal**: Verify FR-001, FR-002, FR-008, FR-009

1. Open `http://localhost:3000`.
2. Type: `"I need a city car, budget around €15,000"` → Send.
3. Answer 2–3 questions from the agent.
4. Type: `"I'm done, find me cars"` → Send.

**Expected**:
- A loading/typing indicator appears in the chat while the agent processes.
- The indicator is replaced by a confirmation message from the agent.
- Exactly **one** POST appears in the webhook inspector.
- The webhook body is a JSON object matching `CarSearchPayload` (see [data-model.md](data-model.md)), with `endTrigger: "explicit"` and `isRefinement: false`.
- No raw conversation text in the webhook body.

---

## Scenario 2 — Single refusal skips field, does not conclude

**Goal**: Verify FR-003 (single refusal = skip, not end)

1. Start a new conversation.
2. Type: `"I want an SUV"` → Send.
3. When the agent asks about budget, type: `"I don't know"` → Send.

**Expected**:
- The agent acknowledges it will skip budget and asks the **next** clarifying question.
- No webhook call appears in the inspector.
- The conversation continues normally.

---

## Scenario 3 — Multiple consecutive refusals skip fields, never conclude

**Goal**: Verify FR-003 (any number of refusals = skip only, never end trigger)

1. Start a new conversation.
2. Type: `"Looking for a hybrid car"` → Send.
3. When the agent asks a question, reply: `"I don't know"` → Send.
4. When the agent asks the next question, reply: `"Doesn't matter"` → Send.
5. When the agent asks a third question, reply: `"No preference"` → Send.

**Expected**:
- After each refusal the agent acknowledges it will skip that field and asks the **next** clarifying question.
- **No webhook call appears** in the inspector at any point during these refusals.
- The conversation continues normally after all three refusals.
- The agent does NOT conclude the conversation or show a loading/conclusion indicator.

---

## Scenario 4 — Round limit triggers car suggestions then conclusion

**Goal**: Verify FR-004, FR-005, FR-008

1. Start a new conversation.
2. Answer 5 consecutive questions with substantive answers (budget, body type, fuel, seats, features).

**Expected**:
- After the 5th answer, the agent presents **2–4 car type/model suggestions** before asking another question.
- The agent asks: "Shall I search now or would you like to refine further?"
- Type: `"Search now"` → Send.
- Loading indicator → confirmation message.
- One webhook call with `endTrigger: "length-limit"`.

---

## Scenario 5 — Webhook failure and retry

**Goal**: Verify FR-010 (one auto-retry then manual retry option)

1. Temporarily set `N8N_WEBHOOK_CAR_SEARCH_URL` to an unreachable URL in `.env.local` and restart the dev server.
2. Run Scenario 1 steps.

**Expected**:
- The agent attempts the webhook twice (check `n8n-trigger.log` in the project root for two entries with the same timestamp ~1s apart).
- The chat displays an error message with a "Try again" option.
- No webhook call succeeds.

3. Restore the correct URL, restart, and use the "Try again" option.

**Expected**:
- One successful webhook call appears in the inspector.

---

## Scenario 6 — Refinement mode

**Goal**: Verify FR-011, FR-012, FR-013

1. Complete Scenario 1 (conversation concluded, webhook fired).
2. In the same chat window, type: `"Actually make the budget up to €20,000"` → Send.

**Expected**:
- A "Refining your search" badge or label is visible in the chat UI.
- The agent acknowledges the amendment and may ask a clarifying follow-up.
- Type: `"That's it, search again"` → Send.
- A **second** webhook call appears in the inspector with `isRefinement: true` and `budgetMax: 20000`.

3. Type: `"Start over, I want something completely different"`.

**Expected**:
- The agent explains that a new search requires a new session and offers to start one.
- No extra webhook call fires for this message.

---

## Scenario 7 — Immediate end signal with no prior answers

**Goal**: Verify edge case: user ends before any questions are answered

1. Start a new conversation.
2. Immediately type: `"Just find me something"` → Send.

**Expected**:
- The agent concludes immediately.
- One webhook call with all fields set to `"any"` / `["any"]` / `null` and `endTrigger: "explicit"`.

---

## Scenario 8 — Round-limit check-in: user accepts continuation, second check-in fires

**Goal**: Verify FR-004 (check-in repeats at each N-round interval when user accepts)

1. Start a new conversation.
2. Answer 5 consecutive questions with substantive answers.

**Expected**:
- After the 5th answer, the agent presents **2–4 car type/model suggestions** and asks whether to search now or continue.
- Type: `"Let's keep going"` → Send.
- **No webhook call** appears in the inspector.
- The agent resumes asking clarifying questions.

3. Answer 5 more questions.

**Expected**:
- After the 5th answer in this extension round, the agent again presents updated suggestions and repeats the check-in question.
- Type: `"Search now"` → Send.
- Loading indicator → confirmation message.
- Exactly **one** webhook call with `endTrigger: "length-limit"`.

---

## Scenario 9 — Soft extension ceiling: agent concludes regardless after max extensions

**Goal**: Verify FR-004 soft ceiling (after default 3 accepted extensions, agent force-concludes)

1. Start a new conversation.
2. Answer 5 questions, then accept continuation at each check-in for 3 successive check-ins (15 additional rounds, ~20 total).

**Expected**:
- On the 4th check-in (after the 3rd accepted extension), the agent does **not** offer a continuation choice — it instead delivers a "I really need to search now" message and concludes.
- Loading indicator → confirmation message.
- Exactly **one** webhook call with `endTrigger: "length-limit"`.
- The chat input may be disabled or the agent message makes clear the session is concluded.

---

## Webhook payload shape validation

After any successful scenario, verify the webhook body against this checklist:

- [ ] `budgetMin` and `budgetMax`: numbers or `null`
- [ ] `bodyTypes`: non-empty array; contains `"any"` if not specified
- [ ] `fuelTypes`: non-empty array; contains `"any"` if not specified
- [ ] `transmission`: one of `"manual"`, `"automatic"`, `"any"`
- [ ] `minSeats`: number or `null`
- [ ] `features`: array (may be empty); each item has `name` (string) and `mandatory` (boolean)
- [ ] `timeline`: one of `"asap"`, `"3months"`, `"6months+"`, `"any"`
- [ ] `usageContext`: one of `"commute"`, `"family"`, `"offroad"`, `"performance"`, `"any"`
- [ ] `annualMileage`: string or `null`
- [ ] `endTrigger`: one of `"explicit"`, `"implicit"`, `"length-limit"`, `"refinement"`, `"unknown"`
- [ ] `isRefinement`: boolean
- [ ] **No** `query`, `messageCount`, `timestamp`, or any raw message content present
