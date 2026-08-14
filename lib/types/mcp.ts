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

export function isErrorEnvelope(r: NormalizedResponse | ErrorEnvelope): r is ErrorEnvelope {
  return 'code' in r && 'message' in r && 'details' in r;
}
