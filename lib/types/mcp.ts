import type { SearchResultItem } from './n8n';

export interface VehicleResult {
  id: string;
  make: string;
  model: string;
  bodyType: string | null;
  year: number;
  price: number | null;
  sourceUrl: string | null;
  fuelType: string[] | null;
  mileage: string | null;
  transmission: string | null;
  seatCount: number | null;
  features: string[];
  imageUrl: string | null;
}

export interface NormalizedResponse {
  results: VehicleResult[];
  totalCount: number;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  details: string[];
}

export type McpSearchResult = NormalizedResponse | ErrorEnvelope;

export function isErrorEnvelope(r: McpSearchResult): r is ErrorEnvelope {
  return 'code' in r && 'message' in r && 'details' in r;
}

export function normalizeSearchResultItem(item: SearchResultItem): VehicleResult {
  return {
    id: `${item.make}-${item.model}-${item.year}`,
    make: item.make,
    model: item.model,
    bodyType: item.bodyType,
    year: item.year,
    price: item.price,
    sourceUrl: item.sourceUrl,
    mileage: item.mileage,
    features: item.features,
    fuelType: item.fuelType,
    seatCount: item.seatCount,
    transmission: item.transmission,
    imageUrl: item.imageUrl,
  };
}
