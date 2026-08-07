import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ChatErrorType } from '@/lib/types/chat';
import type { CarSearchPayload, WebhookEvent } from '@/lib/types/n8n';
import { fireWebhookWithRetry } from '@/lib/n8n/trigger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ROUND_LIMIT = 5;
const MAX_EXTENSIONS = 3;

interface ConcludeConversationInput {
  budgetMax: number | null;
  bodyTypes: string[];
  fuelTypes: string[];
  transmission: 'manual' | 'automatic' | 'any';
  minSeats: number | null;
  features: Array<{ name: string; mandatory: boolean }>;
  yearMin: number | null;
  yearMax: number | null;
  engineDisplacements: string[];
  usageContext: 'commute' | 'family' | 'offroad' | 'performance' | 'any';
  annualMileage: string | null;
  endTrigger: CarSearchPayload['endTrigger'];
}

function buildSystemPrompt(isRefinement: boolean, roundCount: number): string {
  const extensionCount = Math.floor(roundCount / ROUND_LIMIT);

  const refinementContext = isRefinement
    ? `This is a REFINEMENT session — the user has already completed a search and wants to adjust their criteria. Review the conversation history to understand their original needs, acknowledge the amendment(s) they want to make, ask if anything else needs changing, then call \`conclude_conversation\` with the fully updated payload derived from your expert judgement. Use \`endTrigger: "refinement"\`.`
    : `This is a fresh conversation. Begin by understanding the user's lifestyle and usage needs from scratch.`;

  return `You are an expert car buying advisor. Your role is to understand the user's real-world needs and lifestyle, then recommend the most suitable vehicle based on your automotive expertise. You never ask users to specify technical car details — you determine those yourself.

## Conversation flow
Ask ONE question at a time about the user's lifestyle and usage. Cover these topics in a natural order:
- How far they drive on a typical day (in km or miles)
- Whether most of their driving is in the city, on motorways, or a mix
- Whether they have somewhere at home or at work where they could charge an electric car overnight
- How many people they typically carry
- Whether they ever carry large loads — bikes, pushchairs, sports gear, or similar
- Whether they need to tow anything — a trailer, caravan, or boat
- Their maximum budget
- Any specific features they care about (heated seats, parking sensors, Apple CarPlay, etc.)

Do NOT ask about fuel type, body type (e.g., hatchback, SUV), drivetrain, transmission, engine displacement, or any other technical vehicle attribute. You will determine all of these yourself from the user's lifestyle answers.

## Handling refusals
If the user responds with "I don't know", "skip", "doesn't matter", "no preference", or similar:
- Acknowledge the skip warmly (e.g. "No problem, I'll keep that open.").
- Move immediately to the NEXT unanswered lifestyle question.
- NEVER end the conversation because of refusals — any number of consecutive "I don't know" answers simply skips those topics and continues questioning.

## When to call conclude_conversation
Call the \`conclude_conversation\` tool ONLY when:
1. Explicit end: The user says something like "I'm done", "find me cars", "search now", "that's all", "let's go", "stop asking", "go ahead and search".
2. Implicit end: The user's message clearly signals they are ready to search (e.g. "I think you have enough", "sounds good, search away").
3. Round-limit decline: You have presented suggestions at a check-in AND the user declined to continue questioning.
4. Soft ceiling reached: You have reached the maximum accepted extension limit and must conclude regardless.

NEVER call conclude_conversation due to refusals alone.

## Expert recommendation
Once you have gathered sufficient lifestyle information (at minimum: daily driving distance, charging availability, passenger count, and budget), proactively present a named vehicle recommendation — do not wait for the user to ask.

Your recommendation MUST:
- Name a specific vehicle category (e.g., "a mid-size hybrid SUV") or a well-known model family (e.g., "a Toyota Corolla Hybrid")
- Include at least 2 pros, each explicitly tied to something the user told you (e.g., "Ideal for your city commute since the electric motor handles stop-start traffic efficiently" — not generic claims like "good fuel economy")
- Include at least 1 con relevant to their situation (e.g., "Higher upfront cost than a petrol equivalent, though your mileage means it pays back within a few years")
- Avoid quoting engine specifications, horsepower figures, displacement numbers, or transmission types as pros or cons unless the user specifically asked about them

When the user challenges your recommendation with "why not X?", provide a factual comparison between your recommended option and the alternative, framed in terms of the user's specific lifestyle constraints — not abstract technical specifications.

## Automotive misconception correction
When a user states a technically incorrect belief about a car-related topic (scoped to: fuel types, drivetrains, running costs, range, and safety ratings), correct it once in plain language tied to their specific situation.

Rules for corrections:
- Issue the correction ONCE per misconception per session — do not repeat it.
- Keep the correction concise: one or two sentences maximum.
- Tie it to the user's specific situation (e.g., "For your city commute, a diesel's torque advantage would rarely come into play").
- After correcting, continue naturally to the next lifestyle question or recommendation — do not dwell.
- Correct only automotive misconceptions. Do not correct errors about unrelated topics.

## Tie-breaking
When two vehicle options are genuinely equivalent — meaning all of the user's stated lifestyle constraints are equally well satisfied by both AND the options fall within the same price band (price difference of 15% or less) — do NOT make an arbitrary choice. Instead:

1. Present both options side by side, each with a one-sentence plain-language differentiator that highlights the meaningful lifestyle difference between them (e.g., "Option A gives you noticeably more boot space — better if you carry pushchairs or sports gear regularly. Option B has a sportier, lower driving position.").
2. Ask exactly ONE preference-based question that helps the user choose based on feel or lifestyle priority (e.g., "Would you prefer more load space or a more engaging drive?"). This question must be lifestyle-framed, not technical.
3. After receiving the user's answer — whatever it is — immediately commit to one recommendation. Do NOT ask any further preference questions for this tie.

If the options are NOT equivalent (one fits the user's lifestyle better by any objective measure), make the call yourself and explain why. Do not use tie-breaking to avoid making a recommendation.

## Round-limit check-in (every ${ROUND_LIMIT} completed rounds)
After every ${ROUND_LIMIT} completed question-answer pairs, pause and:
1. Based on the lifestyle constraints collected so far, name 2–3 specific vehicle categories or model families that fit, with a one-sentence reason for each tied to what the user told you.
2. Ask: "Would you like me to search with these as my starting point, or shall we go through a few more questions to sharpen the recommendation?"

- If the user wants to search → call \`conclude_conversation\` with \`endTrigger: "length-limit"\`.
- If the user wants to continue → resume lifestyle questioning and repeat this check-in after the next ${ROUND_LIMIT}-round interval.
- After ${MAX_EXTENSIONS} accepted continuations, deliver: "We've had a very thorough conversation — I have a strong picture of what you need. Let me run the search now." Then call \`conclude_conversation\` with \`endTrigger: "length-limit"\` regardless of user preference.

Current session context:
- Completed rounds: ${roundCount}
- Accepted extensions so far: ${extensionCount} of ${MAX_EXTENSIONS} maximum

## Session mode
${refinementContext}

## Inference rules when calling conclude_conversation
Fill EVERY field in \`conclude_conversation\` using your automotive expertise. Never ask the user for these values. Derive them from the lifestyle information collected.

### fuelTypes
- No home or work charging available → ["petrol"] for low mileage; ["petrol", "hybrid"] for high mileage or city driving; exclude full EV
- Charging available AND budget ≥ €25,000 → ["electric"] as primary; ["plugin-hybrid"] as alternative
- Charging available AND budget < €25,000 → ["hybrid", "petrol"]; used EV only if the user raised it
- Primarily city driving AND budget ≥ €20,000 → include "hybrid" or "mild-hybrid"; prefer over petrol
- Annual mileage > 25,000 km AND motorway dominant → include "diesel" or "hybrid"; exclude small-displacement petrol
- Annual mileage < 10,000 km → ["petrol"] or ["mild-hybrid"]; diesel running costs are uneconomical at low mileage

### bodyTypes
- 3+ regular passengers AND frequent cargo needs → ["mpv", "estate", "suv"]
- 2 passengers, city driving, budget ≤ €20,000 → ["hatchback", "crossover"]
- Frequent large cargo (bikes, pushchairs, sports gear) → ["estate", "suv"]
- Towing required → ["estate", "suv"]; minimum 2.0L engine or diesel
- Primarily solo commuting, no towing, no large cargo → ["hatchback", "saloon", "crossover"]

### engineDisplacements
- City driving + low annual mileage + petrol/hybrid → ["1.0", "1.2"] naturally aspirated; avoid turbocharged direct-injection
- Mixed or motorway + medium annual mileage → ["1.5", "2.0"] petrol or hybrid
- High mileage + motorway dominant → ["2.0"] petrol, ["1.6", "2.0"] diesel, or strong hybrid
- Towing required → ["2.0"] minimum
- Full EV recommended → ["any"]

### transmission
- EV or full hybrid → "automatic"
- Primarily city stop-start traffic → "automatic" preferred
- User has expressed no preference and none of the above apply → "any"

### Other fields
- usageContext: map from journey type and passenger count — city commute → "commute"; family transport → "family"; off-road mentioned → "offroad"; performance mentioned → "performance"; mixed or unclear → "any"
- annualMileage: estimate from daily driving distance × 250 working days; round to the nearest band (e.g. "10000-15000")
- yearMin: set to the year the user gave as their lower bound, or null if not discussed
- yearMax: set yourself based on model generation quality and the user's needs; null only if all years are equally suitable
- budgetMax: direct from the user's stated maximum; null if not discussed
- minSeats: direct from regular passenger count; null if not discussed
- features: direct from features the user mentioned; [] if none; mark hard requirements as mandatory: true
- endTrigger: choose the most accurate value — "explicit", "implicit", "length-limit", "refinement", or "unknown"

Only engage with car-related topics. Politely redirect unrelated questions.`;
}

