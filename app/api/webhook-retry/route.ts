import type { CarSearchPayload, WebhookResult } from '@/lib/types/n8n';
import { callSearchCars } from '@/lib/mcp/client';
import { isErrorEnvelope } from '@/lib/types/mcp';

/**
 * Retries a search that failed the first time. Goes through the same MCP tool as
 * /api/chat, so validation, auth, timeout, and normalization are identical — the
 * retry exercises the real code path rather than a parallel one.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: CarSearchPayload;
  try {
    payload = await request.json();
  } catch {
    const body: WebhookResult = { status: 'failed', errorMessage: 'Invalid payload' };
    return Response.json(body, { status: 400 });
  }

  const result = await callSearchCars(payload);

  if (isErrorEnvelope(result)) {
    const body: WebhookResult = { status: 'failed', errorMessage: result.message };
    return Response.json(body, { status: 502 });
  }

  const body: WebhookResult = {
    status: 'success',
    results: result.results,
    totalCount: result.totalCount,
  };
  return Response.json(body, { status: 200 });
}
