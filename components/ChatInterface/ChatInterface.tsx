'use client';

import { useState, useRef, useEffect } from 'react';
import type { ConversationState, Message, MessageParam, SessionStatus } from '@/lib/types/chat';
import type { ChatErrorResponse, ChatErrorType } from '@/lib/types/chat';
import type { WebhookEvent, CarSearchPayload } from '@/lib/types/n8n';
import styles from './ChatInterface.module.css';

const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  rate_limit: 'Too many requests — please wait a moment and try again',
  connection: "Couldn't reach the AI service — check your connection and retry",
  api_error: 'The AI service returned an error — please try again',
  unknown: 'Something went wrong — please try again',
};

const SENTINEL = '\n\n__WEBHOOK_EVENT__';

export default function ChatInterface() {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    isStreaming: false,
    streamingContent: '',
    error: null,
    sessionStatus: 'active',
    roundCount: 0,
    consecutiveRefusals: 0,
    isRefinement: false,
    webhookError: null,
  });
  const [userEmail, setUserEmail] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryPayloadRef = useRef<CarSearchPayload | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [state.messages, state.streamingContent]);

  async function sendMessage() {
    const input = inputRef.current;
    if (!input) return;
    const trimmed = input.value.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };
    input.value = '';

    // T012: Determine refinement mode transition
    const goingIntoRefinement = state.sessionStatus === 'concluded';
    const effectiveIsRefinement = state.isRefinement || goingIntoRefinement;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      error: null,
      webhookError: null,
      ...(goingIntoRefinement
        ? { sessionStatus: 'refining' as SessionStatus, isRefinement: true }
        : {}),
    }));

    const apiMessages: MessageParam[] = [
      ...[...state.messages, userMessage].slice(-20).map(({ role, content }) => ({ role, content })),
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          isRefinement: effectiveIsRefinement,
          roundCount: state.roundCount,
          userEmail: userEmail || null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData: ChatErrorResponse = await response.json();
        const errorMessage = ERROR_MESSAGES[errorData.error.type] ?? ERROR_MESSAGES.unknown;
        setState((prev) => ({ ...prev, isStreaming: false, error: errorMessage }));
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // T008: Strip sentinel from live display so it never appears in chat
        const sentinelIdx = accumulated.indexOf(SENTINEL);
        const displayContent = sentinelIdx !== -1 ? accumulated.slice(0, sentinelIdx) : accumulated;
        setState((prev) => ({ ...prev, streamingContent: displayContent }));
      }

      // T008: After stream closes, detect and parse sentinel
      const sentinelIdx = accumulated.indexOf(SENTINEL);

      if (sentinelIdx !== -1) {
        const displayText = accumulated.slice(0, sentinelIdx);
        const eventJson = accumulated.slice(sentinelIdx + SENTINEL.length);
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: displayText,
        };

        try {
          const webhookEvent = JSON.parse(eventJson) as WebhookEvent;

          if (webhookEvent.status === 'success') {
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, assistantMessage],
              isStreaming: false,
              streamingContent: '',
              sessionStatus: 'concluded',
              webhookError: null,
            }));
          } else {
            // T009: Store retry payload and surface error
            if (webhookEvent.retryPayload) {
              retryPayloadRef.current = webhookEvent.retryPayload;
            }
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, assistantMessage],
              isStreaming: false,
              streamingContent: '',
              webhookError:
                webhookEvent.errorMessage ?? 'The search could not be completed. Please try again.',
            }));
          }
        } catch {
          // Sentinel JSON parse failed — treat as normal message
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
            isStreaming: false,
            streamingContent: '',
            roundCount: prev.roundCount + 1,
          }));
        }
      } else {
        // T011: No sentinel — normal Q&A round, increment count
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
          roundCount: prev.roundCount + 1,
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: ERROR_MESSAGES.unknown,
      }));
    }
  }

  // T009: Retry the webhook with the stored payload
  async function retryWebhook() {
    const payload = retryPayloadRef.current;
    if (!payload) return;

    setState((prev) => ({ ...prev, webhookError: null, isStreaming: true }));

    try {
      const response = await fetch('/api/webhook-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        retryPayloadRef.current = null;
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          sessionStatus: 'concluded',
          webhookError: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          webhookError: 'Retry failed. Please try again.',
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        webhookError: 'Retry failed. Please try again.',
      }));
    }
  }

  function startNewConversation() {
    abortControllerRef.current?.abort();
    retryPayloadRef.current = null;
    setState({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
      sessionStatus: 'active',
      roundCount: 0,
      consecutiveRefusals: 0,
      isRefinement: false,
      webhookError: null,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!state.isStreaming) {
        sendMessage();
      }
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.toolbar}>
        {/* T013: Refining badge */}
        {state.sessionStatus === 'refining' && (
          <span className={styles.refiningBadge}>Refining your search</span>
        )}
        <button
          type="button"
          className={styles.newConversationButton}
          onClick={startNewConversation}
        >
          New conversation
        </button>
      </div>

      <div className={styles.messages} ref={chatContainerRef}>
        {state.messages.length === 0 && !state.isStreaming && (
          <p className={styles.placeholder}>Your conversation will appear here</p>
        )}
        {state.messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}
          >
            {msg.content}
          </div>
        ))}
        {state.isStreaming && (
          <div className={styles.assistantBubble}>
            {state.streamingContent ? (
              state.streamingContent
            ) : (
              <span className={styles.loadingIndicator}>
                <span />
                <span />
                <span />
              </span>
            )}
          </div>
        )}
        {state.error && <p className={styles.errorMessage}>{state.error}</p>}
        {/* T009: Webhook error with retry */}
        {state.webhookError && (
          <div className={styles.errorMessage}>
            <span>{state.webhookError}</span>
            <button
              type="button"
              className={styles.retryButton}
              onClick={retryWebhook}
              disabled={state.isStreaming}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className={styles.emailRow}>
        <label htmlFor="userEmail" className={styles.emailLabel}>
          Get results by email (optional)
        </label>
        <input
          id="userEmail"
          type="email"
          className={styles.emailInput}
          placeholder="your@email.com"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
        />
      </div>

      <div className={styles.inputRow}>
        <textarea
          ref={inputRef}
          className={styles.textarea}
          placeholder="Ask me anything about buying a car…"
          disabled={state.isStreaming}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="button"
          className={styles.sendButton}
          disabled={state.isStreaming}
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </section>
  );
}
