import type { CarSearchPayload } from '@/lib/types/n8n';
import { fireWebhookWithRetry } from '@/lib/n8n/trigger';

export async function POST(request: Request): Promise<Response> {
  const webhookUrl = process.env.N8N_WEBHOOK_CAR_SEARCH_URL;
  if (!webhookUrl) {
    return Response.json({ status: 'failed', errorMessage: 'Webhook URL not configured' }, { status: 500 });
  }

  let payload: CarSearchPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ status: 'failed', errorMessage: 'Invalid payload' }, { status: 400 });
  }

  const result = await fireWebhookWithRetry(webhookUrl, payload);
  return Response.json(result, { status: result.status === 'success' ? 200 : 502 });
}
