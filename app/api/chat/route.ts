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
    ? `This is a REFINEMENT session — the user has already completed a search and wants to amend their criteria. Review the conversation history to understand their original criteria, acknowledge their amendment(s), ask if anything else needs changing, then call \`conclude_conversation\` with the fully updated payload. Use \`endTrigger: "refinement"\`.`
    : `This is a fresh conversation. Collect the user's car preferences from scratch.`;

  return `You are an AI assistant that helps people find their ideal car through a structured, friendly conversation. Your goal is to collect enough information to search for matching cars.

## Conversation flow
Ask ONE clarifying question at a time — never ask multiple questions at once. Cover these criteria in a natural order:
- Body type (SUV, hatchback, saloon, estate, coupé, convertible, van, etc.)
- Budget (maximum in euros)
- Fuel type (petrol, diesel, electric, hybrid, plug-in hybrid, etc.)
- Transmission (manual or automatic)
- Minimum seats needed
- Primary use (commuting, family, off-road, performance)
- Minimum production year (ask as "how old a car are you comfortable with?" e.g. "2016 or newer" — collect only the lower bound; you will determine the upper bound yourself)
- Approximate annual mileage
- Specific features (heated seats, parking sensors, sunroof, Apple CarPlay, etc.)

Do NOT ask the user about engine displacement or engine size. You will decide this yourself based on their usage profile (see payload rules below).

## Handling refusals
If the user responds with "I don't know", "skip", "doesn't matter", "no preference", or similar:
- Acknowledge the skip warmly (e.g. "No problem, I'll leave that open.").
- Move immediately to the NEXT unanswered question.
- NEVER end the conversation because of refusals — any number of consecutive "I don't know" answers simply skips those fields and continues questioning.

## When to call conclude_conversation
Call the \`conclude_conversation\` tool ONLY when:
1. Explicit end: The user says something like "I'm done", "find me cars", "search now", "that's all", "let's go", "stop asking", "go ahead and search".
2. Implicit end: The user's message clearly signals they are ready to search (e.g. "I think you have enough", "sounds good, search away").
3. Round-limit decline: You have presented suggestions at a check-in AND the user declined to continue questioning.
4. Soft ceiling reached: You have reached the maximum accepted extension limit and must conclude regardless.

NEVER call conclude_conversation due to refusals alone.

## Round-limit check-in (every ${ROUND_LIMIT} completed rounds)
After every ${ROUND_LIMIT} completed question-answer pairs, pause and:
1. Present 2–4 concrete car type/model suggestions based on criteria collected so far.
2. Ask: "Would you like me to search now with these criteria, or shall we refine further?"

- If the user wants to search → call \`conclude_conversation\` with \`endTrigger: "length-limit"\`.
- If the user wants to continue → resume questioning and repeat this check-in after the next ${ROUND_LIMIT}-round interval.
- After ${MAX_EXTENSIONS} accepted continuations, deliver: "We've had a very thorough conversation — I really need to search now." Then call \`conclude_conversation\` with \`endTrigger: "length-limit"\` regardless of user preference.

Current session context:
- Completed rounds: ${roundCount}
- Accepted extensions so far: ${extensionCount} of ${MAX_EXTENSIONS} maximum

## Session mode
${refinementContext}

## Payload rules when calling conclude_conversation
- Fill in EVERY field — no omissions.
- Fields never discussed: use "any" (string fields), ["any"] (array fields), null (number fields).
- features: use [] if no features were mentioned; mark hard requirements as mandatory: true.
- yearMin: set to the year the user gave as their lower bound, or null if they have no preference.
- yearMax: set this yourself based on your knowledge of which production years are good for the matched car types. If a model generation had quality issues, reliability regressions, or changed significantly after a certain year and the newer variant no longer fits the user's criteria, cap yearMax accordingly. Use null only if all production years up to the present are equally suitable.
- engineDisplacements: decide this yourself — never ask the user. Base your decision on fuel type, usageContext, and annualMileage. Examples: low annual mileage city commuting with petrol → prefer naturally aspirated small displacement (e.g. ["1.0", "1.2"]) and avoid turbocharged direct-injection engines; high mileage motorway commuting → a larger displacement or diesel may suit better. Use ["any"] only when displacement genuinely does not affect suitability for their use case (e.g. electric or full hybrid).
- endTrigger: choose the most accurate value — "explicit" (clear end phrase), "implicit" (implied readiness), "length-limit" (round-limit check-in), "refinement" (refinement session), "unknown" (unclear).

Only engage with car-related topics. Politely redirect unrelated questions.`;
}

const concludeConversationTool: Anthropic.Tool = {
  name: 'conclude_conversation',
  description:
    'Call this tool when the car-buying conversation is complete and the user\'s requirements are understood. This fires the search webhook. Do not call it mid-conversation. Populate every field; use "any" or [] for fields never discussed.',
  input_schema: {
    type: 'object',
    required: [
      'budgetMax', 'bodyTypes', 'fuelTypes',
      'transmission', 'minSeats', 'features',
      'yearMin', 'yearMax', 'engineDisplacements',
      'usageContext', 'annualMileage', 'endTrigger',
    ],
    properties: {
      budgetMax: { type: ['number', 'null'], description: 'Maximum budget in euros, or null if not discussed' },
      bodyTypes: { type: 'array', items: { type: 'string' }, description: 'Preferred body types e.g. ["suv", "hatchback"] or ["any"]' },
      fuelTypes: { type: 'array', items: { type: 'string' }, description: 'Preferred fuel types e.g. ["electric"] or ["any"]' },
      transmission: { type: 'string', enum: ['manual', 'automatic', 'any'] },
      minSeats: { type: ['number', 'null'], description: 'Minimum number of seats required, or null' },
      features: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'mandatory'],
          properties: {
            name: { type: 'string' },
            mandatory: { type: 'boolean', description: 'true = hard requirement, false = nice-to-have' },
          },
        },
        description: 'List of specific features the user mentioned; empty array if none',
      },
      yearMin: { type: ['number', 'null'], description: 'Minimum production year e.g. 2018, or null if not discussed' },
      yearMax: { type: ['number', 'null'], description: 'Maximum production year e.g. 2023, or null if not discussed' },
      engineDisplacements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred engine displacements e.g. ["1.4", "2.0"] or ["any"] if not discussed',
      },
      usageContext: { type: 'string', enum: ['commute', 'family', 'offroad', 'performance', 'any'] },
      annualMileage: { type: ['string', 'null'], description: "Approximate mileage band e.g. '10000-15000' or null" },
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

  try {
    const body = await request.json();
    messages = body.messages;
    isRefinement = typeof body.isRefinement === 'boolean' ? body.isRefinement : false;
    roundCount = typeof body.roundCount === 'number' ? body.roundCount : 0;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: { type: 'unknown' as ChatErrorType, message: 'Something went wrong — please try again' } },
        { status: 500 },
      );
    }
  } catch {
    return Response.json(
      { error: { type: 'unknown' as ChatErrorType, message: 'Something went wrong — please try again' } },
      { status: 500 },
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
              };
              const result = await fireWebhookWithRetry(webhookUrl, payload);
              const webhookEvent: WebhookEvent = {
                status: result.status,
                endTrigger: payload.endTrigger,
                ...(result.status === 'failed'
                  ? { errorMessage: result.errorMessage, retryPayload: payload }
                  : {}),
              };
              controller.enqueue(
                encoder.encode('\n\n__WEBHOOK_EVENT__' + JSON.stringify(webhookEvent)),
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
