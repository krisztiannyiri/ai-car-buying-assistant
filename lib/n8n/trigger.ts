import { appendFile } from 'fs/promises';
import { join } from 'path';
import type { WebhookPayload, TriggerLogEntry } from '@/lib/types/n8n';

function appendToLog(url: string, payload: WebhookPayload, err: unknown): void {
  const entry: TriggerLogEntry = {
    timestamp: new Date().toISOString(),
    webhookUrl: new URL(url).pathname,
    payload,
    error: err instanceof Error ? err.message : String(err),
  };
  appendFile(join(process.cwd(), 'n8n-trigger.log'), JSON.stringify(entry) + '\n').catch(() => {});
}

export function fireWebhook(url: string, payload: WebhookPayload): void {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    appendToLog(url, payload, err);
  });
}
