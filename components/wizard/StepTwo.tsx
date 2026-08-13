import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { priorityOptions } from '@/lib/wizard/config';
import type { StepProps } from '@/components/wizard/types';

const MAX_PRIORITIES = priorityOptions.length;

export function StepTwo({ answers, setAnswers }: StepProps) {
  const toggle = (label: string) => {
    setAnswers((current) => ({
      ...current,
      priorities: current.priorities.includes(label)
        ? current.priorities.filter((item) => item !== label)
        : current.priorities.length < MAX_PRIORITIES
          ? [...current.priorities, label]
          : current.priorities,
    }));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[#7b8479]">
        <span>Choose your top priorities</span>
        <span>
          {answers.priorities.length}/{MAX_PRIORITIES} selected
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {priorityOptions.map(({ label, icon: Icon }) => {
          const selected = answers.priorities.includes(label);
          return (
            <motion.button
              whileTap={{ scale: 0.98 }}
              key={label}
              onClick={() => toggle(label)}
              className={`relative flex min-h-[112px] flex-col justify-between rounded-[14px] border p-3.5 text-left transition ${selected ? 'border-[#243124] bg-[#f0f9dc] shadow-[0_0_0_1px_#243124]' : 'border-[#dfe3db] bg-white hover:border-[#a9b2a7]'}`}
            >
              <Icon size={20} className={selected ? 'text-[#253425]' : 'text-[#778176]'} />
              <span className="pr-3 text-[13px] font-semibold leading-4 text-[#1d281e]">
                {label}
              </span>
              {selected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#223122] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
