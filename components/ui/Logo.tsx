import { CarFront } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
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
