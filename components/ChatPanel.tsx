import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, X } from 'lucide-react';
import type { Message } from '@/lib/types/chat';

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: dot * 0.12 }}
          className="h-1.5 w-1.5 rounded-full bg-[#82907e]"
        />
      ))}
    </span>
  );
}

export function ChatPanel({
  open,
  setOpen,
  messages,
  streamingContent,
  onSend,
  isThinking,
  isSearching,
  webhookError,
  onRetry,
  userEmail,
  onEmailChange,
  inputRef,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: Message[];
  streamingContent: string;
  onSend: (message: string) => void;
  isThinking: boolean;
  isSearching: boolean;
  webhookError: string | null;
  onRetry: () => void;
  userEmail: string;
  onEmailChange: (email: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, streamingContent]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || isThinking) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-[#172117]/30 backdrop-blur-[2px] transition lg:hidden ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(92vw,370px)] flex-col border-l border-[#e2e5df] bg-[#fbfcf9] shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-[332px] lg:shrink-0 lg:translate-x-0 lg:shadow-none xl:w-[358px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e6e8e3] px-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#243124] text-[#c8f65a]">
              <Sparkles size={17} />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#fbfcf9] bg-[#70b63b]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1e2a1e]">Ask Cora</p>
              <p className="text-[11px] text-[#7d867b]">For nuance, questions, or edge cases</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#778076] hover:bg-[#eef0eb] lg:hidden"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          <div className="flex justify-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#a0a69e]">
              Today
            </span>
          </div>
          {messages.map((message) => (
            <motion.div
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              key={message.id}
              className={message.role === 'user' ? 'ml-9' : 'mr-6'}
            >
              {message.role === 'assistant' && (
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#778076]">
                  <Sparkles size={10} /> Cora
                </p>
              )}
              <div
                className={`rounded-2xl px-3.5 py-3 text-[13px] leading-[1.55] ${message.role === 'user' ? 'rounded-br-md bg-[#263526] text-white' : 'rounded-tl-md border border-[#e1e4de] bg-white text-[#445043]'}`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
          {isThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-6">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#778076]">
                <Sparkles size={10} /> Cora
              </p>
              {streamingContent ? (
                <div className="rounded-2xl rounded-tl-md border border-[#e1e4de] bg-white px-3.5 py-3 text-[13px] leading-[1.55] text-[#445043]">
                  {streamingContent}
                </div>
              ) : isSearching ? (
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#e1e4de] bg-white px-3.5 py-3 text-[13px] text-[#445043]">
                  <span>Searching for matching cars…</span>
                  <TypingDots />
                </div>
              ) : (
                <div className="inline-flex gap-1 rounded-2xl rounded-tl-md border border-[#e1e4de] bg-white px-4 py-3.5">
                  <TypingDots />
                </div>
              )}
            </motion.div>
          )}
          {webhookError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-6">
              <div className="rounded-2xl rounded-tl-md border border-[#f5c6cb] bg-[#fff5f5] px-3.5 py-3 text-[13px] leading-[1.55] text-[#8b2020]">
                <p>{webhookError}</p>
                <button
                  onClick={onRetry}
                  disabled={isThinking}
                  className="mt-2 rounded-lg bg-[#c53030] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9b2c2c] disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 space-y-3 border-t border-[#e6e8e3] bg-white p-4">
          <div>
            <label
              htmlFor="userEmail"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778076]"
            >
              Get results by email (optional)
            </label>
            <input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-[#cfd5cc] bg-[#fafbf8] px-3 py-2 text-[13px] text-[#263126] outline-none transition placeholder:text-[#9da49b] focus:border-[#71806d] focus:ring-2 focus:ring-[#c8f65a]/35"
            />
          </div>
          <form
            onSubmit={submit}
            className="flex items-center gap-2 rounded-xl border border-[#cfd5cc] bg-[#fafbf8] p-1.5 pl-3.5 focus-within:border-[#71806d] focus-within:ring-2 focus-within:ring-[#c8f65a]/35"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#263126] outline-none placeholder:text-[#9da49b]"
              placeholder="Tell Cora anything..."
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={!draft.trim() || isThinking}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#233223] text-white transition hover:bg-[#354735] disabled:bg-[#d9ddd6]"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
          <p className="text-center text-[9px] text-[#a0a69e]">
            Cora can make mistakes. Verify important details.
          </p>
        </div>
      </aside>
    </>
  );
}
