// ============================================================================
// Grimmory MCP Server — Reading Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  UpdateReadStatusInputSchema,
  UpdateRatingInputSchema,
  UpdateProgressInputSchema,
} from '../schemas/index.js';
import type {
  BookStatusUpdateResponse,
  PersonalRatingUpdateResponse,
  ProgressUpdateResponse,
} from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const READING_TOOL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all reading-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerReadingTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_update_read_status -------------------------------------------

  server.registerTool(
    'grimmory_update_read_status',
    {
      description: 'Update the read status of a book (e.g. READING, READ, ABANDONED)',
      inputSchema: UpdateReadStatusInputSchema,
      annotations: READING_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, status, response_format } = args;

      const result = await client.put<BookStatusUpdateResponse>(
        `books/${bookId}/status`,
        status,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: `Read Status Updated`,
      });
    },
  );

  // -- grimmory_update_rating ------------------------------------------------

  server.registerTool(
    'grimmory_update_rating',
    {
      description: 'Update the personal rating of a book (1-5)',
      inputSchema: UpdateRatingInputSchema,
      annotations: READING_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, rating, response_format } = args;

      const result = await client.put<PersonalRatingUpdateResponse>(
        `books/${bookId}/rating`,
        rating,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: `Rating Updated`,
      });
    },
  );

  // -- grimmory_update_progress ----------------------------------------------

  server.registerTool(
    'grimmory_update_progress',
    {
      description: 'Update the reading progress of a book (0-100)',
      inputSchema: UpdateProgressInputSchema,
      annotations: READING_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, progress, response_format } = args;

      const result = await client.put<ProgressUpdateResponse>(
        `books/${bookId}/progress`,
        progress,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: `Progress Updated`,
      });
    },
  );
}
