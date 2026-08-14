import { Check } from 'lucide-react';
import { steps } from '@/lib/wizard/config';

/**
 * Shared step tracker used by both AppSidebar and MobileNav. The two differ only
 * in spacing and the connecting rail, so `variant` covers the whole delta.
 */
export function StepList({
  currentStep,
  maxStep,
  onStep,
  variant,
}: {
  currentStep: number;
  maxStep: number;
  onStep: (index: number) => void;
  variant: 'sidebar' | 'drawer';
}) {
  const isSidebar = variant === 'sidebar';

  return (
    <div className={isSidebar ? 'relative mt-4' : 'mt-3 space-y-1'}>
      {isSidebar && <div className="absolute bottom-5 left-[21px] top-5 w-px bg-white/10" />}
      {steps.map((step, index) => {
        const isCurrent = index === currentStep;
        const isComplete = index < maxStep && !isCurrent;
        const canOpen = index <= maxStep;

        return (
          <button
            key={step}
            onClick={() => canOpen && onStep(index)}
            className={
              isSidebar
                ? `relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    isCurrent
                      ? 'bg-white/[0.08] text-white'
                      : isComplete
                        ? 'text-white/70 hover:text-white'
                        : 'cursor-default text-white/25'
                  }`
                : `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${
                    isCurrent
                      ? 'bg-white/10 text-white'
                      : isComplete
                        ? 'text-white/70'
                        : 'text-white/25'
                  }`
            }
          >
            <span
              className={
                isSidebar
                  ? `z-10 flex h-[19px] w-[19px] items-center justify-center rounded-full border text-[10px] ${
                      isComplete
                        ? 'border-[#c8f65a] bg-[#c8f65a] text-[#172117]'
                        : isCurrent
                          ? 'border-white bg-white text-[#172117]'
                          : 'border-white/15 bg-[#172117]'
                    }`
                  : `flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                      isComplete
                        ? 'border-[#c8f65a] bg-[#c8f65a] text-[#172117]'
                        : isCurrent
                          ? 'border-white bg-white text-[#172117]'
                          : 'border-white/20'
                    }`
              }
            >
              {isComplete ? <Check size={11} strokeWidth={isSidebar ? 3 : 2} /> : index + 1}
            </span>
            <span className={isCurrent ? 'font-semibold' : 'font-medium'}>{step}</span>
          </button>
        );
      })}
    </div>
  );
}
