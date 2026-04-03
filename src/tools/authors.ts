// ============================================================================
// Grimmory MCP Server — Author Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import { ListAuthorsInputSchema, GetAuthorInputSchema } from '../schemas/index.js';
import type { Author, Page } from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const AUTHOR_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all author-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerAuthorTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_authors ------------------------------------------------

  server.registerTool(
    'grimmory_list_authors',
    {
      description: 'List authors with pagination and optional search filter',
      inputSchema: ListAuthorsInputSchema,
      annotations: AUTHOR_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, search, page, size, sort, dir } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;
      if (search) params.search = search;

      const result = await client.get<Page<Author>>('authors', params);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthorList(result.data, response_format);
    },
  );

  // -- grimmory_get_author --------------------------------------------------

  server.registerTool(
    'grimmory_get_author',
    {
      description: 'Get detailed information about a specific author',
      inputSchema: GetAuthorInputSchema,
      annotations: AUTHOR_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format } = args;

      const result = await client.get<Author>(`authors/${authorId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthor(result.data, response_format);
    },
  );
}
