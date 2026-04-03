// ============================================================================
// Grimmory MCP Server — Review Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import { ListReviewsInputSchema } from '../schemas/index.js';
import type { BookReview, Page } from '../types.js';
import { truncateText } from '../utils.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const REVIEW_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPagination(page: Page<unknown>): string {
  const lines = [
    `Page ${page.page + 1} of ${page.totalPages}`,
    `Showing ${page.content.length} of ${page.totalElements} items`,
  ];
  if (page.hasNext) lines.push('(next page available)');
  if (page.hasPrevious) lines.push('(previous page available)');
  return `---\n${lines.join(' | ')}`;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all review-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerReviewTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_reviews -------------------------------------------------

  server.registerTool(
    'grimmory_list_reviews',
    {
      description: 'List reviews for a specific book with pagination',
      inputSchema: ListReviewsInputSchema,
      annotations: REVIEW_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format, page, size, sort, dir } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;

      const result = await client.get<Page<BookReview>>(`books/${bookId}/reviews`, params);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      if (response_format === 'json') {
        return formatter.format(result.data, 'json');
      }

      const reviews = result.data.content.map((r) => formatter.formatReview(r, 'markdown'));
      const text = reviews.map((r) => r.content[0].text).join('\n\n---\n\n');
      const pagination = formatPagination(result.data);

      return {
        content: [
          {
            type: 'text' as const,
            text: truncateText(text + '\n\n' + pagination),
          },
        ],
      };
    },
  );
}
