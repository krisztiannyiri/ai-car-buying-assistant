# Research: Expert Advisor Mode

**Branch**: `006-expert-advisor-mode` | **Date**: 2026-08-06

## Decision 1: Scope of change — prompt only, no schema or flow changes

**Decision**: All changes are confined to `buildSystemPrompt()` in `app/api/chat/route.ts`. The `conclude_conversation` tool schema, streaming pipeline, webhook trigger, and all other files remain untouched.

**Rationale**: The `conclude_conversation` schema already uses the correct technical output fields (`fuelTypes`, `bodyTypes`, `transmission`, `engineDisplacements`, etc.). The current problem is that the system prompt instructs the assistant to *ask* the user for these values. The fix is to instruct the assistant to *infer* them instead. The underlying data contract does not need to change.

**Alternatives considered**: Adding an intermediate "inference step" node in n8n (rejected — out of scope per clarification Q1); adding a new API route (rejected — unnecessary complexity).

---

## Decision 2: Lifestyle question set to replace technical questions

**Decision**: Replace the current technical question sequence with the following lifestyle-first questions:

| Question | Replaces | Inference output |
|---|---|---|
| How far do you drive on a typical day or week? | Annual mileage / engine displacement | `annualMileage`, `engineDisplacements` |
| Is most of your driving in the city, on motorways, or mixed? | (implicit in usage) | `usageContext`, `fuelTypes` |
| Do you have somewhere at home or at work where you could charge an electric car overnight? | Fuel type | `fuelTypes` |
| How many people do you typically carry? | Min seats | `minSeats`, `bodyTypes` |
| Do you ever need to carry large loads — bikes, pushchairs, sports gear, or similar? | Body type | `bodyTypes` |
| Do you need to tow anything — a trailer, caravan, or boat? | (wasn't asked before) | `bodyTypes`, `engineDisplacements` |
| What is your maximum budget? | Budget | `budgetMax` |
| Are there any specific features that matter to you — heated seats, parking sensors, Apple CarPlay, etc.? | Features | `features` |

The assistant asks these in natural order, one at a time, skipping those the user has already answered implicitly.

**Rationale**: These questions map directly to the technical fields the `conclude_conversation` tool expects, without requiring any automotive knowledge from the user. Each answer uniquely informs one or more technical inference rules.

**Alternatives considered**: Single open-ended "tell me about your life" prompt (rejected — too unstructured to reliably populate all required fields); structured form input (rejected — breaks conversational UX).

---

## Decision 3: Inference rules to encode in the system prompt

**Decision**: The following inference rules are embedded in the system prompt instructions for populating `conclude_conversation` fields. They extend and replace the existing payload rules section.

### Fuel type inference
| User situation | Inference |
|---|---|
| No home/work charging available | Exclude full EV; prefer full hybrid or PHEV if budget allows; petrol otherwise |
| Home/work charging available + budget ≥ €25k | Full EV primary recommendation; PHEV as alternative |
| Home/work charging available + budget < €25k | Full hybrid or petrol; used EV only if user raises it |
| Primarily city driving + budget ≥ €20k | Full hybrid strongly preferred over petrol |
| Annual mileage > 25,000 km + motorway dominant | Diesel or strong hybrid; avoid small-displacement petrol |
| Annual mileage < 10,000 km | Petrol or mild hybrid; diesel running costs uneconomical |

### Body type inference
| User situation | Inference |
|---|---|
| 3+ regular passengers + cargo needs | MPV, estate, or large SUV |
| 2 passengers, city driving, small budget | Hatchback or small crossover |
| Frequent large cargo (bikes, etc.) | Estate or SUV with large boot |
| Towing required | Estate, SUV, or pickup; minimum 2.0L or diesel |
| Primarily solo commuting | Hatchback, saloon, or small SUV |

### Engine displacement inference (replaces existing rule)
| User situation | Inference |
|---|---|
| City + low mileage + petrol/hybrid | 1.0–1.2L naturally aspirated or hybrid system |
| Mixed/motorway + medium mileage | 1.5–2.0L petrol or hybrid |
| High mileage + motorway dominant | 2.0L petrol, 1.6–2.0L diesel, or strong hybrid |
| Towing required | 2.0L minimum |
| Full EV | ["any"] — displacement not applicable |

### Transmission inference
| User situation | Inference |
|---|---|
| EV or full hybrid recommended | automatic |
| Primarily city stop-start traffic | automatic preferred |
| User hasn't expressed preference, all other types | "any" |

**Rationale**: These rules cover the full range of combinations reachable through the lifestyle question set and eliminate ambiguity in field population.

---

## Decision 4: Expert recommendation and correction behaviour

**Decision**: The system prompt must instruct the assistant to:
1. After collecting sufficient lifestyle data (all high-priority questions answered or skipped), proactively present a named vehicle category or model recommendation with 2+ pros and 1+ con, all phrased in terms of the user's stated needs.
2. When a user volunteers a technically incorrect belief about cars (e.g., "diesel is more powerful than petrol"), immediately provide a plain-language correction tied to their specific situation before continuing.
3. Corrections are scoped to automotive topics only (fuel types, drivetrains, running costs, range, safety ratings).

**Rationale**: Passive question-answering does not constitute expert advice. The assistant must proactively synthesise and recommend, not wait to be asked.

**Alternatives considered**: Waiting for the user to ask for a recommendation (rejected — violates the expert advisor model); providing recommendations only at the round-limit check-in (rejected — delays value delivery).

---

## Decision 5: Tie-breaking equivalence and presentation

**Decision**: Two options are "equivalent" when no collected lifestyle constraint differentiates them AND they fall within the same price band (≤15% price difference). When this condition is met, the assistant presents both with a one-sentence plain-language differentiator and asks exactly one preference question (e.g., "Would you rather prioritise interior space or a sportier driving feel?"). It does not ask further preference questions regardless of the answer.

**Rationale**: Consistent with FR-006 and clarification Q3. The 15% price band is a concrete threshold that makes the equivalence condition testable.

**Alternatives considered**: No tie-breaking (rejected — would result in arbitrary choices users cannot understand); multiple preference questions (rejected — violates FR-006).

---

## Decision 6: Round-limit check-in compatibility

**Decision**: The existing round-limit check-in mechanism (`ROUND_LIMIT = 5`, `MAX_EXTENSIONS = 3`) is preserved unchanged. The new prompt continues to use it. However, the check-in now presents lifestyle-derived recommendations rather than asking technical questions. The check-in language is updated to be consistent with the expert advisor framing.

**Rationale**: The round-limit system is a quality control mechanism for conversation length, not a question-asking mechanism. It is compatible with the new advisor model and should be retained.
