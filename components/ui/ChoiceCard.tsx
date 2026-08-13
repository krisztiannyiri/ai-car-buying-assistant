import { motion } from 'framer-motion';
import { Check, type LucideIcon } from 'lucide-react';

export function ChoiceCard({
  selected,
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  selected: boolean;
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group flex min-h-[86px] items-center gap-4 rounded-[14px] border p-4 text-left transition-all ${
        selected
          ? 'border-[#233223] bg-[#f0f9dc] shadow-[0_0_0_1px_#233223]'
          : 'border-[#dfe3db] bg-white hover:border-[#a9b2a7] hover:bg-[#fafbf8]'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${selected ? 'bg-[#c8f65a] text-[#172117]' : 'bg-[#f0f2ed] text-[#657064] group-hover:text-[#243124]'}`}
      >
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#1d281e]">{label}</span>
        {hint && <span className="mt-1 block text-xs leading-4 text-[#788177]">{hint}</span>}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#233223] bg-[#233223] text-white' : 'border-[#cdd3ca] bg-white'}`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </motion.button>
  );
}
