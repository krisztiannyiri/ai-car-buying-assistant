import { appendFile } from 'fs/promises';
import { join } from 'path';
import type { CarSearchPayload, TriggerLogEntry, WebhookResult, SearchResultItem } from '@/lib/types/n8n';

function appendToLog(url: string, payload: CarSearchPayload, err: unknown): void {
  const entry: TriggerLogEntry = {
    timestamp: new Date().toISOString(),
    webhookUrl: new URL(url).pathname,
    payload,
    error: err instanceof Error ? err.message : String(err),
  };
  appendFile(join(process.cwd(), 'n8n-trigger.log'), JSON.stringify(entry) + '\n').catch(() => {});
}

export async function fireWebhookWithRetry(url: string, payload: CarSearchPayload): Promise<WebhookResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as {
        results?: SearchResultItem[];
        totalCount?: number;
      };
      return {
        status: 'success',
        results: Array.isArray(body.results) ? body.results : [],
        totalCount: typeof body.totalCount === 'number' ? body.totalCount : 0,
      };
    } catch (err) {
      lastError = err;
    }
  }
  appendToLog(url, payload, lastError);
  return {
    status: 'failed',
    errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
  };
}
