import { Home, Users, Zap } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { StepProps } from '@/components/wizard/types';

export function StepFour({ answers, setAnswers }: StepProps) {
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
