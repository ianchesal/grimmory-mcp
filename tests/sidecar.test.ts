/**
 * Tests for Sidecar tools (grimmory_get_sidecar, grimmory_get_sidecar_status,
 * grimmory_export_sidecar, grimmory_import_sidecar,
 * grimmory_bulk_export_sidecar, grimmory_bulk_import_sidecar).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { registerSidecarTools } from '../src/tools/sidecar.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse } from '../src/services/grimmory-client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOOK_ID = '00000000-0000-0000-0000-000000000001';
const LIBRARY_ID = '00000000-0000-0000-0000-000000000002';

const mockSidecarContent: Record<string, unknown> = {
  bookId: BOOK_ID,
  lastModified: '2025-06-15T10:00:00Z',
  fields: { title: 'Test Book', author: 'Test Author' },
};

const mockSidecarStatus: Record<string, unknown> = {
  exists: true,
  lastSynced: '2025-06-15T10:00:00Z',
  syncStatus: 'SYNCED',
};

const mockExportResponse: Record<string, unknown> = {
  bookId: BOOK_ID,
  exported: true,
  content: '---\ntitle: Test Book\n...',
};

const mockImportResponse: Record<string, unknown> = {
  bookId: BOOK_ID,
  imported: true,
  message: 'Sidecar imported successfully',
};

const mockBulkExportResponse: Record<string, unknown> = {
  libraryId: LIBRARY_ID,
  totalBooks: 10,
  exported: 8,
  failed: 2,
};

const mockBulkImportResponse: Record<string, unknown> = {
  libraryId: LIBRARY_ID,
  totalProcessed: 10,
  imported: 9,
  failed: 1,
};

function createMockClient(overrides?: {
  getSidecar?: ApiResponse<Record<string, unknown>>;
  getSidecarStatus?: ApiResponse<Record<string, unknown>>;
  exportSidecar?: ApiResponse<Record<string, unknown>>;
  importSidecar?: ApiResponse<Record<string, unknown>>;
  bulkExportSidecar?: ApiResponse<Record<string, unknown>>;
  bulkImportSidecar?: ApiResponse<Record<string, unknown>>;
}): GrimmoryClient {
  const defaults = {
    getSidecar: { success: true, data: mockSidecarContent },
    getSidecarStatus: { success: true, data: mockSidecarStatus },
    exportSidecar: { success: true, data: mockExportResponse },
    importSidecar: { success: true, data: mockImportResponse },
    bulkExportSidecar: { success: true, data: mockBulkExportResponse },
    bulkImportSidecar: { success: true, data: mockBulkImportResponse },
  };

  const opts = { ...defaults, ...overrides };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.endsWith('/sidecar')) return Promise.resolve(opts.getSidecar) as Promise<ApiResponse<T>>;
      if (path.endsWith('/sidecar/status')) return Promise.resolve(opts.getSidecarStatus) as Promise<ApiResponse<T>>;
      return Promise.resolve({ success: false, error: 'Unknown path', isError: true }) as Promise<ApiResponse<T>>;
    }),
    post: vi.fn(<T>(path: string, _body: unknown) => {
      if (path.endsWith('/sidecar/export')) return Promise.resolve(opts.exportSidecar) as Promise<ApiResponse<T>>;
      if (path.endsWith('/sidecar/import')) return Promise.resolve(opts.importSidecar) as Promise<ApiResponse<T>>;
      if (path.endsWith('/sidecar/export-all')) return Promise.resolve(opts.bulkExportSidecar) as Promise<ApiResponse<T>>;
      if (path.endsWith('/sidecar/import-all')) return Promise.resolve(opts.bulkImportSidecar) as Promise<ApiResponse<T>>;
      return Promise.resolve({ success: false, error: 'Unknown path', isError: true }) as Promise<ApiResponse<T>>;
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sidecar Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerSidecarTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers all six sidecar tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_get_sidecar');
      expect(names).toContain('grimmory_get_sidecar_status');
      expect(names).toContain('grimmory_export_sidecar');
      expect(names).toContain('grimmory_import_sidecar');
      expect(names).toContain('grimmory_bulk_export_sidecar');
      expect(names).toContain('grimmory_bulk_import_sidecar');
    });

    it('grimmory_get_sidecar has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_get_sidecar');
      expect(tool?.description).toContain('sidecar');
    });

    it('grimmory_get_sidecar_status has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_get_sidecar_status');
      expect(tool?.description).toContain('sidecar');
    });

    it('grimmory_export_sidecar has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_export_sidecar');
      expect(tool?.description?.toLowerCase()).toContain('export');
    });

    it('grimmory_import_sidecar has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_import_sidecar');
      expect(tool?.description?.toLowerCase()).toContain('import');
    });

    it('grimmory_bulk_export_sidecar has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_bulk_export_sidecar');
      expect(tool?.description?.toLowerCase()).toContain('export');
    });

    it('grimmory_bulk_import_sidecar has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_bulk_import_sidecar');
      expect(tool?.description?.toLowerCase()).toContain('import');
    });

    it('grimmory_import_sidecar has destructiveHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      const tool = rawTools.tools.find((t) => t.name === 'grimmory_import_sidecar');
      expect(tool?.annotations?.destructiveHint).toBe(true);
    });

    it('grimmory_bulk_import_sidecar has destructiveHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      const tool = rawTools.tools.find((t) => t.name === 'grimmory_bulk_import_sidecar');
      expect(tool?.annotations?.destructiveHint).toBe(true);
    });

    it('grimmory_get_sidecar has readOnlyHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      const tool = rawTools.tools.find((t) => t.name === 'grimmory_get_sidecar');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });

    it('grimmory_get_sidecar_status has readOnlyHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      const tool = rawTools.tools.find((t) => t.name === 'grimmory_get_sidecar_status');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });

    it('grimmory_export_sidecar has readOnlyHint annotation', async () => {
      const rawTools = await ctx.client.listTools();
      const tool = rawTools.tools.find((t) => t.name === 'grimmory_export_sidecar');
      expect(tool?.annotations?.readOnlyHint).toBe(true);
    });
  });

  // -- grimmory_get_sidecar --------------------------------------------------

  describe('grimmory_get_sidecar', () => {
    it('returns sidecar content as JSON by default', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_get_sidecar', {
        bookId: BOOK_ID,
      });
      expect(result.bookId).toBe(BOOK_ID);
    });

    it('returns sidecar content as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_sidecar', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Sidecar Content');
    });

    it('calls the API with correct GET path', async () => {
      await callTool(ctx, 'grimmory_get_sidecar', { bookId: BOOK_ID });
      expect(mockClient.get).toHaveBeenCalledWith(`books/${BOOK_ID}/sidecar`);
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getSidecar: { success: false, error: 'Book not found', isError: true },
          });
          registerSidecarTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_sidecar',
          arguments: { bookId: BOOK_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Book not found');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_get_sidecar_status --------------------------------------------

  describe('grimmory_get_sidecar_status', () => {
    it('returns sidecar status as JSON by default', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_get_sidecar_status', {
        bookId: BOOK_ID,
      });
      expect(result.syncStatus).toBe('SYNCED');
    });

    it('returns sidecar status as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_get_sidecar_status', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Sidecar Sync Status');
    });

    it('calls the API with correct GET path', async () => {
      await callTool(ctx, 'grimmory_get_sidecar_status', { bookId: BOOK_ID });
      expect(mockClient.get).toHaveBeenCalledWith(`books/${BOOK_ID}/sidecar/status`);
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getSidecarStatus: { success: false, error: 'Not found', isError: true },
          });
          registerSidecarTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_get_sidecar_status',
          arguments: { bookId: BOOK_ID },
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

  // -- grimmory_export_sidecar ------------------------------------------------

  describe('grimmory_export_sidecar', () => {
    it('returns export response as JSON by default', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_export_sidecar', {
        bookId: BOOK_ID,
      });
      expect(result.exported).toBe(true);
    });

    it('returns export response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_export_sidecar', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Sidecar Exported');
    });

    it('calls the API with correct POST path', async () => {
      await callTool(ctx, 'grimmory_export_sidecar', { bookId: BOOK_ID });
      expect(mockClient.post).toHaveBeenCalledWith(`books/${BOOK_ID}/sidecar/export`, undefined);
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            exportSidecar: { success: false, error: 'Export failed', isError: true },
          });
          registerSidecarTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_export_sidecar',
          arguments: { bookId: BOOK_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Export failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_import_sidecar ------------------------------------------------

  describe('grimmory_import_sidecar', () => {
    const SIDECAR_CONTENT = '---\ntitle: Imported Book\n...';

    it('returns import response as JSON by default', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_import_sidecar', {
        bookId: BOOK_ID,
        content: SIDECAR_CONTENT,
      });
      expect(result.imported).toBe(true);
    });

    it('returns import response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_import_sidecar', {
        bookId: BOOK_ID,
        content: SIDECAR_CONTENT,
        response_format: 'markdown',
      });
      expect(result).toContain('Sidecar Imported');
    });

    it('calls the API with correct POST path and body', async () => {
      await callTool(ctx, 'grimmory_import_sidecar', {
        bookId: BOOK_ID,
        content: SIDECAR_CONTENT,
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        `books/${BOOK_ID}/sidecar/import`,
        { content: SIDECAR_CONTENT },
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            importSidecar: { success: false, error: 'Import failed', isError: true },
          });
          registerSidecarTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_import_sidecar',
          arguments: { bookId: BOOK_ID, content: SIDECAR_CONTENT },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Import failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_bulk_export_sidecar -------------------------------------------

  describe('grimmory_bulk_export_sidecar', () => {
    it('returns bulk export response as JSON by default', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_bulk_export_sidecar', {
        libraryId: LIBRARY_ID,
      });
      expect(result.exported).toBe(8);
      expect(result.totalBooks).toBe(10);
    });

    it('returns bulk export response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_bulk_export_sidecar', {
        libraryId: LIBRARY_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Bulk Sidecar Export');
    });

    it('calls the API with correct POST path', async () => {
      await callTool(ctx, 'grimmory_bulk_export_sidecar', { libraryId: LIBRARY_ID });
      expect(mockClient.post).toHaveBeenCalledWith(`libraries/${LIBRARY_ID}/sidecar/export-all`, undefined);
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            bulkExportSidecar: { success: false, error: 'Bulk export failed', isError: true },
          });
          registerSidecarTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_bulk_export_sidecar',
          arguments: { libraryId: LIBRARY_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Bulk export failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_bulk_import_sidecar -------------------------------------------

  describe('grimmory_bulk_import_sidecar', () => {
    it('returns bulk import response as JSON by default', async () => {
      const result = await callTool<Record<string, unknown>>(ctx, 'grimmory_bulk_import_sidecar', {
        libraryId: LIBRARY_ID,
      });
      expect(result.imported).toBe(9);
    });

    it('returns bulk import response as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_bulk_import_sidecar', {
        libraryId: LIBRARY_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Bulk Sidecar Import');
    });

    it('calls the API with correct POST path', async () => {
      await callTool(ctx, 'grimmory_bulk_import_sidecar', { libraryId: LIBRARY_ID });
      expect(mockClient.post).toHaveBeenCalledWith(`libraries/${LIBRARY_ID}/sidecar/import-all`, undefined);
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            bulkImportSidecar: { success: false, error: 'Bulk import failed', isError: true },
          });
          registerSidecarTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_bulk_import_sidecar',
          arguments: { libraryId: LIBRARY_ID },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Bulk import failed');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });
});
