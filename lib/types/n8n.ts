export interface WebhookPayload {
  query: string;
  messageCount: number;
  timestamp: string;
}

export interface TriggerLogEntry {
  timestamp: string;
  webhookUrl: string;
  payload: WebhookPayload;
  error: string;
}
