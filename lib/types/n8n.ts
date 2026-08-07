export interface FeatureEntry {
  name: string;
  mandatory: boolean;
}

export interface SearchResultItem {
  make: string;
  model: string;
  bodyType: string | null;
  year: number;
  price: number | null;
  sourceUrl: string | null;
}

export interface CarSearchPayload {
  budgetMax: number | null;
  bodyTypes: string[];
  fuelTypes: string[];
  transmission: 'manual' | 'automatic' | 'any';
  minSeats: number | null;
  features: FeatureEntry[];
  yearMin: number | null;
  yearMax: number | null;
  engineDisplacements: string[];
  usageContext: 'commute' | 'family' | 'offroad' | 'performance' | 'any';
  annualMileage: string | null;
  endTrigger: 'explicit' | 'implicit' | 'length-limit' | 'refinement' | 'unknown';
  isRefinement: boolean;
  userEmail: string | null;
}

export interface WebhookEvent {
  status: 'success' | 'failed';
  endTrigger: CarSearchPayload['endTrigger'];
  errorMessage?: string;
  retryPayload?: CarSearchPayload;
  results?: SearchResultItem[];
  totalCount?: number;
}

export interface TriggerLogEntry {
  timestamp: string;
  webhookUrl: string;
  payload: CarSearchPayload;
  error: string;
}

export interface WebhookResult {
  status: 'success' | 'failed';
  errorMessage?: string;
  results?: SearchResultItem[];
  totalCount?: number;
}
