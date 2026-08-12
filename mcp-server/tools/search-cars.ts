import z from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CarSearchPayload } from '../../lib/types/n8n.js';
import type { NormalizedResponse, ErrorEnvelope, VehicleResult } from '../../lib/types/mcp.js';

const KNOWN_BODY_TYPES = [
  'hatchback',
  'saloon',
  'estate',
  'suv',
  'crossover',
  'mpv',
  'coupe',
  'convertible',
  'any',
];
const KNOWN_FUEL_TYPES = [
  'petrol',
  'diesel',
  'hybrid',
  'mild-hybrid',
  'plugin-hybrid',
  'electric',
  'any',
];
const KNOWN_DISPLACEMENTS = ['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '2.5', '3.0', 'any'];

const inputSchema = {
  budgetMax: z
    .number()
    .nullable()
    .optional()
    .describe('Maximum budget in euros, or null if not discussed'),
  bodyTypes: z
    .array(z.string())
    .optional()
    .describe('e.g. ["suv", "hatchback"] or ["any"] for no constraint'),
  fuelTypes: z.array(z.string()).optional().describe('e.g. ["electric"] or ["any"]'),
  transmission: z.enum(['manual', 'automatic', 'any']),
  minSeats: z.number().nullable().optional().describe('Minimum number of seats, or null'),
  features: z
    .array(
      z.object({
        name: z.string(),
        mandatory: z.boolean(),
      })
    )
    .optional()
    .describe('Features the user mentioned; empty array if none'),
  yearMin: z.number().nullable().optional().describe('Minimum model year, or null'),
  yearMax: z.number().nullable().optional().describe('Maximum model year, or null'),
  engineDisplacements: z.array(z.string()).optional().describe('e.g. ["1.5", "2.0"] or ["any"]'),
  usageContext: z.enum(['commute', 'family', 'offroad', 'performance', 'any']),
  annualMileage: z.string().nullable().optional().describe('e.g. "10000-15000" or null'),
  endTrigger: z.enum(['explicit', 'implicit', 'length-limit', 'refinement', 'unknown']),
  isRefinement: z.boolean().optional().describe('Injected by route handler — not filled by Claude'),
  userEmail: z
    .string()
    .nullable()
    .optional()
    .describe('Injected by route handler — not filled by Claude'),
};

type SearchCarsInput = {
  budgetMax?: number | null;
  bodyTypes?: string[];
  fuelTypes?: string[];
  transmission: 'manual' | 'automatic' | 'any';
  minSeats?: number | null;
  features?: Array<{ name: string; mandatory: boolean }>;
  yearMin?: number | null;
  yearMax?: number | null;
  engineDisplacements?: string[];
  usageContext: 'commute' | 'family' | 'offroad' | 'performance' | 'any';
  annualMileage?: string | null;
  endTrigger: 'explicit' | 'implicit' | 'length-limit' | 'refinement' | 'unknown';
  isRefinement?: boolean;
  userEmail?: string | null;
};

export function validateSearchFilters(input: SearchCarsInput): ErrorEnvelope | null {
  const errors: string[] = [];
  const currentYear = new Date().getFullYear();

  if (input.budgetMax != null && input.budgetMax <= 0) {
    errors.push('budgetMax must be greater than 0');
  }

  for (const bt of input.bodyTypes ?? []) {
    if (!KNOWN_BODY_TYPES.includes(bt)) {
      errors.push(`bodyTypes: unknown value "${bt}"`);
    }
  }

  for (const ft of input.fuelTypes ?? []) {
    if (!KNOWN_FUEL_TYPES.includes(ft)) {
      errors.push(`fuelTypes: unknown value "${ft}"`);
    }
  }

  for (const ed of input.engineDisplacements ?? []) {
    if (!KNOWN_DISPLACEMENTS.includes(ed)) {
      errors.push(`engineDisplacements: unknown value "${ed}"`);
    }
  }

  if (input.yearMin != null) {
    if (
      !Number.isInteger(input.yearMin) ||
      input.yearMin < 1900 ||
      input.yearMin > currentYear + 1
    ) {
      errors.push(`yearMin must be an integer in [1900, ${currentYear + 1}]`);
    }
  }

  if (input.yearMax != null) {
    if (
      !Number.isInteger(input.yearMax) ||
      input.yearMax < 1900 ||
      input.yearMax > currentYear + 1
    ) {
      errors.push(`yearMax must be an integer in [1900, ${currentYear + 1}]`);
    }
  }

  if (input.yearMin != null && input.yearMax != null && input.yearMin > input.yearMax) {
    errors.push(`yearMin (${input.yearMin}) must not exceed yearMax (${input.yearMax})`);
  }

  if (input.minSeats != null && (!Number.isInteger(input.minSeats) || input.minSeats < 1)) {
    errors.push('minSeats must be an integer >= 1');
  }

  for (const f of input.features ?? []) {
    if (!f.name || f.name.trim() === '') {
      errors.push('features[].name must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Search parameter validation failed',
      details: errors,
    };
  }
  return null;
}

export async function executeSearchCars(
  input: SearchCarsInput
): Promise<NormalizedResponse | ErrorEnvelope> {
  const filterSummary =
    [
      input.budgetMax != null && `budget≤${input.budgetMax}`,
      input.bodyTypes?.length && `body:[${input.bodyTypes.join(',')}]`,
      input.fuelTypes?.length && `fuel:[${input.fuelTypes.join(',')}]`,
      input.transmission !== 'any' && `tx:${input.transmission}`,
      input.usageContext !== 'any' && `usage:${input.usageContext}`,
      input.yearMin != null && `year≥${input.yearMin}`,
      input.yearMax != null && `year≤${input.yearMax}`,
      input.isRefinement && 'refinement',
    ]
      .filter(Boolean)
      .join(' ') || 'no filters';
  console.log(`[search_cars] invoked — ${filterSummary}`);

  const validationError = validateSearchFilters(input);
  if (validationError) {
    console.error(`[search_cars] Validation failed: ${validationError.details.join('; ')}`);
    return validationError;
  }

  const webhookUrl = process.env.N8N_WEBHOOK_CAR_SEARCH_URL;
  if (!webhookUrl) {
    console.error('[search_cars] N8N_WEBHOOK_CAR_SEARCH_URL not configured');
    return {
      code: 'N8N_UNREACHABLE',
      message: 'Search service not configured',
      details: ['N8N_WEBHOOK_CAR_SEARCH_URL env var not set'],
    };
  }

  console.log(`[search_cars] firing webhook → ${webhookUrl}`);

  const payload: CarSearchPayload = {
    budgetMax: input.budgetMax ?? null,
    bodyTypes: input.bodyTypes?.length ? input.bodyTypes : ['any'],
    fuelTypes: input.fuelTypes?.length ? input.fuelTypes : ['any'],
    transmission: input.transmission,
    minSeats: input.minSeats ?? null,
    features: input.features ?? [],
    yearMin: input.yearMin ?? null,
    yearMax: input.yearMax ?? null,
    engineDisplacements: input.engineDisplacements?.length ? input.engineDisplacements : ['any'],
    usageContext: input.usageContext,
    annualMileage: input.annualMileage ?? null,
    endTrigger: input.endTrigger,
    isRefinement: input.isRefinement ?? false,
    userEmail: input.userEmail ?? null,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = process.env.N8N_WEBHOOK_AUTH_TOKEN;
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.error('[search_cars] n8n request timed out');
      return {
        code: 'TIMEOUT',
        message: 'Search service timed out',
        details: ['Request to n8n exceeded 5 seconds'],
      };
    }
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[search_cars] n8n unreachable: ${detail}`);
    return {
      code: 'N8N_UNREACHABLE',
      message: 'Search service unreachable',
      details: [detail],
    };
  }

  if (!response.ok) {
    console.error(`[search_cars] n8n returned HTTP ${response.status}`);
    return {
      code: 'N8N_ERROR',
      message: 'Search service returned an error',
      details: [`HTTP ${response.status}`],
    };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    console.warn('[search_cars] Schema mismatch: n8n response is not valid JSON');
    return {
      code: 'SCHEMA_MISMATCH',
      message: 'Search service returned unexpected data',
      details: ['Response body is not valid JSON'],
    };
  }

  const result = normalizeN8nResponse(raw);
  if ('results' in result) {
    console.log(
      `[search_cars] ✓ ${result.results.length} result(s) returned (total: ${result.totalCount})`
    );
    //console.log(result)
  }
  return result;
}

function normalizeN8nResponse(raw: unknown): NormalizedResponse | ErrorEnvelope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn('[search_cars] Schema mismatch: n8n response is not an object');
    return {
      code: 'SCHEMA_MISMATCH',
      message: 'Search service returned unexpected data',
      details: ['Response is not an object'],
    };
  }

  const data = raw as Record<string, unknown>;

  if (!Array.isArray(data.results)) {
    console.warn('[search_cars] Schema mismatch: missing results array');
    return {
      code: 'SCHEMA_MISMATCH',
      message: 'Search service returned unexpected data',
      details: ['Missing results array in n8n response'],
    };
  }

  const results: VehicleResult[] = [];
  const mismatchedFields: string[] = [];

  for (const item of data.results as unknown[]) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      mismatchedFields.push('item: not an object');
      continue;
    }
    const r = item as Record<string, unknown>;
    const missing: string[] = [];

    if (typeof r.make !== 'string') missing.push('make');
    if (typeof r.model !== 'string') missing.push('model');
    if (typeof r.year !== 'number') missing.push('year');

    if (missing.length > 0) {
      mismatchedFields.push(`item missing required fields: ${missing.join(', ')}`);
      continue;
    }

    results.push({
      id: `${r.make}-${r.model}-${r.year}`,
      make: r.make as string,
      model: r.model as string,
      bodyType: typeof r.bodyType === 'string' ? r.bodyType : null,
      year: r.year as number,
      price: typeof r.price === 'number' ? r.price : null,
      sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : null,
      mileage: r.mileage as string,
      features: r.features as string[],
      fuelType: r.fuelType as string[],
      seatCount: r.seatCount as number,
      transmission: r.transmission as string,
      imageUrl: r.imageUrl as string,
    });
  }

  if (mismatchedFields.length > 0) {
    console.warn(
      `[search_cars] Schema mismatch in ${mismatchedFields.length} item(s): ${mismatchedFields.join('; ')}`
    );
  }

  const totalCount = typeof data.totalCount === 'number' ? data.totalCount : results.length;

  return { results, totalCount };
}

export function registerSearchCarsTool(server: McpServer): void {
  server.registerTool(
    'search_cars',
    {
      description:
        "Search the vehicle database using structured filters derived from the user's conversation. All fields are optional; omitting all fields returns all available vehicles. Call this tool when the conversation is complete and you have gathered sufficient lifestyle information to construct a meaningful search.",
      inputSchema,
    },
    async (input) => {
      const result = await executeSearchCars(input as SearchCarsInput);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    }
  );
}
