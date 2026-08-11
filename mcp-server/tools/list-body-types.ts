import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const BODY_TYPES = ['hatchback', 'saloon', 'estate', 'suv', 'crossover', 'mpv', 'coupe', 'convertible', 'any'];

export function registerListBodyTypesTool(server: McpServer): void {
  server.registerTool(
    'list_body_types',
    {
      description: 'Returns the list of supported vehicle body type values for use in search_cars filters.',
    },
    async () => {
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ bodyTypes: BODY_TYPES }) }],
      };
    }
  );
}
