import type { CarSearchPayload } from '@/lib/types/n8n';
import { callSearchCars } from '@/lib/mcp/client';

export async function POST(request: Request): Promise<Response> {
  let payload: CarSearchPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ status: 'failed', errorMessage: 'Invalid payload' }, { status: 400 });
  }

  const result = await callSearchCars(payload);

  if ('code' in result) {
    return Response.json(
      { status: 'failed', errorMessage: result.message },
      { status: 502 }
    );
  }

  return Response.json(
    { status: 'success', results: result.results, totalCount: result.totalCount },
    { status: 200 }
  );
}
