import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { SearchFilters } from '../../mcp-server/types.js';
import type { NormalizedResponse, ErrorEnvelope } from '../types/mcp.js';

export type SearchCarsArgs = SearchFilters & {
  isRefinement: boolean;
  userEmail: string | null;
};

/**
 * Tool schemas only change when the MCP server is redeployed, so a short-lived
 * cache removes one of the two MCP round trips per chat request. The TTL keeps a
 * redeploy from requiring a Next.js restart.
 */
const SCHEMA_CACHE_TTL_MS = 60_000;
let cachedTools: { tools: Anthropic.Tool[]; expiresAt: number } | null = null;

export async function fetchMcpToolSchemas(): Promise<Anthropic.Tool[]> {
  const serverUrl = process.env.MCP_SERVER_URL;
  if (!serverUrl) {
    throw new Error('MCP_SERVER_URL env var not set');
  }

  if (cachedTools && cachedTools.expiresAt > Date.now()) {
    return cachedTools.tools;
  }

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const mcpClient = new Client({ name: 'car-buying-assistant', version: '1.0.0' });

  try {
    await mcpClient.connect(transport);
    const { tools } = await mcpClient.listTools();
    const schemas = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool['input_schema'],
    }));
    cachedTools = { tools: schemas, expiresAt: Date.now() + SCHEMA_CACHE_TTL_MS };
    return schemas;
  } finally {
    await mcpClient.close().catch(() => undefined);
  }
}

export async function callSearchCars(args: SearchCarsArgs): Promise<NormalizedResponse | ErrorEnvelope> {
  const serverUrl = process.env.MCP_SERVER_URL;
  if (!serverUrl) {
    return {
      code: 'MCP_NOT_CONFIGURED',
      message: 'Search service not configured',
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

    try {
      return JSON.parse(firstContent.text) as NormalizedResponse | ErrorEnvelope;
    } catch {
      return {
        code: 'SCHEMA_MISMATCH',
        message: 'MCP server returned non-JSON tool response',
        details: [`Response text: ${firstContent.text.slice(0, 200)}`],
      };
    }
  } finally {
    await client.close().catch(() => undefined);
  }
}
