import { motion } from 'framer-motion';

export function SegmentedControl({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = values.join('-');
  return (
    <div className="flex rounded-xl bg-[#eef0eb] p-1">
      {values.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`relative flex-1 rounded-[9px] px-2 py-2.5 text-xs font-semibold transition ${value === item ? 'text-[#172117]' : 'text-[#778076] hover:text-[#263126]'}`}
        >
          {value === item && (
            <motion.span
              layoutId={`segment-${id}`}
              className="absolute inset-0 rounded-[9px] bg-white shadow-sm"
            />
          )}
          <span className="relative">{item}</span>
        </button>
      ))}
    </div>
  );
}
