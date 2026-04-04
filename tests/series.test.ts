/**
 * Tests for Series tools (grimmory_list_series, grimmory_get_series_books).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockBook, createMockPage } from './helpers/factories.js';
import { registerSeriesTools } from '../src/tools/series.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse, Page } from '../src/services/grimmory-client.js';
import type { Book, SeriesEntry } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSeriesEntry(overrides?: Partial<SeriesEntry>): SeriesEntry {
  return {
    seriesName: 'Test Series',
    libraryId: 1,
    bookCount: 3,
    ...overrides,
  };
}

function createMockClient(overrides?: {
  listSeries?: ApiResponse<Page<SeriesEntry>>;
  getSeriesBooks?: ApiResponse<Page<Book>>;
}): GrimmoryClient {
  const defaultSeries = createMockSeriesEntry();
  const defaultSeriesPage = createMockPage<SeriesEntry>([defaultSeries], {
    totalElements: 1,
    totalPages: 1,
  });
  const defaultBook = createMockBook();
  const defaultBookPage = createMockPage([defaultBook], {
    totalElements: 1,
    totalPages: 1,
  });

  const mockListSeries = overrides?.listSeries ?? { success: true, data: defaultSeriesPage };
  const mockGetSeriesBooks = overrides?.getSeriesBooks ?? { success: true, data: defaultBookPage };

  return {
    get: vi.fn(<T>(path: string, params?: Record<string, unknown>) => {
      // series/{seriesName}/books path
      if (path.startsWith('series/') && path.includes('/books')) {
        return Promise.resolve(mockGetSeriesBooks) as Promise<ApiResponse<T>>;
      }
      // series list path
      return Promise.resolve(mockListSeries) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Series Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerSeriesTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers both series tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_list_series');
      expect(names).toContain('grimmory_get_series_books');
    });

    it('grimmory_list_series has a description', async () => {
      const tools = await listTools(ctx);
      const listTool = tools.find((t) => t.name === 'grimmory_list_series');
      expect(listTool?.description).toContain('List');
    });

    it('grimmory_get_series_books has a description', async () => {
      const tools = await listTools(ctx);
      const getTool = tools.find((t) => t.name === 'grimmory_get_series_books');
      expect(getTool?.description).toContain('books');
    });
  });

  // -- grimmory_list_series --------------------------------------------------

  describe('grimmory_list_series', () => {
    it('returns series as JSON by default', async () => {
      const result = await callTool<Page<SeriesEntry>>(ctx, 'grimmory_list_series');
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].seriesName).toBe('Test Series');
    });

    it('returns series as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_list_series', {
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Series');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_list_series', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'asc',
      });

      expect(mockClient.get).toHaveBeenCalledWith('series', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'asc',
      });
    });

    it('passes libraryId filter to the API when provided', async () => {
      await callTool(ctx, 'grimmory_list_series', {
        libraryId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(mockClient.get).toHaveBeenCalledWith('series', expect.objectContaining({
        libraryId: '123e4567-e89b-12d3-a456-426614174000',
      }));
    });

    it('does not include libraryId when not provided', async () => {
      await callTool(ctx, 'grimmory_list_series', {});

      const lastCall = (mockClient.get as any).mock.calls.at(-1);
      expect(lastCall[1]).not.toHaveProperty('libraryId');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            listSeries: { success: false, error: 'Not found', isError: true },
          });
          registerSeriesTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_list_series',
          arguments: {},
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_series_books ----------------------------------------------

  describe('grimmory_get_series_books', () => {
    it('returns books as JSON by default', async () => {
      const result = await callTool<Page<Book>>(ctx, 'grimmory_get_series_books', {
        seriesName: 'Test Series',
      });
      expect(result.content).toBeDefined();
      expect(result.totalElements).toBe(1);
      expect(result.content[0].id).toBe(1);
    });

    it('returns books as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_series_books', {
        seriesName: 'Test Series',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Book');
      expect(result).toContain('Page 1 of 1');
    });

    it('calls the API with the correct series books path', async () => {
      await callTool(ctx, 'grimmory_get_series_books', {
        seriesName: 'My Series',
      });

      expect(mockClient.get).toHaveBeenCalledWith('series/My Series/books', {
        page: 0,
        size: 20,
      });
    });

    it('passes pagination params to the API', async () => {
      await callTool(ctx, 'grimmory_get_series_books', {
        seriesName: 'Test Series',
        page: 1,
        size: 5,
        sort: 'title',
        dir: 'desc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'series/Test Series/books',
        {
          page: 1,
          size: 5,
          sort: 'title',
          dir: 'desc',
        },
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getSeriesBooks: { success: false, error: 'Series not found', isError: true },
          });
          registerSeriesTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_series_books',
          arguments: { seriesName: 'Unknown Series' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Series not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
