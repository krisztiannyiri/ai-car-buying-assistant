'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronRight,
  CircleParking,
  ExternalLink,
  Gauge,
  Heart,
  Home,
  Leaf,
  Menu,
  MessageCircle,
  Mountain,
  RefreshCw,
  Route,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Message, WizardAnswers, SessionStatus, ChatErrorResponse, ChatErrorType } from '@/lib/types/chat';
import type { SearchResultItem, CarSearchPayload, WebhookEvent } from '@/lib/types/n8n';
import { SENTINEL_WEBHOOK_EVENT, SENTINEL_SEARCH_STARTED } from '@/lib/constants/sentinels';

type Answers = WizardAnswers;

type StepProps = {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
};

const SENTINEL = SENTINEL_WEBHOOK_EVENT;
const SEARCH_STARTED_SENTINEL = SENTINEL_SEARCH_STARTED;

const ERROR_MESSAGES: Record<ChatErrorType, string> = {
  rate_limit: 'Too many requests — please wait a moment and try again',
  connection: "Couldn't reach the AI service — check your connection and retry",
  api_error: 'The AI service returned an error — please try again',
  unknown: 'Something went wrong — please try again',
};

const steps = ['Your routine', 'What matters', 'Budget & Age', 'Practical fit', 'Your matches'];

const drivingOptions: { label: string; hint: string; icon: LucideIcon }[] = [
  { label: 'Daily commute', hint: 'Mostly weekday miles', icon: BriefcaseBusiness },
  { label: 'Family life', hint: 'School runs and passengers', icon: Users },
  { label: 'City errands', hint: 'Short trips and tight parking', icon: ShoppingBag },
  { label: 'Road trips', hint: 'Long weekends and highways', icon: Route },
  { label: 'Outdoors & gear', hint: 'Bikes, trails, or rough roads', icon: Mountain },
  { label: 'Work use', hint: 'Clients, tools, or deliveries', icon: CarFront },
];

const priorityOptions: { label: string; icon: LucideIcon }[] = [
  { label: 'Safety tech', icon: ShieldCheck },
  { label: 'Low running cost', icon: Leaf },
  { label: 'Comfort', icon: Sun },
  { label: 'Easy parking', icon: CircleParking },
  { label: 'Cargo room', icon: ShoppingBag },
  { label: 'Fun to drive', icon: Gauge },
  { label: 'Winter ready', icon: Mountain },
  { label: 'Premium feel', icon: Star },
];

const stepCopy = [
  {
    eyebrow: 'Start with real life, not specs',
    title: 'What does a normal week on the road look like?',
    body: 'Pick the situations that happen most. Two or three is plenty, and you can always add context in chat.',
  },
  {
    eyebrow: 'Your non-negotiables',
    title: 'What should your next car be especially good at?',
    body: 'Choose up to three. I will translate them into the features and specifications that matter.',
  },
  {
    eyebrow: 'Keep the cost comfortable',
    title: 'What can you spend, and how new do you want it?',
    body: "Set your top price and the year range you're comfortable with.",
  },
  {
    eyebrow: 'A quick reality check',
    title: 'A few details that can change the answer.',
    body: 'These help me rule out cars that look good on paper but will not work day to day.',
  },
  {
    eyebrow: 'Shortlist ready',
    title: 'Potential strong fits, based on your needs.',
    body: 'Ask Cora to compare or refine anything.',
  },
];

const initialAnswers: Answers = {
  driving: [],
  priorities: [],
  seats: '5 people',
  parking: 'Driveway',
  powertrain: 'Open to any',
  price: 31000,
  yearMin: 2019,
  yearMax: 2025,
  notes: '',
};

const initialMessages: Message[] = [
  {
    id: 'init-1',
    role: 'assistant',
    content:
      'I will handle the car jargon. Use the guided choices for the basics, and tell me anything unusual here whenever it comes to mind.',
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#c8f65a] text-[#172117]">
        <CarFront size={20} strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#172117] bg-white" />
      </div>
      {!compact && (
        <div>
          <div className="text-[17px] font-semibold tracking-[-0.03em] text-white">Cora</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.17em] text-white/40">
            Car intelligence
          </div>
        </div>
      )}
    </div>
  );
}

