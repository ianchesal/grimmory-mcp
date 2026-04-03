/**
 * Tests for Metadata tools (grimmory_lookup_isbn).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { createMockBookMetadata } from './helpers/factories.js';
import { registerMetadataTools } from '../src/tools/metadata.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse } from '../src/services/grimmory-client.js';
import type { BookMetadata } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClient(overrides?: {
  lookupIsbn?: ApiResponse<BookMetadata>;
}): GrimmoryClient {
  const defaultMetadata = createMockBookMetadata();
  const mockLookup = overrides?.lookupIsbn ?? { success: true, data: defaultMetadata };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.startsWith('metadata/isbn/')) {
        return Promise.resolve(mockLookup) as Promise<ApiResponse<T>>;
      }
      return Promise.resolve({ success: false, error: 'Not found', isError: true }) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Metadata Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerMetadataTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers the ISBN lookup tool', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_lookup_isbn');
    });

    it('grimmory_lookup_isbn has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_lookup_isbn');
      expect(tool?.description).toContain('ISBN');
    });

    it('grimmory_lookup_isbn has openWorldHint annotation', async () => {
      const tools = await listTools(ctx);
      const rawTools = await ctx.client.listTools();
      const tool = rawTools.tools.find((t) => t.name === 'grimmory_lookup_isbn');
      expect(tool?.annotations?.openWorldHint).toBe(true);
    });
  });

  // -- grimmory_lookup_isbn --------------------------------------------------

  describe('grimmory_lookup_isbn', () => {
    it('returns metadata as JSON by default', async () => {
      const result = await callTool<BookMetadata>(ctx, 'grimmory_lookup_isbn', {
        isbn: '9781234567890',
      });
      expect(result.bookId).toBe(1);
      expect(result.title).toBe('Test Book');
      expect(result.isbn13).toBe('9781234567890');
    });

    it('returns metadata as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_lookup_isbn', {
        isbn: '9781234567890',
        response_format: 'markdown',
      });
      expect(result).toContain('# Test Book');
      expect(result).toContain('Test Book');
    });

    it('calls the API with the correct ISBN path', async () => {
      await callTool(ctx, 'grimmory_lookup_isbn', {
        isbn: '9781234567890',
      });

      expect(mockClient.get).toHaveBeenCalledWith('metadata/isbn/9781234567890');
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            lookupIsbn: { success: false, error: 'ISBN not found', isError: true },
          });
          registerMetadataTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_lookup_isbn',
          arguments: { isbn: '0000000000' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('ISBN not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
