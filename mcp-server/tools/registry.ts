import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchCarsTool } from './search-cars.js';

export function registerTools(server: McpServer): void {
  registerSearchCarsTool(server);
}