function AppSidebar({
  currentStep,
  maxStep,
  onStep,
  onReset,
}: {
  currentStep: number;
  maxStep: number;
  onStep: (index: number) => void;
  onReset: () => void;
}) {
  return (
    <aside className="hidden h-screen w-[252px] shrink-0 flex-col bg-[#172117] px-5 py-6 text-white lg:flex">
      <Logo />

      <button
        onClick={onReset}
        className="mt-8 flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-3 text-sm font-semibold text-[#172117] transition-transform hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-2.5">
          <Search size={17} /> New car search
        </span>
        <span className="text-lg font-light text-[#758075]">+</span>
      </button>

      <nav className="mt-5 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/55 transition hover:bg-white/[0.05] hover:text-white">
          <Bookmark size={17} /> Saved matches
        </button>
      </nav>

      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Your search
        </p>
        <div className="relative mt-4">
          <div className="absolute bottom-5 left-[21px] top-5 w-px bg-white/10" />
          {steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < maxStep && !isCurrent;
            const canOpen = index <= maxStep;
            return (
              <button
                key={step}
                onClick={() => canOpen && onStep(index)}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  isCurrent
                    ? 'bg-white/[0.08] text-white'
                    : isComplete
                      ? 'text-white/70 hover:text-white'
                      : 'cursor-default text-white/25'
                }`}
              >
                <span
                  className={`z-10 flex h-[19px] w-[19px] items-center justify-center rounded-full border text-[10px] ${
                    isComplete
                      ? 'border-[#c8f65a] bg-[#c8f65a] text-[#172117]'
                      : isCurrent
                        ? 'border-white bg-white text-[#172117]'
                        : 'border-white/15 bg-[#172117]'
                  }`}
                >
                  {isComplete ? <Check size={11} strokeWidth={3} /> : index + 1}
                </span>
                <span className={isCurrent ? 'font-semibold' : 'font-medium'}>{step}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function MobileNav({
  open,
  setOpen,
  currentStep,
  maxStep,
  onStep,
  onReset,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentStep: number;
  maxStep: number;
  onStep: (step: number) => void;
  onReset: () => void;
}) {
  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-[#172117]/35 backdrop-blur-[2px] transition lg:hidden ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col bg-[#172117] p-5 text-white shadow-2xl transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <button
          onClick={() => {
            onReset();
            setOpen(false);
          }}
          className="mt-8 flex items-center justify-between rounded-xl bg-white px-3.5 py-3 text-sm font-semibold text-[#172117]"
        >
          <span className="flex items-center gap-2.5">
            <Search size={17} /> New car search
          </span>
          <span className="text-lg font-light">+</span>
        </button>
        <p className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Your search
        </p>
        <div className="mt-3 space-y-1">
          {steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < maxStep && !isCurrent;
            const canOpen = index <= maxStep;
            return (
              <button
                key={step}
                onClick={() => {
                  if (canOpen) {
                    onStep(index);
                    setOpen(false);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${isCurrent ? 'bg-white/10 text-white' : isComplete ? 'text-white/70' : 'text-white/25'}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${isComplete ? 'border-[#c8f65a] bg-[#c8f65a] text-[#172117]' : isCurrent ? 'border-white bg-white text-[#172117]' : 'border-white/20'}`}
                >
                  {isComplete ? <Check size={11} /> : index + 1}
                </span>
                <span className={isCurrent ? 'font-semibold' : 'font-medium'}>{step}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-auto rounded-xl border border-white/10 p-4 text-xs leading-5 text-white/45">
          <span className="mb-1 flex items-center gap-2 font-semibold text-white/80">
            <ShieldCheck size={14} className="text-[#c8f65a]" /> Buyer-first recommendations
          </span>
          No sponsored rankings. Your needs decide the order.
        </div>
      </nav>
    </>
  );
}

