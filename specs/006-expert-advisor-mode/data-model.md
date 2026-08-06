# Data Model: Expert Advisor Mode

**Branch**: `006-expert-advisor-mode` | **Date**: 2026-08-06

## Overview

This feature introduces no new persistent data models. All state is ephemeral — it exists only within a single conversation session and is discarded when the session ends. The entities below describe the in-memory concepts the assistant holds during a conversation.

---

## Entity: UserProfile (ephemeral, in-memory)

Represents the lifestyle and constraint information collected from the user during a session. The assistant builds this incrementally through the conversation. It is never stored to any database or external system.

| Field | Type | Description |
|---|---|---|
| `dailyDrivingKm` | `number \| null` | Typical daily driving distance in kilometres |
| `journeyType` | `'city' \| 'motorway' \| 'mixed' \| null` | Dominant driving environment |
| `homeChargingAvailable` | `boolean \| null` | Whether overnight/workplace EV charging is practical |
| `regularPassengerCount` | `number \| null` | Typical number of passengers carried |
| `cargoFrequency` | `'minimal' \| 'occasional' \| 'frequent' \| null` | How often large cargo is carried |
| `towingRequired` | `boolean \| null` | Whether towing a trailer, caravan, or boat is needed |
| `budgetMax` | `number \| null` | Maximum budget in euros |
| `mentionedFeatures` | `{ name: string; mandatory: boolean }[]` | Specific features mentioned by the user |
| `correctedMisconceptions` | `string[]` | Automotive misconceptions corrected during the session, tracked to avoid re-correcting |

**Validation rules**:
- `dailyDrivingKm` is non-negative when set
- `regularPassengerCount` is ≥ 1 when set
- `budgetMax` is a positive integer when set
- `correctedMisconceptions` prevents the assistant from issuing the same correction twice in a session

---

## Entity: RequirementInference (derived, in-memory)

Represents the technical vehicle requirements derived from the UserProfile by the assistant. Never collected from the user directly. Populated when `conclude_conversation` is called.

Maps directly to the `ConcludeConversationInput` interface in `app/api/chat/route.ts`:

| Inferred field | Source fields | Inference rule reference |
|---|---|---|
| `fuelTypes` | `homeChargingAvailable`, `budgetMax`, `journeyType`, `dailyDrivingKm` | research.md Decision 3: Fuel type |
| `bodyTypes` | `regularPassengerCount`, `cargoFrequency`, `towingRequired` | research.md Decision 3: Body type |
| `engineDisplacements` | `journeyType`, `dailyDrivingKm`, `towingRequired`, `fuelTypes` | research.md Decision 3: Engine displacement |
| `transmission` | `fuelTypes`, `journeyType` | research.md Decision 3: Transmission |
| `usageContext` | `journeyType`, `regularPassengerCount`, `towingRequired` | Mapped from lifestyle signals |
| `annualMileage` | `dailyDrivingKm` | Estimated as dailyDrivingKm × 250 working days, rounded to nearest band |
| `yearMin`, `yearMax` | `budgetMax`, inferred model | Assistant's automotive knowledge |
| `budgetMax` | `budgetMax` | Direct passthrough |
| `minSeats` | `regularPassengerCount` | Direct passthrough |
| `features` | `mentionedFeatures` | Direct passthrough |
| `endTrigger` | Conversation state | Unchanged logic |

---

## Entity: Recommendation (assistant output, in-message)

Represents a vehicle recommendation produced by the assistant during the conversation. Delivered as natural language; no structured data type persisted.

| Attribute | Description |
|---|---|
| `vehicleCategory` | Named vehicle category or specific model (e.g., "mid-size hybrid SUV", "Toyota Corolla Hybrid") |
| `pros` | At least 2 advantages explicitly tied to the user's stated lifestyle constraints |
| `cons` | At least 1 limitation relevant to the user's situation |
| `lifestyleRationale` | Summary sentence linking the recommendation to the user's profile |

**Constraint**: Every pro and con MUST reference a specific user need or constraint stated in the session. Generic spec comparisons (e.g., "has 150 horsepower") are not acceptable.

---

## Entity: TiebreakPresentation (assistant output, in-message)

Used only when two options are genuinely equivalent (same price band ≤15% difference, all lifestyle constraints equally satisfied). Delivered as natural language.

| Attribute | Description |
|---|---|
| `option1` | { category: string, oneLineDifferentiator: string } |
| `option2` | { category: string, oneLineDifferentiator: string } |
| `preferenceQuestion` | Single lifestyle-framed question (e.g., "Would you rather have more boot space or a sportier feel?") |

**Constraint**: Exactly one `preferenceQuestion` per tie-break. No follow-up preference questions regardless of the answer.

---

## No schema changes required

The `ConcludeConversationInput` interface and `concludeConversationTool` Anthropic tool definition in `app/api/chat/route.ts` are **unchanged**. The `RequirementInference` entity maps directly onto the existing tool schema — only the prompting strategy changes, not the data contract.
