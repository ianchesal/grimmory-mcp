/**
 * Grimmory MCP Server — Filter Options Tool Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import {
  createTestMCPContext,
  callTool,
  listTools,
  cleanupMCPContext,
  type TestMCPContext,
} from './helpers/mcp-helpers.js';
import { registerFilterTools } from '../src/tools/filters.js';
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

const mockFilterOptions: Record<string, unknown> = {
  readStatuses: ['UNREAD', 'READING', 'READ', 'ABANDONED', 'WONT_READ', 'PAUSED', 'RE_READING', 'PARTIALLY_READ', 'UNSET'],
  tags: ['fiction', 'non-fiction', 'sci-fi', 'fantasy'],
  publishers: ['Penguin', 'HarperCollins'],
  languages: ['en', 'es', 'fr'],
  genres: ['Thriller', 'Romance', 'Mystery'],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Filter Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;

  beforeAll(async () => {
    const client = createMockClient({
      'filter-options': mockFilterOptions,
    });

    ctx = await createTestMCPContext({
      setup: (server: McpServer) => {
        registerFilterTools(server, client, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Tool registration -----------------------------------------------------

  describe('tool registration', () => {
    it('registers grimmory_get_filter_options tool', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);

      expect(names).toContain('grimmory_get_filter_options');
      expect(tools).toHaveLength(1);
    });

    it('grimmory_get_filter_options has readOnlyHint annotation', async () => {
      const { tools } = await ctx.client.listTools();
      const tool = tools.find((t) => t.name === 'grimmory_get_filter_options');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });
  });

  // -- grimmory_get_filter_options -------------------------------------------

  describe('grimmory_get_filter_options', () => {
    it('returns filter options in JSON format by default', async () => {
      const result = await callTool<Record<string, unknown>>(
        ctx,
        'grimmory_get_filter_options',
      );

      expect(result.readStatuses).toEqual(mockFilterOptions.readStatuses);
      expect(result.tags).toEqual(mockFilterOptions.tags);
      expect(result.publishers).toEqual(mockFilterOptions.publishers);
      expect(result.languages).toEqual(mockFilterOptions.languages);
      expect(result.genres).toEqual(mockFilterOptions.genres);
    });

    it('returns filter options in JSON format when explicitly requested', async () => {
      const result = await callTool<Record<string, unknown>>(
        ctx,
        'grimmory_get_filter_options',
        { response_format: 'json' },
      );

      expect(result.readStatuses).toEqual(mockFilterOptions.readStatuses);
      expect(result.tags).toEqual(mockFilterOptions.tags);
    });

    it('returns filter options in markdown format', async () => {
      const result = await callTool<string>(
        ctx,
        'grimmory_get_filter_options',
        { response_format: 'markdown' },
      );

      expect(result).toContain('# Filter Options');
      expect(result).toContain('**readStatuses:**');
      expect(result).toContain('UNREAD');
      expect(result).toContain('READ');
      expect(result).toContain('**tags:**');
      expect(result).toContain('fiction');
      expect(result).toContain('**publishers:**');
      expect(result).toContain('Penguin');
      expect(result).toContain('**languages:**');
      expect(result).toContain('en');
      expect(result).toContain('**genres:**');
      expect(result).toContain('Thriller');
    });

    it('handles API errors gracefully', async () => {
      const errorClient = createMockClient({});
      const errorCtx = await createTestMCPContext({
        setup: (server: McpServer) => {
          registerFilterTools(server, errorClient, formatter);
        },
      });

      try {
        await callTool(errorCtx, 'grimmory_get_filter_options');
        // Should have thrown
        expect.unreachable('Expected an error to be thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Error');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