function ChoiceCard({
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

function SegmentedControl({
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

function StepOne({ answers, setAnswers }: StepProps) {
  const toggle = (label: string) => {
    setAnswers((current) => ({
      ...current,
      driving: current.driving.includes(label)
        ? current.driving.filter((item) => item !== label)
        : current.driving.length < 3
          ? [...current.driving, label]
          : current.driving,
    }));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[#7b8479]">
        <span>Select all that apply</span>
        <span>{answers.driving.length}/3 selected</span>
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

const PRIORITY_COUNT = priorityOptions.length;

function StepTwo({ answers, setAnswers }: StepProps) {
  const toggle = (label: string) => {
    setAnswers((current) => ({
      ...current,
      priorities: current.priorities.includes(label)
        ? current.priorities.filter((item) => item !== label)
        : current.priorities.length < PRIORITY_COUNT
          ? [...current.priorities, label]
          : current.priorities,
    }));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-[#7b8479]">
        <span>Choose your top priorities</span>
        <span>{answers.priorities.length}/{PRIORITY_COUNT} selected</span>
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

function DualRangeSlider({
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

function StepThree({ answers, setAnswers }: StepProps) {
  return (
    <div className="rounded-[16px] border border-[#dfe3db] bg-white p-5 sm:p-7">
      <div>
        <label htmlFor="price" className="mb-3 block text-xs font-semibold text-[#3a4639]">
          Total price you'd pay for the car
        </label>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold text-[#172117]">
            ${answers.price.toLocaleString()}
          </span>
          <input
            id="price"
            type="range"
            min="15000"
            max="70000"
            step="1000"
            value={answers.price}
            onChange={(e) =>
              setAnswers((current) => ({ ...current, price: Number(e.target.value) }))
            }
            className="budget-slider flex-1"
            style={
              { '--progress': `${((answers.price - 15000) / 55000) * 100}%` } as React.CSSProperties
            }
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
          min={2010}
          max={2025}
          step={1}
          valueMin={answers.yearMin}
          valueMax={answers.yearMax}
          onChangeMin={(val) => setAnswers((current) => ({ ...current, yearMin: val }))}
          onChangeMax={(val) => setAnswers((current) => ({ ...current, yearMax: val }))}
        />
        <div className="mt-2 flex justify-between text-[11px] font-medium text-[#8a9288]">
          <span>2010</span>
          <span>2025</span>
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

function StepFour({ answers, setAnswers }: StepProps) {
  return (
    <div className="space-y-5 rounded-[16px] border border-[#dfe3db] bg-white p-5 sm:p-7">
      <div>
        <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#3a4639]">
          <Users size={15} /> Seats needed most days
        </div>
        <SegmentedControl
          values={['2-4 people', '5 people', '6+ people']}
          value={answers.seats}
          onChange={(seats) => setAnswers((current) => ({ ...current, seats }))}
        />
      </div>
      <div className="border-t border-[#ebede8] pt-5">
        <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#3a4639]">
          <Home size={15} /> Parking at home
        </div>
        <SegmentedControl
          values={['Driveway', 'Garage', 'Street']}
          value={answers.parking}
          onChange={(parking) => setAnswers((current) => ({ ...current, parking }))}
        />
      </div>
      <div className="border-t border-[#ebede8] pt-5">
        <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-[#3a4639]">
          <Zap size={15} /> Powertrain preference
        </div>
        <SegmentedControl
          values={['Open to any', 'Hybrid', 'Electric']}
          value={answers.powertrain}
          onChange={(powertrain) => setAnswers((current) => ({ ...current, powertrain }))}
        />
      </div>
      <div className="border-t border-[#ebede8] pt-5">
        <label htmlFor="notes" className="mb-2.5 block text-xs font-semibold text-[#3a4639]">
          Anything else I should know? <span className="font-normal text-[#929991]">Optional</span>
        </label>
        <textarea
          id="notes"
          value={answers.notes}
          onChange={(event) => setAnswers((current) => ({ ...current, notes: event.target.value }))}
          placeholder="For example: two large dogs, steep driveway, or frequent 300-mile trips..."
          className="min-h-[82px] w-full resize-none rounded-xl border border-[#dfe3db] bg-[#fafbf8] px-3.5 py-3 text-sm text-[#263126] outline-none transition placeholder:text-[#a4aaa2] focus:border-[#71806d] focus:bg-white focus:ring-2 focus:ring-[#c8f65a]/40"
        />
      </div>
    </div>
  );
}

function Results({
  isLoading,
  items,
  totalCount,
  userEmail,
}: {
  isLoading: boolean;
  items: SearchResultItem[] | null;
  totalCount: number;
  userEmail: string | null;
}) {
  const [saved, setSaved] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[16px] border border-[#dfe3db] bg-white animate-pulse sm:flex"
          >
            <div className="h-44 bg-[#e8ebe4] sm:h-auto sm:w-[210px]" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="h-5 w-2/3 rounded-lg bg-[#e8ebe4]" />
              <div className="h-3 w-1/3 rounded-lg bg-[#e8ebe4]" />
              <div className="h-4 w-full rounded-lg bg-[#e8ebe4]" />
              <div className="mt-auto h-4 w-1/4 rounded-lg bg-[#e8ebe4]" />
            </div>
          </div>
        ))}
        <p className="pt-2 text-center text-[11px] text-[#8a9288]">
          Searching for your best matches…
        </p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-[16px] border border-[#dfe3db] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#3a4639]">No matching cars found</p>
        <p className="mt-2 text-sm text-[#697368]">
          No matching cars were found for your criteria. Try broadening your search — for example,
          consider a wider budget range or additional body types.
        </p>
      </div>
    );
  }

  const displayItems = items.slice(0, 5);
  const overflowCount = totalCount - displayItems.length;

  return (
    <div className="space-y-3">
      {displayItems.map((car, index) => {
        const carKey = `${car.make}-${car.model}-${car.year}-${index}`;
        const priceLabel =
          car.price != null ? `$${car.price.toLocaleString()}` : 'Price not available';
        const specParts = [
          car.bodyType,
          car.fuelType?.join(' / '),
          car.transmission,
          car.seatCount ? `${car.seatCount} seats` : null,
        ].filter(Boolean);
        return (
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.11, duration: 0.45 }}
            key={carKey}
            className="group overflow-hidden rounded-[16px] border border-[#dfe3db] bg-white transition hover:border-[#b8c0b5] hover:shadow-[0_14px_40px_rgba(33,48,33,0.08)] sm:flex"
          >
            <div className="h-44 shrink-0 overflow-hidden bg-[#e8ebe4] sm:h-auto sm:w-[210px]">
              {car.imageUrl ? (
                <img
                  src={car.imageUrl}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <CarFront size={52} className="text-[#b5bfb3]" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-[-0.025em] text-[#172117]">
                    {car.year} {car.make} {car.model}
                  </h3>
                  {specParts.length > 0 && (
                    <p className="mt-1 text-xs text-[#7c847b]">
                      {specParts.join(' · ')}
                    </p>
                  )}
                  {car.mileage && (
                    <p className="mt-3 text-sm font-medium text-[#354135]">Mileage: {car.mileage} km</p>
                  )}
                  {car.features && car.features.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                      {car.features.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 text-[11px] text-[#707a6f]">
                          <Check size={11} className="text-[#507426]" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() =>
                    setSaved((current) =>
                      current.includes(carKey)
                        ? current.filter((k) => k !== carKey)
                        : [...current, carKey]
                    )
                  }
                  aria-label={`Save ${car.make} ${car.model}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${saved.includes(carKey) ? 'border-[#233223] bg-[#233223] text-[#c8f65a]' : 'border-[#dfe3db] text-[#7c847b] hover:text-[#233223]'}`}
                >
                  <Heart size={15} fill={saved.includes(carKey) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <span className="text-sm font-semibold text-[#263126]">{priceLabel}</span>
                {car.sourceUrl && (
                  <a
                    href={car.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-[#2d4722] hover:text-[#5d7c31]"
                  >
                    View listing <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </motion.article>
        );
      })}
      {overflowCount > 0 && (
        <p className="pt-2 text-center text-[11px] leading-5 text-[#8a9288]">
          {overflowCount} more {overflowCount === 1 ? 'match' : 'matches'} found
          {userEmail ? ` — check ${userEmail} for the full list` : ' - provide an email address to access the full list'}.
        </p>
      )}
    </div>
  );
}

function ChatPanel({
  open,
  setOpen,
  messages,
  streamingContent,
  onSend,
  isThinking,
  isSearching,
  webhookError,
  onRetry,
  userEmail,
  onEmailChange,
  inputRef,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: Message[];
  streamingContent: string;
  onSend: (message: string) => void;
  isThinking: boolean;
  isSearching: boolean;
  webhookError: string | null;
  onRetry: () => void;
  userEmail: string;
  onEmailChange: (email: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, streamingContent]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || isThinking) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-[#172117]/30 backdrop-blur-[2px] transition lg:hidden ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(92vw,370px)] flex-col border-l border-[#e2e5df] bg-[#fbfcf9] shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-[332px] lg:shrink-0 lg:translate-x-0 lg:shadow-none xl:w-[358px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e6e8e3] px-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#243124] text-[#c8f65a]">
              <Sparkles size={17} />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#fbfcf9] bg-[#70b63b]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1e2a1e]">Ask Cora</p>
              <p className="text-[11px] text-[#7d867b]">For nuance, questions, or edge cases</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#778076] hover:bg-[#eef0eb] lg:hidden"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          <div className="flex justify-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#a0a69e]">
              Today
            </span>
          </div>
          {messages.map((message) => (
            <motion.div
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              key={message.id}
              className={message.role === 'user' ? 'ml-9' : 'mr-6'}
            >
              {message.role === 'assistant' && (
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#778076]">
                  <Sparkles size={10} /> Cora
                </p>
              )}
              <div
                className={`rounded-2xl px-3.5 py-3 text-[13px] leading-[1.55] ${message.role === 'user' ? 'rounded-br-md bg-[#263526] text-white' : 'rounded-tl-md border border-[#e1e4de] bg-white text-[#445043]'}`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
          {isThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-6">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#778076]">
                <Sparkles size={10} /> Cora
              </p>
              {streamingContent ? (
                <div className="rounded-2xl rounded-tl-md border border-[#e1e4de] bg-white px-3.5 py-3 text-[13px] leading-[1.55] text-[#445043]">
                  {streamingContent}
                </div>
              ) : isSearching ? (
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#e1e4de] bg-white px-3.5 py-3 text-[13px] text-[#445043]">
                  <span>Searching for matching cars…</span>
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.span key={dot} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: dot * 0.12 }} className="h-1.5 w-1.5 rounded-full bg-[#82907e]" />
                    ))}
                  </span>
                </div>
              ) : (
                <div className="inline-flex gap-1 rounded-2xl rounded-tl-md border border-[#e1e4de] bg-white px-4 py-3.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.span key={dot} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: dot * 0.12 }} className="h-1.5 w-1.5 rounded-full bg-[#82907e]" />
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {webhookError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mr-6">
              <div className="rounded-2xl rounded-tl-md border border-[#f5c6cb] bg-[#fff5f5] px-3.5 py-3 text-[13px] leading-[1.55] text-[#8b2020]">
                <p>{webhookError}</p>
                <button
                  onClick={onRetry}
                  disabled={isThinking}
                  className="mt-2 rounded-lg bg-[#c53030] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9b2c2c] disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-[#e6e8e3] bg-white p-4 space-y-3">
          <div>
            <label
              htmlFor="userEmail"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778076]"
            >
              Get results by email (optional)
            </label>
            <input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-[#cfd5cc] bg-[#fafbf8] px-3 py-2 text-[13px] text-[#263126] outline-none transition placeholder:text-[#9da49b] focus:border-[#71806d] focus:ring-2 focus:ring-[#c8f65a]/35"
            />
          </div>
          <form
            onSubmit={submit}
            className="flex items-center gap-2 rounded-xl border border-[#cfd5cc] bg-[#fafbf8] p-1.5 pl-3.5 focus-within:border-[#71806d] focus-within:ring-2 focus-within:ring-[#c8f65a]/35"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#263126] outline-none placeholder:text-[#9da49b]"
              placeholder="Tell Cora anything..."
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={!draft.trim() || isThinking}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#233223] text-white transition hover:bg-[#354735] disabled:bg-[#d9ddd6]"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
          <p className="text-center text-[9px] text-[#a0a69e]">
            Cora can make mistakes. Verify important details.
          </p>
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<Answers>({ ...initialAnswers });

  // Conversation state
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('active');
  const [roundCount, setRoundCount] = useState(0);
  const [isRefinement, setIsRefinement] = useState(false);
  const [submittedWizardAnswers, setSubmittedWizardAnswers] = useState<WizardAnswers | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [totalResultCount, setTotalResultCount] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryPayloadRef = useRef<CarSearchPayload | null>(null);

  const canContinue = useMemo(() => {
    if (currentStep === 0) return answers.driving.length > 0;
    if (currentStep === 1) return answers.priorities.length > 0;
    return true;
  }, [answers.driving.length, answers.priorities.length, currentStep]);

  const goToStep = (step: number) => {
    if (step <= maxStep) setCurrentStep(step);
  };

  const resetFlow = () => {
    abortControllerRef.current?.abort();
    retryPayloadRef.current = null;
    setCurrentStep(0);
    setMaxStep(0);
    setAnswers({ ...initialAnswers });
    setMessages([...initialMessages]);
    setIsStreaming(false);
    setStreamingContent('');
    setSessionStatus('active');
    setRoundCount(0);
    setIsRefinement(false);
    setSubmittedWizardAnswers(null);
    setWebhookError(null);
    setIsSearching(false);
    setSearchResults(null);
    setTotalResultCount(0);
    setUserEmail('');
  };

  async function sendChat(text: string, wizardContext?: WizardAnswers) {
    const triggerText = wizardContext
      ? 'Find me the best matching cars based on my profile.'
      : text;

    if (!triggerText.trim()) return;

    const goingIntoRefinement = sessionStatus === 'concluded';
    const effectiveIsRefinement = isRefinement || goingIntoRefinement;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let updatedMessages = messages;

    if (wizardContext) {
      setSubmittedWizardAnswers(wizardContext);
    }

    if (!wizardContext) {
      // Only add user message to state for regular (non-wizard-trigger) chat
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
      };
      updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setChatOpen(true);
    }

    setIsStreaming(true);
    setStreamingContent('');
    setWebhookError(null);

    if (goingIntoRefinement) {
      setSessionStatus('refining');
      setIsRefinement(true);
    }

    const apiMessages = [
      ...updatedMessages
        .filter((msg) => !msg.searchResults)
        .slice(-20)
        .map(({ role, content }) => ({ role, content })),
      // Add the synthetic trigger as the last user message (not stored in state)
      ...(wizardContext ? [{ role: 'user' as const, content: triggerText }] : []),
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          isRefinement: effectiveIsRefinement,
          userEmail: userEmail || null,
          wizardAnswers: wizardContext ?? submittedWizardAnswers ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData: ChatErrorResponse = await response.json();
        const errorMessage = ERROR_MESSAGES[errorData.error.type] ?? ERROR_MESSAGES.unknown;
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: errorMessage },
        ]);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        const webhookIdx = accumulated.indexOf(SENTINEL);
        const searchStartedIdx = accumulated.indexOf(SEARCH_STARTED_SENTINEL);
        const markers = [webhookIdx, searchStartedIdx].filter((i) => i !== -1);
        const firstMarker = markers.length > 0 ? Math.min(...markers) : -1;
        const displayContent = firstMarker !== -1 ? accumulated.slice(0, firstMarker) : accumulated;
        const currentlySearching = searchStartedIdx !== -1;
        setStreamingContent(displayContent);
        setIsSearching(currentlySearching);
      }

      const sentinelIdx = accumulated.indexOf(SENTINEL);

      if (sentinelIdx !== -1) {
        const searchStartedIdx = accumulated.indexOf(SEARCH_STARTED_SENTINEL);
        const firstMarker = [sentinelIdx, searchStartedIdx].filter((i) => i !== -1);
        const displayText = accumulated.slice(0, Math.min(...firstMarker));
        const eventJson = accumulated.slice(sentinelIdx + SENTINEL.length);

        const trimmedDisplayText = displayText.trim();

        try {
          const webhookEvent = JSON.parse(eventJson) as WebhookEvent;

          if (webhookEvent.status === 'success') {
            const results = webhookEvent.results ?? [];
            const totalCount = webhookEvent.totalCount ?? 0;

            if (trimmedDisplayText) {
              const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: displayText,
              };
              setMessages((prev) => [...prev, assistantMessage]);
            }
            setSearchResults(results);
            setTotalResultCount(totalCount);
            setIsStreaming(false);
            setStreamingContent('');
            setSessionStatus('concluded');
            setWebhookError(null);
            setIsSearching(false);
            setCurrentStep(4);
            setMaxStep((prev) => Math.max(prev, 4));
          } else {
            if (webhookEvent.retryPayload) {
              retryPayloadRef.current = webhookEvent.retryPayload;
            }
            if (trimmedDisplayText) {
              const assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: displayText,
              };
              setMessages((prev) => [...prev, assistantMessage]);
            }
            setIsStreaming(false);
            setStreamingContent('');
            setWebhookError(
              webhookEvent.errorMessage ?? 'The search could not be completed. Please try again.'
            );
            setIsSearching(false);
          }
        } catch {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: displayText,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsStreaming(false);
          setStreamingContent('');
          setRoundCount((n) => n + 1);
          setIsSearching(false);
        }
      } else {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsStreaming(false);
        setStreamingContent('');
        setRoundCount((n) => n + 1);
        setIsSearching(false);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: ERROR_MESSAGES.unknown },
      ]);
    }
  }

  async function retryWebhook() {
    const payload = retryPayloadRef.current;
    if (!payload) return;

    setWebhookError(null);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/webhook-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json() as { results?: SearchResultItem[]; totalCount?: number };
        retryPayloadRef.current = null;
        setIsStreaming(false);
        setSearchResults(data.results ?? []);
        setTotalResultCount(data.totalCount ?? 0);
        setSessionStatus('concluded');
        setCurrentStep(4);
        setWebhookError(null);
      } else {
        setIsStreaming(false);
        setWebhookError('Retry failed. Please try again.');
      }
    } catch {
      setIsStreaming(false);
      setWebhookError('Retry failed. Please try again.');
    }
  }

  const continueFlow = () => {
    if (!canContinue || currentStep === 4) return;
    const next = currentStep + 1;
    setCurrentStep(next);
    setMaxStep((value) => Math.max(value, next));
    window.setTimeout(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);

    if (currentStep === 3) {
      sendChat('', answers);
    }
  };

  const openChat = () => {
    setChatOpen(true);
    window.setTimeout(() => chatInputRef.current?.focus(), 350);
  };

  const resultsLoading = (isStreaming || isSearching) && searchResults === null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7f3] text-[#172117]">
      <AppSidebar
        currentStep={currentStep}
        maxStep={maxStep}
        onStep={goToStep}
        onReset={resetFlow}
      />
      <MobileNav
        open={menuOpen}
        setOpen={setMenuOpen}
        currentStep={currentStep}
        maxStep={maxStep}
        onStep={goToStep}
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
          <main ref={mainScrollRef} className="min-w-0 flex-1 overflow-y-auto">
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
                  {currentStep === 4 && (
                    <Results
                      isLoading={resultsLoading}
                      items={searchResults}
                      totalCount={totalResultCount}
                      userEmail={userEmail || null}
                    />
                  )}
                </motion.section>
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#e0e4dc] pt-5">
                <button
                  onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
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
                  {currentStep < 4 ? (
                    <button
                      onClick={continueFlow}
                      disabled={!canContinue}
                      className="flex items-center gap-2 rounded-xl bg-[#233223] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(35,50,35,0.17)] transition hover:-translate-y-0.5 hover:bg-[#314631] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#cfd4cb] disabled:shadow-none"
                    >
                      {currentStep === 3 ? 'Find my matches' : 'Continue'}{' '}
                      {currentStep === 3 ? <Sparkles size={15} /> : <ArrowRight size={15} />}
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
            messages={messages}
            streamingContent={streamingContent}
            onSend={sendChat}
            isThinking={isStreaming}
            isSearching={isSearching}
            webhookError={webhookError}
            onRetry={retryWebhook}
            userEmail={userEmail}
            onEmailChange={setUserEmail}
            inputRef={chatInputRef}
          />
        </div>
      </div>
    </div>
  );
}
