export interface FeatureEntry {
  name: string;
  mandatory: boolean;
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
}

export interface WebhookEvent {
  status: 'success' | 'failed';
  endTrigger: CarSearchPayload['endTrigger'];
  errorMessage?: string;
  retryPayload?: CarSearchPayload;
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
}
