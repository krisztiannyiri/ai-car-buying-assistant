'use client';

import { useRef, useState } from 'react';
import type {
  ChatErrorResponse,
  Message,
  SessionStatus,
  WizardAnswers,
} from '@/lib/types/chat';
import type {
  CarSearchPayload,
  SearchResultItem,
  WebhookEvent,
  WebhookResult,
} from '@/lib/types/n8n';
import { SENTINEL_SEARCH_STARTED, SENTINEL_WEBHOOK_EVENT } from '@/lib/constants/sentinels';
import {
  ERROR_MESSAGES,
  initialMessages,
  MAX_HISTORY_MESSAGES,
  WIZARD_TRIGGER_MESSAGE,
} from '@/lib/wizard/config';

type UseConversationOptions = {
  /** Called when a search resolves successfully, so the wizard can show results. */
  onSearchResolved: () => void;
  /** Called when the user sends a free-text message, so the chat panel can open. */
  onUserSend: () => void;
};

function assistantMessage(content: string): Message {
  return { id: crypto.randomUUID(), role: 'assistant', content };
}

/**
 * Owns the Claude conversation: streaming, the sentinel protocol, search results,
 * and webhook retry. See ARCHITECTURE.md §5 for the wire format.
 */
export function useConversation({ onSearchResolved, onUserSend }: UseConversationOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('active');
  const [isRefinement, setIsRefinement] = useState(false);
  const [submittedWizardAnswers, setSubmittedWizardAnswers] = useState<WizardAnswers | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [totalResultCount, setTotalResultCount] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryPayloadRef = useRef<CarSearchPayload | null>(null);

  function resetConversation() {
    abortControllerRef.current?.abort();
    retryPayloadRef.current = null;
    setMessages([...initialMessages]);
    setIsStreaming(false);
    setStreamingContent('');
    setSessionStatus('active');
    setIsRefinement(false);
    setSubmittedWizardAnswers(null);
    setWebhookError(null);
    setIsSearching(false);
    setSearchResults(null);
    setTotalResultCount(0);
    setUserEmail('');
  }

  async function sendChat(text: string, wizardContext?: WizardAnswers) {
    const triggerText = wizardContext ? WIZARD_TRIGGER_MESSAGE : text;
    if (!triggerText.trim()) return;

    const goingIntoRefinement = sessionStatus === 'concluded';
    const effectiveIsRefinement = isRefinement || goingIntoRefinement;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let updatedMessages = messages;

    if (wizardContext) {
      setSubmittedWizardAnswers(wizardContext);
    } else {
      // Only the user's own messages enter the transcript; the wizard trigger stays synthetic.
      const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: text };
      updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      onUserSend();
    }

    setIsStreaming(true);
    setStreamingContent('');
    setWebhookError(null);

    if (goingIntoRefinement) {
      setSessionStatus('refining');
      setIsRefinement(true);
    }

    const apiMessages = [
      ...updatedMessages
        .filter((msg) => !msg.searchResults)
        .slice(-MAX_HISTORY_MESSAGES)
        .map(({ role, content }) => ({ role, content })),
      ...(wizardContext ? [{ role: 'user' as const, content: triggerText }] : []),
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          isRefinement: effectiveIsRefinement,
          userEmail: userEmail || null,
          wizardAnswers: wizardContext ?? submittedWizardAnswers ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData: ChatErrorResponse = await response.json();
        const errorMessage = ERROR_MESSAGES[errorData.error.type] ?? ERROR_MESSAGES.unknown;
        setIsStreaming(false);
        setMessages((prev) => [...prev, assistantMessage(errorMessage)]);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        // Render only the text before the earliest sentinel, so control data stays hidden.
        const webhookIdx = accumulated.indexOf(SENTINEL_WEBHOOK_EVENT);
        const searchStartedIdx = accumulated.indexOf(SENTINEL_SEARCH_STARTED);
        const markers = [webhookIdx, searchStartedIdx].filter((i) => i !== -1);
        const firstMarker = markers.length > 0 ? Math.min(...markers) : -1;

        setStreamingContent(firstMarker !== -1 ? accumulated.slice(0, firstMarker) : accumulated);
        setIsSearching(searchStartedIdx !== -1);
      }

      const sentinelIdx = accumulated.indexOf(SENTINEL_WEBHOOK_EVENT);

      if (sentinelIdx === -1) {
        // Plain conversation: no search happened, the whole buffer is the reply.
        setMessages((prev) => [...prev, assistantMessage(accumulated)]);
        setIsStreaming(false);
        setStreamingContent('');
        setIsSearching(false);
        return;
      }

      const searchStartedIdx = accumulated.indexOf(SENTINEL_SEARCH_STARTED);
      const prefixEnd =
        searchStartedIdx === -1 ? sentinelIdx : Math.min(sentinelIdx, searchStartedIdx);
      const displayText = accumulated.slice(0, prefixEnd);
      const eventJson = accumulated.slice(sentinelIdx + SENTINEL_WEBHOOK_EVENT.length);

      let webhookEvent: WebhookEvent;
      try {
        webhookEvent = JSON.parse(eventJson) as WebhookEvent;
      } catch {
        // Malformed tail — fall back to treating the whole prefix as a reply.
        setMessages((prev) => [...prev, assistantMessage(displayText)]);
        setIsStreaming(false);
        setStreamingContent('');
        setIsSearching(false);
        return;
      }

      if (displayText.trim()) {
        setMessages((prev) => [...prev, assistantMessage(displayText)]);
      }
      setIsStreaming(false);
      setStreamingContent('');
      setIsSearching(false);

      if (webhookEvent.status === 'success') {
        setSearchResults(webhookEvent.results ?? []);
        setTotalResultCount(webhookEvent.totalCount ?? 0);
        setSessionStatus('concluded');
        setWebhookError(null);
        onSearchResolved();
      } else {
        if (webhookEvent.retryPayload) {
          retryPayloadRef.current = webhookEvent.retryPayload;
        }
        setWebhookError(
          webhookEvent.errorMessage ?? 'The search could not be completed. Please try again.'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsStreaming(false);
      setMessages((prev) => [...prev, assistantMessage(ERROR_MESSAGES.unknown)]);
    }
  }

  async function retryWebhook() {
    const payload = retryPayloadRef.current;
    if (!payload) return;

    setWebhookError(null);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/webhook-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setIsStreaming(false);
        setWebhookError('Retry failed. Please try again.');
        return;
      }

      const data = (await response.json()) as WebhookResult;
      retryPayloadRef.current = null;
      setIsStreaming(false);
      setSearchResults(data.results ?? []);
      setTotalResultCount(data.totalCount ?? 0);
      setSessionStatus('concluded');
      setWebhookError(null);
      onSearchResolved();
    } catch {
      setIsStreaming(false);
      setWebhookError('Retry failed. Please try again.');
    }
  }

  return {
    messages,
    isStreaming,
    streamingContent,
    isSearching,
    searchResults,
    totalResultCount,
    webhookError,
    userEmail,
    setUserEmail,
    sendChat,
    retryWebhook,
    resetConversation,
  };
}
