import { useState } from 'react';
import { motion } from 'framer-motion';
import { CarFront, Check, ExternalLink, Heart } from 'lucide-react';
import type { SearchResultItem } from '@/lib/types/n8n';
import { MAX_DISPLAYED_RESULTS } from '@/lib/wizard/config';

export function Results({
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

  const displayItems = items.slice(0, MAX_DISPLAYED_RESULTS);
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
        const isSaved = saved.includes(carKey);

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
                    <p className="mt-1 text-xs text-[#7c847b]">{specParts.join(' · ')}</p>
                  )}
                  {car.mileage && (
                    <p className="mt-3 text-sm font-medium text-[#354135]">
                      Mileage: {car.mileage} km
                    </p>
                  )}
                  {car.features && car.features.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                      {car.features.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 text-[11px] text-[#707a6f]"
                        >
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${isSaved ? 'border-[#233223] bg-[#233223] text-[#c8f65a]' : 'border-[#dfe3db] text-[#7c847b] hover:text-[#233223]'}`}
                >
                  <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} />
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
          {userEmail
            ? ` — check ${userEmail} for the full list`
            : ' - provide an email address to access the full list'}
          .
        </p>
      )}
    </div>
  );
}
