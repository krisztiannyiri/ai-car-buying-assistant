'use client';

import { useState, useRef, useEffect } from 'react';
import type { ConversationState, Message, MessageParam } from '@/lib/types/chat';
import type { ChatErrorResponse, ChatErrorType } from '@/lib/types/chat';
import styles from './ChatInterface.module.css';

const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  rate_limit: 'Too many requests — please wait a moment and try again',
  connection: "Couldn't reach the AI service — check your connection and retry",
  api_error: 'The AI service returned an error — please try again',
  unknown: 'Something went wrong — please try again',
};

export default function ChatInterface() {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    isStreaming: false,
    streamingContent: '',
    error: null,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      error: null,
    }));

    const apiMessages: MessageParam[] = [
      ...[...state.messages, userMessage].slice(-20).map(({ role, content }) => ({ role, content })),
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData: ChatErrorResponse = await response.json();
        const errorMessage = ERROR_MESSAGES[errorData.error.type] ?? ERROR_MESSAGES.unknown;
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: errorMessage,
        }));
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
        setState((prev) => ({ ...prev, streamingContent: accumulated }));
      }

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
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: ERROR_MESSAGES.unknown,
      }));
    }
  }

  function startNewConversation() {
    abortControllerRef.current?.abort();
    setState({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
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
