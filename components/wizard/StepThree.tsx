import { Sparkles } from 'lucide-react';
import { DualRangeSlider } from '@/components/ui/DualRangeSlider';
import type { StepProps } from '@/components/wizard/types';

const PRICE_MIN = 15000;
const PRICE_MAX = 70000;
const YEAR_MIN = 2010;
const YEAR_MAX = 2025;

export function StepThree({ answers, setAnswers }: StepProps) {
  const priceProgress = ((answers.price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <div className="rounded-[16px] border border-[#dfe3db] bg-white p-5 sm:p-7">
      <div>
        <label htmlFor="price" className="mb-3 block text-xs font-semibold text-[#3a4639]">
          Total price you&apos;d pay for the car
        </label>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold text-[#172117]">
            ${answers.price.toLocaleString()}
          </span>
          <input
            id="price"
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step="1000"
            value={answers.price}
            onChange={(e) =>
              setAnswers((current) => ({ ...current, price: Number(e.target.value) }))
            }
            className="budget-slider flex-1"
            style={{ '--progress': `${priceProgress}%` } as React.CSSProperties}
            aria-label="Car price"
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-medium text-[#8a9288]">
          <span>$15k</span>
          <span>$70k</span>
        </div>
      </div>
      <div className="mt-7 border-t border-[#ebede8] pt-6">
        <label className="mb-3 block text-xs font-semibold text-[#3a4639]">Year range</label>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-[#172117]">{answers.yearMin}</span>
          <span className="text-sm text-[#8a9288]">–</span>
          <span className="text-2xl font-semibold text-[#172117]">{answers.yearMax}</span>
        </div>
        <DualRangeSlider
          min={YEAR_MIN}
          max={YEAR_MAX}
          step={1}
          valueMin={answers.yearMin}
          valueMax={answers.yearMax}
          onChangeMin={(val) => setAnswers((current) => ({ ...current, yearMin: val }))}
          onChangeMax={(val) => setAnswers((current) => ({ ...current, yearMax: val }))}
        />
        <div className="mt-2 flex justify-between text-[11px] font-medium text-[#8a9288]">
          <span>{YEAR_MIN}</span>
          <span>{YEAR_MAX}</span>
        </div>
      </div>
      <div className="mt-5 flex gap-2.5 rounded-xl bg-[#f4f6f1] p-3 text-xs leading-5 text-[#657064]">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-[#48612b]" />
        Older cars cost less upfront but newer ones bring better safety tech and lower running
        costs.
      </div>
    </div>
  );
}
