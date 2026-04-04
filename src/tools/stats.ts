// ============================================================================
// Grimmory MCP Server — Stats, Recommendations & Notebook Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  GetStatsInputSchema,
  GetRecommendationsInputSchema,
  GetNotebookInputSchema,
} from '../schemas/index.js';
import type {
  Book,
  Page,
  BooksSummary,
  BookRecommendationLite,
  RatingDistribution,
  StatusDistribution,
} from '../types.js';
import { logError } from '../utils.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register stats, recommendations, and notebook tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerStatsTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_get_stats ----------------------------------------------------

  server.registerTool(
    'grimmory_get_stats',
    {
      description: 'Get dashboard statistics including book counts, rating distribution, and reading status breakdown',
      inputSchema: GetStatsInputSchema,
      annotations: READONLY_ANNOTATIONS,
    },
    async (args) => {
      const { response_format } = args;

      const result = await client.get<{
        summary: BooksSummary;
        ratingDistribution: RatingDistribution[];
        statusDistribution: StatusDistribution[];
      }>('user-stats/reading/book-distributions');

      if (!result.success) {
        logError(`get_stats failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.formatStats(result.data, response_format);
    },
  );

  // -- grimmory_get_recommendations ------------------------------------------

  server.registerTool(
    'grimmory_get_recommendations',
    {
      description: 'Get personalized book recommendations based on your reading history',
      inputSchema: GetRecommendationsInputSchema,
      annotations: READONLY_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, page, size, sort, dir } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;

      const result = await client.get<Page<BookRecommendationLite>>(
        'recommendations',
        params,
      );

      if (!result.success) {
        logError(`get_recommendations failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.formatRecommendations(result.data, response_format);
    },
  );

  // -- grimmory_get_notebook -------------------------------------------------

  server.registerTool(
    'grimmory_get_notebook',
    {
      description: 'Get notebook entries — books with notes, highlights, and annotations',
      inputSchema: GetNotebookInputSchema,
      annotations: READONLY_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, page, size, sort, dir, search, libraryId } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;
      if (search) params.search = search;
      if (libraryId) params.libraryId = libraryId;

      const result = await client.get<Page<Book>>('notebook', params);

      if (!result.success) {
        logError(`get_notebook failed: ${result.error}`);
        return formatter.formatError(result.error);
      }

      return formatter.formatNotebook(result.data, response_format);
    },
  );
}
