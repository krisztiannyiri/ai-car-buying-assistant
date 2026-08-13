import type { SearchResultItem } from '@/lib/types/n8n';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  searchResults?: { items: SearchResultItem[]; totalCount: number };
}

export type SessionStatus = 'active' | 'concluded' | 'refining';

export interface WizardAnswers {
  driving: string[];
  priorities: string[];
  seats: string;
  parking: string;
  powertrain: string;
  price: number;
  yearMin: number;
  yearMax: number;
  notes: string;
}

export interface MessageParam {
  role: MessageRole;
  content: string;
}

export type ChatErrorType = 'rate_limit' | 'connection' | 'api_error' | 'unknown';

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}
