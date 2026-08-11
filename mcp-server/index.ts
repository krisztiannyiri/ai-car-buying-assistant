import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools/registry.js';

const PORT = parseInt(process.env.MCP_SERVER_PORT ?? '3001', 10);

function createServer(): McpServer {
  const server = new McpServer({
    name: 'vehicle-search-mcp-server',
    version: '1.0.0',
  });
  registerTools(server);
  return server;
}

const httpServer = http.createServer(async (req, res) => {
  if (req.url !== '/mcp') {
    res.writeHead(404).end();
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  await new Promise<void>((resolve) => req.on('end', resolve));
  const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;

  const method = body?.method ?? 'unknown';
  const toolName = body?.params?.name ?? '';
  console.log(`[mcp] → ${method}${toolName ? ` (${toolName})` : ''}`);

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
});

httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`MCP vehicle search server listening on http://localhost:${PORT}/mcp`);
});
