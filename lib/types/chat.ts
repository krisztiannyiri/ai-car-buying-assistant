import type { SearchResultItem } from '@/lib/types/n8n';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  searchResults?: { items: SearchResultItem[]; totalCount: number };
}

export type SessionStatus = 'active' | 'concluding' | 'concluded' | 'refining';

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
}

export interface MessageParam {
  role: MessageRole;
  content: string;
}

export interface ChatRequestBody {
  messages: MessageParam[];
  isRefinement: boolean;
  roundCount: number;
}

export type ChatErrorType = 'rate_limit' | 'connection' | 'api_error' | 'unknown';

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}

export type ChatInterfaceProps = Record<string, never>;
