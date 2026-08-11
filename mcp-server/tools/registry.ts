import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchCarsTool } from './search-cars.js';
import { registerListBodyTypesTool } from './list-body-types.js';

export function registerTools(server: McpServer): void {
  registerSearchCarsTool(server);
  registerListBodyTypesTool(server);
}
