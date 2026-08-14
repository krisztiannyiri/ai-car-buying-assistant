import { useState } from 'react';

export function DualRangeSlider({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
}: {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}) {
  const [activeThumb, setActiveThumb] = useState<'min' | 'max'>('max');
  const range = max - min;
  const leftPct = ((valueMin - min) / range) * 100;
  const rightPct = ((valueMax - min) / range) * 100;

  return (
    <div className="relative h-6 w-full">
      <div className="pointer-events-none absolute top-1/2 h-[5px] w-full -translate-y-1/2 rounded-full bg-[#e0e4dc]" />
      <div
        className="pointer-events-none absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[#7ea62f]"
        style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => {
          onChangeMin(Math.min(Number(e.target.value), valueMax));
          setActiveThumb('min');
        }}
        className="year-range-thumb"
        style={{ zIndex: activeThumb === 'min' ? 4 : 2 }}
        aria-label="Minimum year"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => {
          onChangeMax(Math.max(Number(e.target.value), valueMin));
          setActiveThumb('max');
        }}
        className="year-range-thumb"
        style={{ zIndex: activeThumb === 'max' ? 4 : 2 }}
        aria-label="Maximum year"
      />
    </div>
  );
}
