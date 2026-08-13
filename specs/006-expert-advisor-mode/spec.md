# Feature Specification: Expert Advisor Mode

**Feature Branch**: `006-expert-advisor-mode`

**Created**: 2026-08-06

**Status**: Implemented

**Input**: User description: "I want to adjust my car buying assistant. I feel it's relying a bit too much on the user input. The car buying assistant must act as an expert advisor, not rely on the user to know technical car details. Most users only know their functional needs, budget, and preferences, so the assistant should ask about usage and constraints, then infer the relevant technical requirements itself. It should research facts, evaluate tradeoffs, and recommend the best-fit vehicle based on real-world needs, not just user assumptions. The assistant should clearly explain pros and cons, and only ask preference-based follow-up questions when multiple options are similarly strong. In those cases, it should present the tradeoffs so the user can make an informed choice."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Needs-Based Discovery (Priority: P1)

A user opens the assistant with no prior car knowledge. Instead of being asked "what drivetrain do you want?" or "manual or automatic?", the assistant asks about daily usage: how far they drive, whether they have a garage, how many passengers they typically carry, and their budget. The assistant then determines on its own which vehicle types, fuel systems, and configurations fit those constraints.

**Why this priority**: This is the core behavioral change requested. Without this, the assistant remains an information relay rather than an expert advisor. Every other story builds on top of this reframing.

**Independent Test**: Can be fully tested by starting a fresh conversation, providing only lifestyle information (e.g., "I commute 40 miles a day, have two kids, no garage, budget €25,000"), and verifying the assistant produces a justified recommendation without asking any technical questions first.

**Acceptance Scenarios**:

1. **Given** a user who has not specified any technical car attributes, **When** they describe their commute distance, family size, and budget, **Then** the assistant asks only usage/lifestyle follow-ups (not drivetrain, engine size, or transmission type) and proceeds to a recommendation.
2. **Given** a user who volunteers a technically incorrect preference (e.g., "I want a diesel because they're powerful"), **When** the assistant evaluates the actual need, **Then** it acknowledges the stated preference, explains the real tradeoff, and recommends the most suitable option rather than blindly accepting the user's framing.
3. **Given** a user who provides minimal information, **When** the assistant lacks enough to differentiate options, **Then** it asks a targeted usage question (e.g., "Do you park in a place where charging an electric car would be practical?") rather than a technical one.

---

### User Story 2 - Expert Recommendation with Explained Tradeoffs (Priority: P2)

After gathering lifestyle and budget information, the assistant independently evaluates options and presents a ranked recommendation — naming specific models or categories — with a clear explanation of why each fits (or does not fit) the user's situation. Pros and cons are stated in plain language tied to the user's actual constraints.

**Why this priority**: Users need to trust the recommendation. An unexplained pick is not expert advice — it is guessing. Explaining tradeoffs in terms of real-world impact makes the recommendation actionable and trustworthy.

**Independent Test**: Can be fully tested by providing a complete user profile and verifying that the assistant's response names at least one concrete recommendation and explicitly references the user's stated constraints in the rationale.

**Acceptance Scenarios**:

1. **Given** a complete user profile (usage, budget, constraints), **When** the assistant generates a recommendation, **Then** it names specific vehicle categories or models, lists at least two pros and one con relative to the user's situation, and links every stated advantage to a concrete need the user described.
2. **Given** a user who asks "why not X?", **When** they challenge a recommendation, **Then** the assistant provides a fact-based comparison between the recommended option and the alternative, framed around the user's constraints rather than abstract specifications.

---

### User Story 3 - Preference Tie-Breaking (Priority: P3)

When two or more options are genuinely equivalent given the user's constraints, the assistant presents the tradeoff to the user in plain terms and asks a single preference question to break the tie — rather than making an arbitrary pick or asking technical questions the user cannot meaningfully answer.

**Why this priority**: This scenario is the exception, not the rule. The assistant should resolve most decisions autonomously; only when options are objectively equivalent should user preference be solicited. Implementing this correctly ensures the assistant never stalls on resolvable decisions.

**Independent Test**: Can be fully tested by constructing a user profile where two vehicle options are equally well-matched (e.g., two similarly priced hybrid sedans with comparable range), verifying the assistant presents both with a plain-language tradeoff summary, and asks exactly one preference-based question rather than multiple technical ones.

**Acceptance Scenarios**:

1. **Given** two equally strong options, **When** the assistant cannot differentiate them on functional grounds, **Then** it presents both with a brief, jargon-free tradeoff summary and asks one preference-based question (e.g., "Would you prefer more boot space or a sportier feel?").
2. **Given** a preference question has been answered, **When** the user responds, **Then** the assistant immediately applies the preference to select one option and confirms the recommendation — it does not ask additional preference questions unless a genuinely new tie exists.

---

### Edge Cases

- What happens when the user provides contradictory constraints (e.g., "budget €15,000, needs to tow a caravan")?
  - The assistant must identify the conflict, explain why both constraints cannot be satisfied simultaneously, and ask the user which constraint takes priority.
- What happens when the user insists on a technically poor choice after being advised against it (e.g., "I still want a diesel for city driving")?
  - The assistant acknowledges the user's decision, briefly notes the specific downside for their usage (without lecturing), and assists with the chosen direction.
- What happens when the user's budget is too low for any reasonable option matching their needs?
  - The assistant states this honestly, explains what budget range would open up suitable options, and offers to recommend within the existing budget with noted compromises.
