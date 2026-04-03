/**
 * Grimmory MCP Server — Library Tools
 *
 * Tools for listing and retrieving libraries from the Grimmory API.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Page, Library } from '../types.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  ListLibrariesInputSchema,
  GetLibraryInputSchema,
} from '../schemas/index.js';
import { logError } from '../utils.js';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register library-related tools on the MCP server.
 */
export function registerLibraryTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_libraries -----------------------------------------------

  server.registerTool(
    'grimmory_list_libraries',
    {
      description: 'List all libraries in the Grimmory instance with optional pagination.',
      inputSchema: ListLibrariesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const input = ListLibrariesInputSchema.parse(args);
      const { response_format, ...pagination } = input;

      const result = await client.get<Page<Library>>('libraries', {
        page: pagination.page,
        size: pagination.size,
        sort: pagination.sort,
        dir: pagination.dir,
      });

      if (!result.success) {
        logError(`list_libraries failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.formatLibraryList(result.data, response_format);
    },
  );

  // -- grimmory_get_library --------------------------------------------------

  server.registerTool(
    'grimmory_get_library',
    {
      description: 'Get details for a specific library by its UUID.',
      inputSchema: GetLibraryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const input = GetLibraryInputSchema.parse(args);
      const { libraryId, response_format } = input;

      const result = await client.get<Library>(`libraries/${libraryId}`);

      if (!result.success) {
        logError(`get_library failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.formatLibrary(result.data, response_format);
    },
  );
}
