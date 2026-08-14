import type { FeatureEntry } from '../lib/types/n8n';

export interface SearchFilters {
  budgetMax?: number | null;
  bodyTypes?: string[];
  fuelTypes?: string[];
  transmission: 'manual' | 'automatic' | 'any';
  minSeats?: number | null;
  features?: FeatureEntry[];
  yearMin?: number | null;
  yearMax?: number | null;
  engineDisplacements?: string[];
  usageContext: 'commute' | 'family' | 'offroad' | 'performance' | 'any';
  annualMileage?: string | null;
  endTrigger: 'explicit' | 'implicit' | 'length-limit' | 'refinement' | 'unknown';
}