- What happens when the user asks a highly technical question the assistant should answer?
  - The assistant answers it factually in plain language, but does not treat it as a signal to shift into a question-and-answer mode about technical specs.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The assistant MUST open every new conversation by asking about the user's usage, lifestyle, and budget — not about technical vehicle attributes.
- **FR-002**: The assistant MUST infer technical requirements (fuel type, drivetrain, transmission, body style, minimum range, towing capacity, etc.) from stated usage needs without asking the user to specify them.
- **FR-003**: The assistant MUST correct or reframe technically incorrect user assumptions about car-specific topics (fuel types, drivetrains, running costs, range, safety ratings, and similar automotive facts) with a factual explanation tied to the user's specific situation before proceeding. Corrections are scoped to automotive knowledge only; broader factual errors on unrelated topics are out of scope.
- **FR-004**: The assistant MUST produce a ranked recommendation that names specific vehicle categories or models and provides a plain-language rationale linking each recommendation to the user's stated constraints.
- **FR-005**: Every recommendation MUST include at least one clearly stated disadvantage or limitation relative to the user's situation, so the user can make an informed choice.
- **FR-006**: The assistant MUST resolve preference tie-breaking by presenting a plain-language tradeoff summary and asking exactly one preference-based question — not multiple technical questions. Two options are considered equivalent (triggering this flow) when no stated user constraint differentiates them: they fall within the same price band and both fully satisfy all of the user's functional needs.
- **FR-007**: The assistant MUST NOT ask users to specify technical parameters (engine displacement, transmission type, fuel system, suspension type, etc.) at any point in the primary conversation flow.
- **FR-008**: When a user's constraints are contradictory or infeasible within budget, the assistant MUST surface the conflict explicitly and ask which constraint takes priority.
- **FR-009**: The assistant MUST respect a user's final decision even when it conflicts with the expert recommendation, while briefly and once noting the key downside.

### Key Entities

- **User Profile**: The set of functional needs, lifestyle constraints, and budget collected during the conversation. Built incrementally; never requires technical car knowledge from the user. Ephemeral — exists only within a single conversation session and is not persisted after the session ends.
- **Requirement Inference**: The assistant's internal mapping from user profile attributes to technical vehicle requirements (e.g., "40-mile daily commute + no home charging → hybrid preferred over full EV").
- **Recommendation**: A named vehicle category or model with a structured rationale (pros, cons, alignment to user constraints).
- **Tradeoff Summary**: A plain-language comparison used when multiple options are equally strong (same price band, all functional needs met equally by both), designed to surface a single preference question.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a representative conversation where a user provides only lifestyle information, the assistant produces a specific, justified recommendation without asking any technical vehicle questions — verified by direct observation through manual conversation testing (see quickstart.md Scenario 1).
- **SC-002**: Users who receive a recommendation can explain the reason for it in their own words — target: 80% of test users in a review can accurately paraphrase why the assistant recommended what it did, without referencing technical specs.
- **SC-003**: Conversations where users are satisfied enough to commit to a recommendation category complete in 5 or fewer assistant turns on average — counted by observing the number of assistant messages in a manual test session.
- **SC-004**: When tested with a user profile containing a contradictory constraint, the assistant surfaces the conflict within the same turn rather than silently defaulting — measurable by reviewing conflict-detection behaviour across a set of test scenarios.
- **SC-005**: Preference tie-breaking conversations contain exactly one preference-based question before a final recommendation is made — measurable by counting question instances in tie-breaking conversation branches.

## Assumptions

- Users are assumed to have basic conversational ability but no automotive engineering knowledge; the assistant is the sole expert in the interaction.
- The assistant's current knowledge base and conversation model are assumed to be adequate for reasoning about vehicle types and real-world usage scenarios; this feature does not require integration with a live vehicle database or pricing API.
- The existing conversation flow (webhook-based n8n integration) will be preserved; the n8n workflow requires no new nodes or logic changes — all behavioural changes are contained to the AI system prompt and conversation instructions.
- Conversation log capture and review is not used to validate this feature; all success criteria are verified through direct observation during manual testing sessions.
- Mobile-first interaction is assumed (per constitution Principle III); all response formats must work in a chat UI without requiring tables or complex layouts the user cannot interact with on a small screen.
- Multi-language support is out of scope; the assistant responds in the language the user writes in, but no translation layer is added.

## Clarifications

### Session 2026-08-06

- Q: What is the scope of change required to implement the expert advisor behaviour — is this a system prompt/AI instruction update only, or does the n8n workflow also need new decision logic nodes? → A: System prompt / AI instructions only — n8n workflow unchanged.
- Q: Is the user profile data collected during a conversation (budget, family size, commute details) stored anywhere after the conversation ends, or is it discarded when the session closes? → A: Ephemeral — discarded when the conversation ends, nothing persisted.
- Q: When the spec says two options are "equally strong" and trigger the preference tie-breaking flow, what concrete criterion should the assistant use to decide that options are equivalent? → A: No stated user constraint differentiates them — same price band and all functional needs met equally by both options.
- Q: SC-001 says the assistant's behaviour is "measurable by reviewing conversation logs" — are conversation logs already captured in a queryable form, or does this feature need to add a logging requirement? → A: Superseded — user confirmed conversation log capture and review is not wanted; all success criteria verified through direct manual observation instead.
- Q: FR-003 requires correcting technically incorrect user assumptions — does this apply only to car-specific misconceptions or also to broader factual errors? → A: Car-specific only — fuel types, drivetrains, running costs, range, safety ratings, and similar automotive facts.
