/**
 * Grimmory MCP Server — Library Tools Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Page, Library } from '../src/types.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import {
  createTestMCPContext,
  callTool,
  listTools,
  cleanupMCPContext,
  type TestMCPContext,
} from './helpers/mcp-helpers.js';
import { createMockLibrary, createMockPage } from './helpers/factories.js';
import { registerLibraryTools } from '../src/tools/libraries.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';

// ---------------------------------------------------------------------------
// Mock client
// ---------------------------------------------------------------------------

function createMockClient(responses: Record<string, unknown>): GrimmoryClient {
  return {
    get: vi.fn().mockImplementation(async <T>(path: string) => {
      // Exact match only — the tool sends 'libraries' or 'libraries/{uuid}'
      if (path in responses) {
        return { success: true, data: responses[path] as T };
      }
      return { success: false, error: `Not found: ${path}`, isError: true };
    }),
  } as unknown as GrimmoryClient;
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Library Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;

  const mockLibraries: Page<Library> = createMockPage(
    [createMockLibrary({ id: 1, name: 'Fiction' }), createMockLibrary({ id: 2, name: 'Non-Fiction' })],
    { totalElements: 2, totalPages: 1 },
  );

  const mockLibrary: Library = createMockLibrary({
    id: 1,
    name: 'Fiction Library',
    watch: true,
    paths: [{ id: 1, libraryId: 1, path: '/books/fiction' }],
    metadataSource: 'PREFER_SIDECAR',
    organizationMode: 'AUTO_DETECT',
  });

  beforeAll(async () => {
    const client = createMockClient({
      libraries: mockLibraries,
      'libraries/00000000-0000-0000-0000-000000000001': mockLibrary,
    });

    ctx = await createTestMCPContext({
      setup: (server: McpServer) => {
        registerLibraryTools(server, client, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Tool registration -----------------------------------------------------

  describe('tool registration', () => {
    it('registers both library tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);

      expect(names).toContain('grimmory_list_libraries');
      expect(names).toContain('grimmory_get_library');
      expect(tools).toHaveLength(2);
    });

    it('grimmory_list_libraries has readOnlyHint annotation', async () => {
      const { tools } = await ctx.client.listTools();
      const listTool = tools.find((t) => t.name === 'grimmory_list_libraries');
      expect(listTool?.annotations?.readOnlyHint).toBe(true);
    });

    it('grimmory_get_library has readOnlyHint annotation', async () => {
      const { tools } = await ctx.client.listTools();
      const getTool = tools.find((t) => t.name === 'grimmory_get_library');
      expect(getTool?.annotations?.readOnlyHint).toBe(true);
    });
  });

  // -- grimmory_list_libraries -----------------------------------------------

  describe('grimmory_list_libraries', () => {
    it('returns libraries in JSON format by default', async () => {
      const result = await callTool<Page<Library>>(ctx, 'grimmory_list_libraries');

      expect(result.content).toHaveLength(2);
      expect(result.content[0].name).toBe('Fiction');
      expect(result.content[1].name).toBe('Non-Fiction');
    });

    it('returns libraries in JSON format when explicitly requested', async () => {
      const result = await callTool<Page<Library>>(
        ctx,
        'grimmory_list_libraries',
        { response_format: 'json' },
      );

      expect(result.content).toHaveLength(2);
    });

    it('returns libraries in markdown format', async () => {
      const result = await callTool<string>(
        ctx,
        'grimmory_list_libraries',
        { response_format: 'markdown' },
      );

      expect(result).toContain('# Fiction');
      expect(result).toContain('# Non-Fiction');
      expect(result).toContain('Page 1 of 1');
    });

    it('passes pagination params to the API client', async () => {
      // Verifies the tool accepts pagination params without parse errors.
      // Integration-level verification of actual client calls is in grimmory-client.test.ts.
      await callTool(ctx, 'grimmory_list_libraries', {
        page: 2,
        size: 10,
        sort: 'name',
        dir: 'desc',
      });
    });
  });

  // -- grimmory_get_library --------------------------------------------------

  describe('grimmory_get_library', () => {
    it('returns a single library in JSON format by default', async () => {
      const result = await callTool<Library>(
        ctx,
        'grimmory_get_library',
        { libraryId: '00000000-0000-0000-0000-000000000001' },
      );

      expect(result.name).toBe('Fiction Library');
      expect(result.watch).toBe(true);
    });

    it('returns a single library in markdown format', async () => {
      const result = await callTool<string>(
        ctx,
        'grimmory_get_library',
        {
          libraryId: '00000000-0000-0000-0000-000000000001',
          response_format: 'markdown',
        },
      );

      expect(result).toContain('# Fiction Library');
      expect(result).toContain('**Watch:** Yes');
      expect(result).toContain('- /books/fiction');
      expect(result).toContain('**Metadata Source:** PREFER_SIDECAR');
    });

    it('returns error content for unknown library ID', async () => {
      const result = await ctx.client.callTool({
        name: 'grimmory_get_library',
        arguments: { libraryId: '00000000-0000-0000-0000-999999999999' },
      });

      const text = result.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
      expect(text).toContain('Error');
    });

    it('rejects invalid UUID for libraryId', async () => {
      const result = await ctx.client.callTool({
        name: 'grimmory_get_library',
        arguments: { libraryId: 'not-a-uuid' },
      });

      expect(result.isError).toBe(true);
    });
  });
});
