// ============================================================================
// Grimmory MCP Server — Review Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  ListReviewsInputSchema,
  RefreshBookReviewsInputSchema,
  DeleteReviewInputSchema,
  DeleteAllBookReviewsInputSchema,
} from '../schemas/index.js';
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

const REFRESH_REVIEWS_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const DESTRUCTIVE_REVIEW_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
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

      const result = await client.get<Page<BookReview>>(`reviews/book/${bookId}`, params);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      if (response_format === 'json') {
        return formatter.format(result.data, 'json');
      }

      // Handle 204 No Content (undefined data) or empty content
      const pageData = result.data ?? { content: [], page: 0, totalPages: 1, totalElements: 0, hasNext: false, hasPrevious: false };
      const reviews = pageData.content?.map((r) => formatter.formatReview(r, 'markdown')) ?? [];
      const text = reviews.length > 0 
        ? reviews.map((r) => r.content[0].text).join('\n\n---\n\n')
        : 'No reviews found for this book.';
      const pagination = formatPagination(pageData);

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

  // -- grimmory_refresh_reviews ----------------------------------------------

  server.registerTool(
    'grimmory_refresh_reviews',
    {
      description: 'Refresh reviews for a book from external sources (external API call)',
      inputSchema: RefreshBookReviewsInputSchema,
      annotations: REFRESH_REVIEWS_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.post<Page<BookReview>>(
        `reviews/book/${bookId}/refresh`,
        {},
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      if (response_format === 'json') {
        return formatter.format(result.data, 'json');
      }

      // Handle 204 No Content (undefined data) or empty content
      const pageData = result.data ?? { content: [], page: 0, totalPages: 1, totalElements: 0, hasNext: false, hasPrevious: false };
      const reviews = pageData.content?.map((r) => formatter.formatReview(r, 'markdown')) ?? [];
      const text = reviews.length > 0
        ? reviews.map((r) => r.content[0].text).join('\n\n---\n\n')
        : 'No reviews found for this book.';
      const pagination = formatPagination(pageData);

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

  // -- grimmory_delete_review ------------------------------------------------

  server.registerTool(
    'grimmory_delete_review',
    {
      description: 'Delete a specific review by its UUID',
      inputSchema: DeleteReviewInputSchema,
      annotations: DESTRUCTIVE_REVIEW_ANNOTATIONS,
    },
    async (args) => {
      const { reviewId, response_format } = args;

      const result = await client.delete<void>(`reviews/${reviewId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(
        { message: `Review ${reviewId} deleted` },
        response_format,
        { title: 'Review Deleted' },
      );
    },
  );

  // -- grimmory_delete_all_book_reviews ---------------------------------------

  server.registerTool(
    'grimmory_delete_all_book_reviews',
    {
      description: 'Delete all reviews for a specific book',
      inputSchema: DeleteAllBookReviewsInputSchema,
      annotations: DESTRUCTIVE_REVIEW_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.delete<void>(`reviews/book/${bookId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(
        { message: `All reviews deleted for book ${bookId}` },
        response_format,
        { title: 'Reviews Deleted' },
      );
    },
  );
}
