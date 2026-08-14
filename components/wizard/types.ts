import type { WizardAnswers } from '@/lib/types/chat';

export type StepProps = {
  answers: WizardAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<WizardAnswers>>;
};
