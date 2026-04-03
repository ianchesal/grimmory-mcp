/**
 * Grimmory MCP Server — Stats, Recommendations & Notebook Tools Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  Page,
  Book,
  BooksSummary,
  BookRecommendationLite,
  RatingDistribution,
  StatusDistribution,
} from '../src/types.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import {
  createTestMCPContext,
  callTool,
  listTools,
  cleanupMCPContext,
  type TestMCPContext,
} from './helpers/mcp-helpers.js';
import { createMockBook, createMockPage } from './helpers/factories.js';
import { registerStatsTools } from '../src/tools/stats.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';

// ---------------------------------------------------------------------------
// Mock client
// ---------------------------------------------------------------------------

function createMockClient(responses: Record<string, unknown>): GrimmoryClient {
  return {
    get: vi.fn().mockImplementation(async <T>(path: string) => {
      if (path in responses) {
        return { success: true, data: responses[path] as T };
      }
      return { success: false, error: `Not found: ${path}`, isError: true };
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockSummary: BooksSummary = {
  totalBooks: 150,
  totalSizeKb: 2_500_000,
  totalAuthors: 42,
  totalSeries: 18,
  totalPublishers: 30,
};

const mockRatingDistribution: RatingDistribution[] = [
  { rating: 1, count: 5 },
  { rating: 2, count: 10 },
  { rating: 3, count: 25 },
  { rating: 4, count: 45 },
  { rating: 5, count: 35 },
];

const mockStatusDistribution: StatusDistribution[] = [
  { status: 'READ', count: 60 },
  { status: 'READING', count: 15 },
  { status: 'UNREAD', count: 50 },
  { status: 'ABANDONED', count: 5 },
  { status: 'WONT_READ', count: 3 },
  { status: 'PAUSED', count: 7 },
  { status: 'RE_READING', count: 4 },
  { status: 'PARTIALLY_READ', count: 6 },
];

const mockStatsResponse = {
  summary: mockSummary,
  ratingDistribution: mockRatingDistribution,
  statusDistribution: mockStatusDistribution,
};

const mockRecommendations: Page<BookRecommendationLite> = createMockPage(
  [
    {
      bookId: 101,
      title: 'Recommended Book Alpha',
      authors: ['Author A'],
      thumbnailUrl: null,
      similarityScore: 0.92,
    },
    {
      bookId: 102,
      title: 'Recommended Book Beta',
      authors: ['Author B', 'Author C'],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      similarityScore: 0.85,
    },
  ],
  { totalElements: 2, totalPages: 1 },
);

const mockNotebook: Page<Book> = createMockPage(
  [
    createMockBook({
      id: 201,
      readStatus: 'READING',
      personalRating: null,
      metadata: {
        bookId: 201,
        title: 'Book With Notes',
        authors: ['Note Author'],
      },
    }),
    createMockBook({
      id: 202,
      readStatus: 'READ',
      personalRating: 4,
      metadata: {
        bookId: 202,
        title: 'Another Annotated Book',
        authors: ['Highlight Author'],
      },
    }),
  ],
  { totalElements: 2, totalPages: 1 },
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stats Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;

  beforeAll(async () => {
    const client = createMockClient({
      'stats/dashboard': mockStatsResponse,
      recommendations: mockRecommendations,
      notebook: mockNotebook,
    });

    ctx = await createTestMCPContext({
      setup: (server: McpServer) => {
        registerStatsTools(server, client, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Tool registration -----------------------------------------------------

  describe('tool registration', () => {
    it('registers all three stats tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);

      expect(names).toContain('grimmory_get_stats');
      expect(names).toContain('grimmory_get_recommendations');
      expect(names).toContain('grimmory_get_notebook');
      expect(tools).toHaveLength(3);
    });

    it('grimmory_get_stats has readOnlyHint annotation', async () => {
      const { tools } = await ctx.client.listTools();
      const tool = tools.find((t) => t.name === 'grimmory_get_stats');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });

    it('grimmory_get_recommendations has readOnlyHint annotation', async () => {
      const { tools } = await ctx.client.listTools();
      const tool = tools.find((t) => t.name === 'grimmory_get_recommendations');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });

    it('grimmory_get_notebook has readOnlyHint annotation', async () => {
      const { tools } = await ctx.client.listTools();
      const tool = tools.find((t) => t.name === 'grimmory_get_notebook');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });
  });

  // -- grimmory_get_stats ----------------------------------------------------

  describe('grimmory_get_stats', () => {
    it('returns stats in JSON format by default', async () => {
      const result = await callTool<{
        summary: BooksSummary;
        ratingDistribution: RatingDistribution[];
        statusDistribution: StatusDistribution[];
      }>(ctx, 'grimmory_get_stats');

      expect(result.summary.totalBooks).toBe(150);
      expect(result.summary.totalAuthors).toBe(42);
      expect(result.ratingDistribution).toHaveLength(5);
      expect(result.statusDistribution).toHaveLength(8);
    });

    it('returns stats in JSON format when explicitly requested', async () => {
      const result = await callTool<{
        summary: BooksSummary;
        ratingDistribution: RatingDistribution[];
      }>(ctx, 'grimmory_get_stats', { response_format: 'json' });

      expect(result.summary.totalBooks).toBe(150);
      expect(result.ratingDistribution).toHaveLength(5);
    });

    it('returns stats in markdown format', async () => {
      const result = await callTool<string>(
        ctx,
        'grimmory_get_stats',
        { response_format: 'markdown' },
      );

      expect(result).toContain('# Book Collection Statistics');
      expect(result).toContain('## Summary');
      expect(result).toContain('**Total Books:** 150');
      expect(result).toContain('**Total Authors:** 42');
      expect(result).toContain('## Rating Distribution');
      expect(result).toContain('★☆☆☆☆');
      expect(result).toContain('## Status Distribution');
      expect(result).toContain('**READ**');
    });
  });

  // -- grimmory_get_recommendations ------------------------------------------

  describe('grimmory_get_recommendations', () => {
    it('returns recommendations in JSON format by default', async () => {
      const result = await callTool<Page<BookRecommendationLite>>(
        ctx,
        'grimmory_get_recommendations',
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].title).toBe('Recommended Book Alpha');
      expect(result.content[0].similarityScore).toBe(0.92);
      expect(result.content[1].authors).toEqual(['Author B', 'Author C']);
    });

    it('returns recommendations in markdown format', async () => {
      const result = await callTool<string>(
        ctx,
        'grimmory_get_recommendations',
        { response_format: 'markdown' },
      );

      expect(result).toContain('# Recommended Book Alpha');
      expect(result).toContain('**Author:** Author A');
      expect(result).toContain('**Similarity Score:** 92%');
      expect(result).toContain('# Recommended Book Beta');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination params without errors', async () => {
      await callTool(ctx, 'grimmory_get_recommendations', {
        page: 1,
        size: 5,
        sort: 'similarityScore',
        dir: 'desc',
      });
    });
  });

  // -- grimmory_get_notebook -------------------------------------------------

  describe('grimmory_get_notebook', () => {
    it('returns notebook entries in JSON format by default', async () => {
      const result = await callTool<Page<Book>>(
        ctx,
        'grimmory_get_notebook',
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].id).toBe(201);
      expect(result.content[1].id).toBe(202);
    });

    it('returns notebook entries in markdown format', async () => {
      const result = await callTool<string>(
        ctx,
        'grimmory_get_notebook',
        { response_format: 'markdown' },
      );

      expect(result).toContain('# Book With Notes');
      expect(result).toContain('**Author:** Note Author');
      expect(result).toContain('# Another Annotated Book');
      expect(result).toContain('**Rating:** ★★★★☆');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination and filter params without errors', async () => {
      await callTool(ctx, 'grimmory_get_notebook', {
        page: 0,
        size: 10,
        sort: 'title',
        dir: 'asc',
        search: 'notes',
        libraryId: '00000000-0000-0000-0000-000000000001',
      });
    });
  });
});
