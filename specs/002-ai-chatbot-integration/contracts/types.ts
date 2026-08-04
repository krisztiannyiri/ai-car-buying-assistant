/**
 * TypeScript interfaces for the AI Chatbot Integration feature.
 * This file is the authoritative contract; implementations must satisfy these types.
 * No runtime usage — design/planning artifact only.
 */

// --- Core message entity (client-side) ---

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;          // crypto.randomUUID() — client-generated; stripped before API call
  role: MessageRole;
  content: string;
}

// --- ChatInterface local state ---

export interface ConversationState {
  messages: Message[];       // full visible history — never pruned in the UI
  isStreaming: boolean;       // true while a response is in flight
  streamingContent: string;  // accumulates current assistant token stream
  error: string | null;      // human-readable error; null when no error
}

// --- API request / response shapes ---

// Sent to POST /api/chat — id stripped, only role+content forwarded
export interface MessageParam {
  role: MessageRole;
  content: string;
}

export interface ChatRequestBody {
  messages: MessageParam[];  // max 20 items (pruned client-side before sending)
}

// Returned by POST /api/chat on non-2xx responses
export type ChatErrorType = 'rate_limit' | 'connection' | 'api_error' | 'unknown';

export interface ChatErrorResponse {
  error: {
    type: ChatErrorType;
    message: string;
  };
}

// --- Updated component prop interfaces ---

// components/ChatInterface/ChatInterface.tsx
// Upgraded from Server Component skeleton to 'use client' Client Component.
// No external props — all state is managed internally.
export type ChatInterfaceProps = Record<string, never>;
