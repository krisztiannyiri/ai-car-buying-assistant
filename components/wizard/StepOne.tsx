import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { drivingOptions, MAX_DRIVING_CHOICES } from '@/lib/wizard/config';
import type { StepProps } from '@/components/wizard/types';

export function StepOne({ answers, setAnswers }: StepProps) {
  const toggle = (label: string) => {
    setAnswers((current) => ({
      ...current,
      driving: current.driving.includes(label)
        ? current.driving.filter((item) => item !== label)
        : current.driving.length < MAX_DRIVING_CHOICES
          ? [...current.driving, label]
          : current.driving,
    }));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[#7b8479]">
        <span>Select all that apply</span>
        <span>
          {answers.driving.length}/{MAX_DRIVING_CHOICES} selected
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {drivingOptions.map((option) => (
          <ChoiceCard
            key={option.label}
            {...option}
            selected={answers.driving.includes(option.label)}
            onClick={() => toggle(option.label)}
          />
        ))}
      </div>
    </div>
  );
}
