import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ChatErrorType, WizardAnswers } from '@/lib/types/chat';
import type { CarSearchPayload, WebhookEvent } from '@/lib/types/n8n';
import { callSearchCars, fetchMcpToolSchemas } from '@/lib/mcp/client';
import { isErrorEnvelope } from '@/lib/types/mcp';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


function buildSystemPrompt(isRefinement: boolean, wizardAnswers?: WizardAnswers): string {
  const base = `You are a car buying advisor. Only engage with car-related topics — politely redirect anything unrelated.`;

  const wizardBlock = wizardAnswers
    ? `The user's previously set preferences:
- Driving patterns: ${wizardAnswers.driving.join(', ') || 'not specified'}
- Priorities: ${wizardAnswers.priorities.join(', ') || 'not specified'}
- Budget: $${wizardAnswers.price.toLocaleString()}
- Year range: ${wizardAnswers.yearMin}–${wizardAnswers.yearMax}
- Seats needed: ${wizardAnswers.seats}
- Home parking: ${wizardAnswers.parking}
- Powertrain preference: ${wizardAnswers.powertrain}
- Notes: ${wizardAnswers.notes || 'none'}`
    : null;

  if (wizardAnswers && isRefinement) {
    return `${base}

${wizardBlock}

The user wants to refine their search. Write one short sentence confirming the adjustment (e.g. "Narrowing to hybrids under $30k."), then call \`search_cars\` immediately with the updated parameters. Do not ask for parameters that are already set.`;
  }

  if (wizardAnswers) {
    return `${base}

${wizardBlock}

Call \`search_cars\` immediately. Do not ask any questions unless the notes contain an ambiguity you cannot resolve.`;
  }

  if (isRefinement) {
    return `${base}

The user has seen results and wants to adjust. Write one short sentence confirming the adjustment (e.g. "Narrowing to hybrids under $30k."), then call \`search_cars\` immediately with the updated parameters. Do not ask for additional details.`;
  }

  return `${base} Write one short sentence confirming what you are searching for (e.g. "Searching for all hybrids."), then call \`search_cars\` immediately using only the parameters the user mentioned. Leave everything else as null or "any". Never ask for additional details.`;
}


export async function POST(request: Request): Promise<Response> {
  let messages: MessageParam[];
  let isRefinement: boolean;
  let userEmail: string | null;
  let wizardAnswers: WizardAnswers | undefined;

  try {
    const body = await request.json();
    messages = body.messages;
    isRefinement = typeof body.isRefinement === 'boolean' ? body.isRefinement : false;
    userEmail = typeof body.userEmail === 'string' ? body.userEmail : null;
    wizardAnswers = body.wizardAnswers ?? undefined;
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

  const systemPrompt = buildSystemPrompt(isRefinement, wizardAnswers);

  try {
    const tools = await fetchMcpToolSchemas();
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = client.messages.stream({
          model: 'claude-haiku-4-5',
          system: systemPrompt,
          max_tokens: 1500,
          messages,
          tools,
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
            if (toolUseName === 'search_cars') {
              const toolInput = JSON.parse(toolUseInputJson) as Omit<CarSearchPayload, 'isRefinement' | 'userEmail'>;
              const retryPayload: CarSearchPayload = {
                ...toolInput,
                isRefinement,
                userEmail,
              };
              controller.enqueue(encoder.encode('\n\n__SEARCH_STARTED__'));
              const mcpResult = await callSearchCars({ ...toolInput, isRefinement, userEmail });
              const webhookEvent: WebhookEvent = isErrorEnvelope(mcpResult)
                ? {
                    status: 'failed',
                    endTrigger: toolInput.endTrigger,
                    errorMessage: mcpResult.message,
                    retryPayload,
                  }
                : {
                    status: 'success',
                    endTrigger: toolInput.endTrigger,
                    results: mcpResult.results,
                    totalCount: mcpResult.totalCount,
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
    } else if (error instanceof Anthropic.APIConnectionError || error instanceof TypeError) {
      status = 503;
      type = 'connection';
      message = "Couldn't reach the AI service — check your connection and retry";
    } else if (error instanceof Anthropic.APIError) {
      status = 502;
      type = 'api_error';
      message = 'The AI service returned an error — please try again';
    } else {
      status = 502;
      type = 'api_error';
      message = 'The AI service returned an error — please try again';
    }

    return Response.json({ error: { type, message } }, { status });
  }
}
