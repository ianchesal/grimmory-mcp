// ============================================================================
// Grimmory MCP Server — Book Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import { ListBooksInputSchema, GetBookInputSchema } from '../schemas/index.js';
import type { Book, Page } from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const BOOK_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all book-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerBookTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_books --------------------------------------------------

  server.registerTool(
    'grimmory_list_books',
    {
      description: 'List books with pagination and optional filters',
      inputSchema: ListBooksInputSchema,
      annotations: BOOK_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, libraryId, search, page, size, sort, dir } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;
      if (libraryId) params.libraryId = libraryId;
      if (search) params.search = search;

      const result = await client.get<Page<Book>>('books', params);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatBookList(result.data, response_format);
    },
  );

  // -- grimmory_get_book -----------------------------------------------------

  server.registerTool(
    'grimmory_get_book',
    {
      description: 'Get detailed information about a specific book',
      inputSchema: GetBookInputSchema,
      annotations: BOOK_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.get<Book>(`books/${bookId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatBook(result.data, response_format);
    },
  );
}
