/**
 * Grimmory MCP Server - Entry Point
 *
 * MCP server for Grimmory book management via stdio transport.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GrimmoryClient } from './services/grimmory-client.js';
import { ResponseFormatter } from './services/response-formatter.js';
import { registerBookTools } from './tools/books.js';
import { registerLibraryTools } from './tools/libraries.js';
import { registerShelfTools } from './tools/shelves.js';
import { registerAuthorTools } from './tools/authors.js';
import { registerReadingTools } from './tools/reading.js';
import { registerNotesTools } from './tools/notes.js';
import { registerReviewTools } from './tools/reviews.js';
import { registerMetadataTools } from './tools/metadata.js';
import { registerStatsTools } from './tools/stats.js';
import { registerSidecarTools } from './tools/sidecar.js';
import { logError, logInfo } from './utils.js';

async function main() {
  // Validate environment variables
  const url = process.env.GRIMMORY_URL;
  const email = process.env.GRIMMORY_EMAIL;
  const password = process.env.GRIMMORY_PASSWORD;
  
  const missing: string[] = [];
  if (!url) missing.push('GRIMMORY_URL');
  if (!email) missing.push('GRIMMORY_EMAIL');
  if (!password) missing.push('GRIMMORY_PASSWORD');
  
  if (missing.length > 0) {
    logError(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Initialize services
  const client = new GrimmoryClient();
  const formatter = new ResponseFormatter();
  
  // Authenticate with Grimmory
  logInfo('Authenticating with Grimmory...');
  const authResult = await client.authenticate();
  
  if (!authResult.success) {
    logError(`Authentication failed: ${authResult.error}`);
    process.exit(1);
  }
  
  logInfo('Authenticated successfully');
  
  // Create MCP server
  const server = new McpServer({
    name: 'grimmory-mcp-server',
    version: '0.1.0',
  });
  
  // Register all 53 tools
  registerBookTools(server, client, formatter);
  registerLibraryTools(server, client, formatter);
  registerShelfTools(server, client, formatter);
  registerAuthorTools(server, client, formatter);
  registerReadingTools(server, client, formatter);
  registerNotesTools(server, client, formatter);
  registerReviewTools(server, client, formatter);
  registerMetadataTools(server, client, formatter);
  registerStatsTools(server, client, formatter);
  registerSidecarTools(server, client, formatter);
  
  logInfo('All 53 tools registered');
  
  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logInfo('Server connected and ready');
}

main().catch((error) => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