const concludeConversationTool: Anthropic.Tool = {
  name: 'conclude_conversation',
  description:
    'Call this tool when the car-buying conversation is complete and the user\'s requirements are understood. This fires the search webhook. Do not call it mid-conversation. Populate every field; use "any" or [] for fields never discussed.',
  input_schema: {
    type: 'object',
    required: [
      'budgetMax',
      'bodyTypes',
      'fuelTypes',
      'transmission',
      'minSeats',
      'features',
      'yearMin',
      'yearMax',
      'engineDisplacements',
      'usageContext',
      'annualMileage',
      'endTrigger',
    ],
    properties: {
      budgetMax: {
        type: ['number', 'null'],
        description: 'Maximum budget in euros, or null if not discussed',
      },
      bodyTypes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred body types e.g. ["suv", "hatchback"] or ["any"]',
      },
      fuelTypes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred fuel types e.g. ["electric"] or ["any"]',
      },
      transmission: { type: 'string', enum: ['manual', 'automatic', 'any'] },
      minSeats: {
        type: ['number', 'null'],
        description: 'Minimum number of seats required, or null',
      },
      features: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'mandatory'],
          properties: {
            name: { type: 'string' },
            mandatory: {
              type: 'boolean',
              description: 'true = hard requirement, false = nice-to-have',
            },
          },
        },
        description: 'List of specific features the user mentioned; empty array if none',
      },
      yearMin: {
        type: ['number', 'null'],
        description: 'Minimum production year e.g. 2018, or null if not discussed',
      },
      yearMax: {
        type: ['number', 'null'],
        description: 'Maximum production year e.g. 2023, or null if not discussed',
      },
      engineDisplacements: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Preferred engine displacements e.g. ["1.4", "2.0"] or ["any"] if not discussed',
      },
      usageContext: {
        type: 'string',
        enum: ['commute', 'family', 'offroad', 'performance', 'any'],
      },
      annualMileage: {
        type: ['string', 'null'],
        description: "Approximate mileage band e.g. '10000-15000' or null",
      },
      endTrigger: {
        type: 'string',
        enum: ['explicit', 'implicit', 'length-limit', 'refinement', 'unknown'],
        description: 'Why the conversation is concluding',
      },
    },
  },
};

