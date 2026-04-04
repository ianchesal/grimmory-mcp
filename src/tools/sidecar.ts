// ============================================================================
// Grimmory MCP Server — Sidecar Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  GetSidecarContentInputSchema,
  GetSidecarStatusInputSchema,
  ExportSidecarInputSchema,
  ImportSidecarInputSchema,
  BulkExportSidecarInputSchema,
  BulkImportSidecarInputSchema,
} from '../schemas/index.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const EXPORT_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all sidecar-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerSidecarTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_get_sidecar --------------------------------------------------

  server.registerTool(
    'grimmory_get_sidecar',
    {
      description: 'Get the sidecar metadata file content for a book',
      inputSchema: GetSidecarContentInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.get<Record<string, unknown>>(
        `books/${bookId}/sidecar`,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatSidecarContent(result.data, response_format);
    },
  );

  // -- grimmory_get_sidecar_status -------------------------------------------

  server.registerTool(
    'grimmory_get_sidecar_status',
    {
      description: 'Check the sidecar file status for a book',
      inputSchema: GetSidecarStatusInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.get<Record<string, unknown>>(
        `books/${bookId}/sidecar/status`,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatSidecarStatus(result.data, response_format);
    },
  );

  // -- grimmory_export_sidecar -----------------------------------------------

  server.registerTool(
    'grimmory_export_sidecar',
    {
      description: 'Export the sidecar metadata file for a specific book',
      inputSchema: ExportSidecarInputSchema,
      annotations: EXPORT_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.post<Record<string, unknown>>(
        `books/${bookId}/sidecar/export`,
        undefined,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Sidecar Exported',
      });
    },
  );

  // -- grimmory_import_sidecar -----------------------------------------------

  server.registerTool(
    'grimmory_import_sidecar',
    {
      description: 'Import sidecar metadata content for a specific book',
      inputSchema: ImportSidecarInputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, content, response_format } = args;

      const result = await client.post<Record<string, unknown>>(
        `books/${bookId}/sidecar/import`,
        { content },
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Sidecar Imported',
      });
    },
  );

  // -- grimmory_bulk_export_sidecar ------------------------------------------

  server.registerTool(
    'grimmory_bulk_export_sidecar',
    {
      description: 'Export sidecar files for all books in a library',
      inputSchema: BulkExportSidecarInputSchema,
      annotations: EXPORT_ANNOTATIONS,
    },
    async (args) => {
      const { libraryId, response_format } = args;

      const result = await client.post<Record<string, unknown>>(
        `libraries/${libraryId}/sidecar/export-all`,
        undefined,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Bulk Sidecar Export',
      });
    },
  );

  // -- grimmory_bulk_import_sidecar ------------------------------------------

  server.registerTool(
    'grimmory_bulk_import_sidecar',
    {
      description: 'Import sidecar files for all books in a library',
      inputSchema: BulkImportSidecarInputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (args) => {
      const { libraryId, response_format } = args;

      const result = await client.post<Record<string, unknown>>(
        `libraries/${libraryId}/sidecar/import-all`,
        undefined,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Bulk Sidecar Import',
      });
    },
  );
}
