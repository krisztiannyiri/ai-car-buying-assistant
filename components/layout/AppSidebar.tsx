import { Bookmark, Search } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { StepList } from '@/components/layout/StepList';

export function AppSidebar({
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
        <StepList currentStep={currentStep} maxStep={maxStep} onStep={onStep} variant="sidebar" />
      </div>
    </aside>
  );
}