export async function POST(request: Request): Promise<Response> {
  let messages: MessageParam[];
  let isRefinement: boolean;
  let roundCount: number;
  let userEmail: string | null;

  try {
    const body = await request.json();
    messages = body.messages;
    isRefinement = typeof body.isRefinement === 'boolean' ? body.isRefinement : false;
    roundCount = typeof body.roundCount === 'number' ? body.roundCount : 0;
    userEmail = typeof body.userEmail === 'string' ? body.userEmail : null;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        {
          error: {
            type: 'unknown' as ChatErrorType,
            message: 'Something went wrong — please try again',
          },
        },
        { status: 500 }
      );
    }
  } catch {
    return Response.json(
      {
        error: {
          type: 'unknown' as ChatErrorType,
          message: 'Something went wrong — please try again',
        },
      },
      { status: 500 }
    );
  }

  const systemPrompt = buildSystemPrompt(isRefinement, roundCount);
  const webhookUrl = process.env.N8N_WEBHOOK_CAR_SEARCH_URL;

  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = client.messages.stream({
          model: 'claude-haiku-4-5',
          system: systemPrompt,
          max_tokens: 1500,
          messages,
          tools: [concludeConversationTool],
          tool_choice: { type: 'auto' },
        });

        let toolUseActive = false;
        let toolUseName = '';
        let toolUseInputJson = '';

        for await (const event of messageStream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              toolUseActive = true;
              toolUseName = event.content_block.name;
              toolUseInputJson = '';
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.delta.type === 'input_json_delta' && toolUseActive) {
              toolUseInputJson += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_stop' && toolUseActive) {
            toolUseActive = false;
            if (toolUseName === 'conclude_conversation' && webhookUrl) {
              const toolInput = JSON.parse(toolUseInputJson) as ConcludeConversationInput;
              const payload: CarSearchPayload = {
                budgetMax: toolInput.budgetMax,
                bodyTypes: toolInput.bodyTypes,
                fuelTypes: toolInput.fuelTypes,
                transmission: toolInput.transmission,
                minSeats: toolInput.minSeats,
                features: toolInput.features,
                yearMin: toolInput.yearMin,
                yearMax: toolInput.yearMax,
                engineDisplacements: toolInput.engineDisplacements,
                usageContext: toolInput.usageContext,
                annualMileage: toolInput.annualMileage,
                endTrigger: toolInput.endTrigger,
                isRefinement,
                userEmail,
              };
              controller.enqueue(encoder.encode('\n\n__SEARCH_STARTED__'));
              const result = await fireWebhookWithRetry(webhookUrl, payload);
              const webhookEvent: WebhookEvent = {
                status: result.status,
                endTrigger: payload.endTrigger,
                ...(result.status === 'failed'
                  ? { errorMessage: result.errorMessage, retryPayload: payload }
                  : { results: result.results ?? [], totalCount: result.totalCount ?? 0 }),
              };
              controller.enqueue(
                encoder.encode('\n\n__WEBHOOK_EVENT__' + JSON.stringify(webhookEvent))
              );
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    let status: number;
    let type: ChatErrorType;
    let message: string;

    if (error instanceof Anthropic.RateLimitError) {
      status = 429;
      type = 'rate_limit';
      message = 'Too many requests — please wait a moment and try again';
    } else if (error instanceof Anthropic.APIConnectionError) {
      status = 503;
      type = 'connection';
      message = "Couldn't reach the AI service — check your connection and retry";
    } else if (error instanceof Anthropic.APIError) {
      status = 502;
      type = 'api_error';
      message = 'The AI service returned an error — please try again';
    } else {
      status = 500;
      type = 'unknown';
      message = 'Something went wrong — please try again';
    }

    return Response.json({ error: { type, message } }, { status });
  }
}
