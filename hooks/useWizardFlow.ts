'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { WizardAnswers } from '@/lib/types/chat';
import { initialAnswers, RESULTS_STEP } from '@/lib/wizard/config';

/**
 * Owns wizard navigation and form answers. Deliberately knows nothing about the
 * conversation — the orchestrator composes `advance()` with `sendChat` so the
 * two concerns stay independent.
 */
export function useWizardFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({ ...initialAnswers });
  const mainScrollRef = useRef<HTMLElement>(null);

  const canContinue = useMemo(() => {
    if (currentStep === 0) return answers.driving.length > 0;
    if (currentStep === 1) return answers.priorities.length > 0;
    return true;
  }, [answers.driving.length, answers.priorities.length, currentStep]);

  const scrollToTop = useCallback(() => {
    window.setTimeout(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step <= maxStep) setCurrentStep(step);
    },
    [maxStep]
  );

  const goBack = useCallback(() => {
    setCurrentStep((step) => Math.max(0, step - 1));
  }, []);

  /** Move one step forward and scroll the pane back to the top. */
  const advance = useCallback(() => {
    const next = Math.min(currentStep + 1, RESULTS_STEP);
    setCurrentStep(next);
    setMaxStep((value) => Math.max(value, next));
    scrollToTop();
  }, [currentStep, scrollToTop]);

  /** Jump straight to the results step — used when a search resolves. */
  const jumpToResults = useCallback(() => {
    setCurrentStep(RESULTS_STEP);
    setMaxStep((value) => Math.max(value, RESULTS_STEP));
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setMaxStep(0);
    setAnswers({ ...initialAnswers });
  }, []);

  return {
    currentStep,
    maxStep,
    answers,
    setAnswers,
    canContinue,
    mainScrollRef,
    goToStep,
    goBack,
    advance,
    jumpToResults,
    resetWizard,
  };
}
