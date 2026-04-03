/**
 * Grimmory MCP Server — Shelf Tools
 *
 * Tools for listing shelves and retrieving books on a shelf from the Grimmory API.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Page, Shelf, Book } from '../types.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  ListShelvesAllInputSchema,
  GetShelfBooksInputSchema,
} from '../schemas/index.js';
import { logError } from '../utils.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register shelf-related tools on the MCP server.
 */
export function registerShelfTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_shelves -------------------------------------------------

  server.registerTool(
    'grimmory_list_shelves',
    {
      description: 'List all shelves with optional library filter and pagination.',
      inputSchema: ListShelvesAllInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const input = ListShelvesAllInputSchema.parse(args);
      const { response_format, libraryId, ...pagination } = input;

      const params: Record<string, unknown> = {
        page: pagination.page,
        size: pagination.size,
      };
      if (pagination.sort) params.sort = pagination.sort;
      if (pagination.dir) params.dir = pagination.dir;
      if (libraryId) params.libraryId = libraryId;

      const result = await client.get<Page<Shelf>>('shelves', params);

      if (!result.success) {
        logError(`list_shelves failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format);
    },
  );

  // -- grimmory_get_shelf_books -----------------------------------------------

  server.registerTool(
    'grimmory_get_shelf_books',
    {
      description: 'Get books in a specific shelf with pagination.',
      inputSchema: GetShelfBooksInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const input = GetShelfBooksInputSchema.parse(args);
      const { shelfId, response_format, ...pagination } = input;

      const params: Record<string, unknown> = {
        page: pagination.page,
        size: pagination.size,
      };
      if (pagination.sort) params.sort = pagination.sort;
      if (pagination.dir) params.dir = pagination.dir;

      const result = await client.get<Page<Book>>(`shelves/${shelfId}/books`, params);

      if (!result.success) {
        logError(`get_shelf_books failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.formatBookList(result.data, response_format);
    },
  );
}
