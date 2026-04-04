// ============================================================================
// Grimmory MCP Server — Metadata Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  LookupIsbnInputSchema,
  UpdateBookMetadataInputSchema,
  GetFileMetadataInputSchema,
  GetComicInfoInputSchema,
  BulkEditMetadataInputSchema,
  ToggleAllLocksInputSchema,
  ToggleFieldLocksInputSchema,
  RecalcMatchScoresInputSchema,
  BatchIsbnLookupInputSchema,
  GetProviderMetadataInputSchema,
  GetMetadataLockFieldsInputSchema,
  ConsolidateMetadataInputSchema,
  DeleteMetadataValuesInputSchema,
  ProspectiveMetadataInputSchema,
} from '../schemas/index.js';
import type { BookMetadata } from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const EXTERNAL_API_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
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
 * Register all metadata-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerMetadataTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_lookup_isbn --------------------------------------------------

  server.registerTool(
    'grimmory_lookup_isbn',
    {
      description: 'Look up book metadata by ISBN (ISBN-10 or ISBN-13)',
      inputSchema: LookupIsbnInputSchema,
      annotations: EXTERNAL_API_ANNOTATIONS,
    },
    async (args) => {
      const { isbn, response_format } = args;

      const result = await client.post<BookMetadata>(`books/metadata/isbn-lookup`, { isbn });
      if (!result.success) {
        return formatter.formatError(result.error);
      }

      if (response_format === 'json') {
        return formatter.format(result.data, 'json');
      }

      return formatter.format(result.data, 'markdown', { title: result.data.title ?? 'ISBN Lookup' });
    },
  );

  // -- grimmory_update_book_metadata ------------------------------------------

  server.registerTool(
    'grimmory_update_book_metadata',
    {
      description: 'Update metadata fields for a specific book',
      inputSchema: UpdateBookMetadataInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, metadata, response_format } = args;

      const result = await client.put(`books/${bookId}/metadata`, metadata);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Metadata Updated' });
    },
  );

  // -- grimmory_get_file_metadata ---------------------------------------------

  server.registerTool(
    'grimmory_get_file_metadata',
    {
      description: 'Retrieve file-level metadata for a book',
      inputSchema: GetFileMetadataInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.get(`books/${bookId}/file-metadata`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'File Metadata' });
    },
  );

  // -- grimmory_get_comic_info ------------------------------------------------

  server.registerTool(
    'grimmory_get_comic_info',
    {
      description: 'Retrieve ComicInfo XML metadata for a CBX book',
      inputSchema: GetComicInfoInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.get(`books/${bookId}/cbx/metadata/comicinfo`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'ComicInfo Metadata' });
    },
  );

  // -- grimmory_bulk_edit_metadata --------------------------------------------

  server.registerTool(
    'grimmory_bulk_edit_metadata',
    {
      description: 'Apply the same metadata changes to multiple books at once. ⚠️ DESTRUCTIVE — overwrites metadata fields on all specified books',
      inputSchema: BulkEditMetadataInputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (args) => {
      const { bookIds, metadata, response_format } = args;

      const result = await client.put('books/bulk-edit-metadata', { bookIds, metadata });

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Bulk Metadata Updated' });
    },
  );

  // -- grimmory_toggle_all_locks ----------------------------------------------

  server.registerTool(
    'grimmory_toggle_all_locks',
    {
      description: 'Lock or unlock all metadata fields globally',
      inputSchema: ToggleAllLocksInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) => {
      const { locked, response_format } = args;

      const result = await client.put('books/metadata/toggle-all-lock', { locked });

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'All Locks Toggled' });
    },
  );

  // -- grimmory_toggle_field_locks --------------------------------------------

  server.registerTool(
    'grimmory_toggle_field_locks',
    {
      description: 'Lock or unlock specific metadata fields',
      inputSchema: ToggleFieldLocksInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) => {
      const { fields, locked, response_format } = args;

      const result = await client.put('books/metadata/toggle-field-locks', { fields, locked });

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Field Locks Toggled' });
    },
  );

  // -- grimmory_recalculate_match_scores --------------------------------------

  server.registerTool(
    'grimmory_recalculate_match_scores',
    {
      description: 'Trigger recalculation of metadata match scores for all books',
      inputSchema: RecalcMatchScoresInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) => {
      const { response_format } = args;

      const result = await client.post('books/metadata/recalculate-match-scores', {});

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Match Scores Recalculated' });
    },
  );

  // -- grimmory_batch_isbn_lookup ---------------------------------------------

  server.registerTool(
    'grimmory_batch_isbn_lookup',
    {
      description: 'Look up metadata for multiple ISBNs in a single request via external metadata providers',
      inputSchema: BatchIsbnLookupInputSchema,
      annotations: EXTERNAL_API_ANNOTATIONS,
    },
    async (args) => {
      const { isbns, response_format } = args;

      const result = await client.post('books/metadata/isbn-lookup', { isbns });

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Batch ISBN Lookup' });
    },
  );

  // -- grimmory_get_provider_metadata -----------------------------------------

  server.registerTool(
    'grimmory_get_provider_metadata',
    {
      description: 'Retrieve metadata from a specific external provider by provider item ID',
      inputSchema: GetProviderMetadataInputSchema,
      annotations: EXTERNAL_API_ANNOTATIONS,
    },
    async (args) => {
      const { provider, providerItemId, response_format } = args;

      const result = await client.get(`books/metadata/detail/${provider}/${providerItemId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Provider Metadata' });
    },
  );

  // -- grimmory_get_lock_fields -----------------------------------------------

  server.registerTool(
    'grimmory_get_lock_fields',
    {
      description: 'List all metadata fields that support locking',
      inputSchema: GetMetadataLockFieldsInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const { response_format } = args;

      const result = await client.get('books/metadata/lock-fields');

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Metadata Lock Fields' });
    },
  );

  // -- grimmory_consolidate_metadata ------------------------------------------

  server.registerTool(
    'grimmory_consolidate_metadata',
    {
      description: 'Merge and deduplicate metadata from multiple providers. ⚠️ DESTRUCTIVE — overwrites existing metadata with consolidated values',
      inputSchema: ConsolidateMetadataInputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (args) => {
      const { bookIds, response_format } = args;

      const body = bookIds ? { bookIds } : {};
      const result = await client.post('metadata/manage/consolidate', body);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Metadata Consolidated' });
    },
  );

  // -- grimmory_delete_metadata_values ----------------------------------------

  server.registerTool(
    'grimmory_delete_metadata_values',
    {
      description: 'Delete specific metadata field values from books. ⚠️ DESTRUCTIVE — permanently removes metadata field values',
      inputSchema: DeleteMetadataValuesInputSchema,
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    async (args) => {
      const { bookIds, fields, response_format } = args;

      const result = await client.post('metadata/manage/delete', { bookIds, fields });

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Metadata Values Deleted' });
    },
  );

  // -- grimmory_prospective_metadata ------------------------------------------

  server.registerTool(
    'grimmory_prospective_metadata',
    {
      description: 'Preview potential metadata matches for a book before applying (SSE streaming endpoint, returns aggregated results)',
      inputSchema: ProspectiveMetadataInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.sseGet(`books/${bookId}/metadata/prospective`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, { title: 'Prospective Metadata' });
    },
  );
}
