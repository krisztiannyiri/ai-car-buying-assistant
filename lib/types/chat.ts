import type { SearchResultItem } from '@/lib/types/n8n';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  searchResults?: { items: SearchResultItem[]; totalCount: number };
}

export type SessionStatus = 'active' | 'concluding' | 'concluded' | 'refining';

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

export interface ConversationState {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  sessionStatus: SessionStatus;
  roundCount: number;
  consecutiveRefusals: number;
  isRefinement: boolean;
  webhookError: string | null;
  isSearching: boolean;
  searchResults: SearchResultItem[] | null;
  totalResultCount: number;
}

export interface MessageParam {
  role: MessageRole;
  content: string;
}

export interface ChatRequestBody {
  messages: MessageParam[];
  isRefinement: boolean;
  roundCount: number;
  wizardAnswers?: WizardAnswers;
  userEmail?: string | null;
}

export type ChatErrorType = 'rate_limit' | 'connection' | 'api_error' | 'unknown';

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}

export type ChatInterfaceProps = Record<string, never>;
