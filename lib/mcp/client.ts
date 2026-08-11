import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { SearchFilters } from '../../mcp-server/types.js';
import type { NormalizedResponse, ErrorEnvelope } from '../types/mcp.js';

export type SearchCarsArgs = SearchFilters & {
  isRefinement: boolean;
  userEmail: string | null;
};

export async function callSearchCars(args: SearchCarsArgs): Promise<NormalizedResponse | ErrorEnvelope> {
  const serverUrl = process.env.MCP_SERVER_URL;
  if (!serverUrl) {
    return {
      code: 'N8N_UNREACHABLE',
      message: 'MCP server URL not configured',
      details: ['MCP_SERVER_URL env var not set'],
    };
  }

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const client = new Client({ name: 'car-buying-assistant', version: '1.0.0' });

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name: 'search_cars',
      arguments: args as unknown as Record<string, unknown>,
    });

    const content = (result as { content: Array<{ type: string; text?: string }> }).content;
    const firstContent = content[0];
    if (!firstContent || firstContent.type !== 'text' || firstContent.text === undefined) {
      return {
        code: 'SCHEMA_MISMATCH',
        message: 'MCP server returned unexpected response format',
        details: ['Expected text content in tool result'],
      };
    }

    return JSON.parse(firstContent.text) as NormalizedResponse | ErrorEnvelope;
  } finally {
    await client.close().catch(() => undefined);
  }
}
