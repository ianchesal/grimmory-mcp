// ============================================================================
// Grimmory MCP Server — Metadata Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import { LookupIsbnInputSchema } from '../schemas/index.js';
import type { BookMetadata } from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const METADATA_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all metadata-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerMetadataTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_lookup_isbn --------------------------------------------------

  server.registerTool(
    'grimmory_lookup_isbn',
    {
      description: 'Look up book metadata by ISBN (ISBN-10 or ISBN-13)',
      inputSchema: LookupIsbnInputSchema,
      annotations: METADATA_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { isbn, response_format } = args;

      const result = await client.get<BookMetadata>(`metadata/isbn/${isbn}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      if (response_format === 'json') {
        return formatter.format(result.data, 'json');
      }

      return formatter.format(result.data, 'markdown', { title: result.data.title ?? 'ISBN Lookup' });
    },
  );
}
