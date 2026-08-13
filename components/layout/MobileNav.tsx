import { Search, ShieldCheck, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { StepList } from '@/components/layout/StepList';

export function MobileNav({
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
        <StepList
          currentStep={currentStep}
          maxStep={maxStep}
          onStep={(index) => {
            onStep(index);
            setOpen(false);
          }}
          variant="drawer"
        />
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
