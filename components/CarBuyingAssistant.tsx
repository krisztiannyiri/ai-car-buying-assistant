'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Menu,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { StepOne } from '@/components/wizard/StepOne';
import { StepTwo } from '@/components/wizard/StepTwo';
import { StepThree } from '@/components/wizard/StepThree';
import { StepFour } from '@/components/wizard/StepFour';
import { Results } from '@/components/Results';
import { ChatPanel } from '@/components/ChatPanel';
import { useWizardFlow } from '@/hooks/useWizardFlow';
import { useConversation } from '@/hooks/useConversation';
import { RESULTS_STEP, stepCopy, steps } from '@/lib/wizard/config';

/** Last wizard step the user fills in before the search fires. */
const FINAL_INPUT_STEP = RESULTS_STEP - 1;

export default function CarBuyingAssistant() {
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const openChat = () => {
    setChatOpen(true);
    window.setTimeout(() => chatInputRef.current?.focus(), 350);
  };

  const wizard = useWizardFlow();
  const conversation = useConversation({
    onSearchResolved: wizard.jumpToResults,
    onUserSend: () => setChatOpen(true),
  });

  const { currentStep, maxStep, answers, setAnswers, canContinue } = wizard;

  const resetFlow = () => {
    conversation.resetConversation();
    wizard.resetWizard();
  };

  /** The 3 → 4 transition *is* the search: advancing from the last input step fires it. */
  const continueFlow = () => {
    if (!canContinue || currentStep === RESULTS_STEP) return;
    wizard.advance();
    if (currentStep === FINAL_INPUT_STEP) {
      conversation.sendChat('', answers);
    }
  };

  const resultsLoading =
    (conversation.isStreaming || conversation.isSearching) && conversation.searchResults === null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7f3] text-[#172117]">
      <AppSidebar
        currentStep={currentStep}
        maxStep={maxStep}
        onStep={wizard.goToStep}
        onReset={resetFlow}
      />
      <MobileNav
        open={menuOpen}
        setOpen={setMenuOpen}
        currentStep={currentStep}
        maxStep={maxStep}
        onStep={wizard.goToStep}
        onReset={resetFlow}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#e2e5df] bg-[#f9faf7]/95 px-4 backdrop-blur sm:px-6 lg:h-[72px] lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe3db] text-[#4e5a4d]"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Logo compact />
            <span className="text-[16px] font-semibold tracking-[-0.03em] text-[#172117]">
              Cora
            </span>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#7d867b] lg:flex">
            <span className="font-semibold text-[#334033]">Find my next car</span>
            <ChevronRight size={13} />
            <span>{steps[currentStep]}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={resetFlow}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#647063] hover:bg-[#eef0eb] sm:flex"
            >
              <RefreshCw size={14} /> Start over
            </button>
            <button
              onClick={openChat}
              className="flex items-center gap-2 rounded-lg border border-[#ced4cb] bg-white px-3 py-2 text-xs font-semibold text-[#344134] shadow-sm hover:border-[#909b8e] lg:hidden"
            >
              <MessageCircle size={15} /> Ask Cora
            </button>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1">
          <main ref={wizard.mainScrollRef} className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[780px] px-4 pb-10 pt-7 sm:px-8 sm:pt-10 xl:pt-12">
              <div className="mb-8">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7d867b]">
                  <span>
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#e2e6de]">
                  <motion.div
                    animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                    className="h-full rounded-full bg-[#90bd39]"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.section
                  key={currentStep}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.26, ease: 'easeOut' }}
                >
                  <div className="mb-7 flex gap-3.5">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#243124] text-[#c8f65a] shadow-[0_5px_15px_rgba(36,49,36,0.16)]">
                      <Sparkles size={17} />
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#658237]">
                        {stepCopy[currentStep].eyebrow}
                      </p>
                      <h1 className="max-w-[650px] text-[27px] font-semibold leading-[1.13] tracking-[-0.045em] text-[#172117] sm:text-[34px]">
                        {stepCopy[currentStep].title}
                      </h1>
                      <p className="mt-3 max-w-[625px] text-sm leading-6 text-[#697368] sm:text-[15px]">
                        {stepCopy[currentStep].body}
                      </p>
                    </div>
                  </div>

                  {currentStep === 0 && <StepOne answers={answers} setAnswers={setAnswers} />}
                  {currentStep === 1 && <StepTwo answers={answers} setAnswers={setAnswers} />}
                  {currentStep === 2 && <StepThree answers={answers} setAnswers={setAnswers} />}
                  {currentStep === 3 && <StepFour answers={answers} setAnswers={setAnswers} />}
                  {currentStep === RESULTS_STEP && (
                    <Results
                      isLoading={resultsLoading}
                      items={conversation.searchResults}
                      totalCount={conversation.totalResultCount}
                      userEmail={conversation.userEmail || null}
                    />
                  )}
                </motion.section>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#e0e4dc] pt-5">
                <button
                  onClick={wizard.goBack}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#647063] hover:text-[#263126] ${currentStep === 0 ? 'invisible' : ''}`}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={openChat}
                    className="hidden rounded-lg px-3 py-2.5 text-xs font-semibold text-[#657064] hover:bg-[#ecefe9] sm:block lg:hidden"
                  >
                    Add context in chat
                  </button>
                  {currentStep < RESULTS_STEP ? (
                    <button
                      onClick={continueFlow}
                      disabled={!canContinue}
                      className="flex items-center gap-2 rounded-xl bg-[#233223] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(35,50,35,0.17)] transition hover:-translate-y-0.5 hover:bg-[#314631] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#cfd4cb] disabled:shadow-none"
                    >
                      {currentStep === FINAL_INPUT_STEP ? 'Find my matches' : 'Continue'}{' '}
                      {currentStep === FINAL_INPUT_STEP ? (
                        <Sparkles size={15} />
                      ) : (
                        <ArrowRight size={15} />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={openChat}
                      className="flex items-center gap-2 rounded-xl bg-[#233223] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(35,50,35,0.17)] hover:bg-[#314631]"
                    >
                      Refine with Cora <MessageCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </main>

          <ChatPanel
            open={chatOpen}
            setOpen={setChatOpen}
            messages={conversation.messages}
            streamingContent={conversation.streamingContent}
            onSend={conversation.sendChat}
            isThinking={conversation.isStreaming}
            isSearching={conversation.isSearching}
            webhookError={conversation.webhookError}
            onRetry={conversation.retryWebhook}
            userEmail={conversation.userEmail}
            onEmailChange={conversation.setUserEmail}
            inputRef={chatInputRef}
          />
        </div>
      </div>
    </div>
  );
}
