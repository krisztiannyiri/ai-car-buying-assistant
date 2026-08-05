import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ChatErrorType } from '@/lib/types/chat';
import { fireWebhook } from '@/lib/n8n/trigger';
import type { WebhookPayload } from '@/lib/types/n8n';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant specialising in helping people research, compare, and purchase cars.
You have deep knowledge of car models, trim levels, pricing, financing, reliability ratings,
and the car-buying process.

Only answer questions related to car research, car comparisons, financing, insurance,
maintenance, and the car-buying process. If the user asks about anything unrelated to cars
or car buying, politely decline and redirect them: acknowledge their question briefly, explain
you are focused on car-buying topics, and offer to help with a car-related question instead.

Be conversational, accurate, and helpful. When comparing cars, use concrete data where
relevant (reliability scores, typical price ranges, fuel economy). Be honest about uncertainty.`;

export async function POST(request: Request): Promise<Response> {
  let messages: MessageParam[];

  try {
    const body = await request.json();
    messages = body.messages;
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

  const lastMessage = messages[messages.length - 1];
  if (
    process.env.N8N_WEBHOOK_CAR_SEARCH_URL &&
    lastMessage?.role === 'user' &&
    typeof lastMessage.content === 'string' &&
    lastMessage.content.trim()
  ) {
    const payload: WebhookPayload = {
      query: lastMessage.content.trim(),
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    };
    fireWebhook(process.env.N8N_WEBHOOK_CAR_SEARCH_URL, payload);
  }

  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const messageStream = client.messages.stream({
          model: 'claude-haiku-4-5',
          system: SYSTEM_PROMPT,
          max_tokens: 1024,
          messages,
        });

        for await (const event of messageStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
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
