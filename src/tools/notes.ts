// ============================================================================
// Grimmory MCP Server — Notes Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  ListNotesInputSchema,
  CreateBookNoteInputSchema,
  DeleteNoteInputSchema,
} from '../schemas/index.js';
import type { BookNote, Page } from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const LIST_NOTES_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const MUTATING_NOTES_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all notes-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerNotesTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_notes ----------------------------------------------------

  server.registerTool(
    'grimmory_list_notes',
    {
      description: 'List notes for a book with pagination',
      inputSchema: ListNotesInputSchema,
      annotations: LIST_NOTES_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format, page, size, sort, dir } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;

      const result = await client.get<Page<BookNote>>(
        `books/${bookId}/notes`,
        params,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: `Notes for Book ${bookId}`,
      });
    },
  );

  // -- grimmory_create_note ---------------------------------------------------

  server.registerTool(
    'grimmory_create_note',
    {
      description: 'Create a new note for a book',
      inputSchema: CreateBookNoteInputSchema,
      annotations: MUTATING_NOTES_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, content, page, response_format } = args;

      const body: Record<string, unknown> = { content };
      if (page != null) body.page = page;

      const result = await client.post<BookNote>(
        `books/${bookId}/notes`,
        body,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatNote(result.data, response_format);
    },
  );

  // -- grimmory_delete_note ---------------------------------------------------

  server.registerTool(
    'grimmory_delete_note',
    {
      description: 'Delete a note from a book',
      inputSchema: DeleteNoteInputSchema,
      annotations: MUTATING_NOTES_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, noteId, response_format } = args;

      const result = await client.delete<void>(
        `books/${bookId}/notes/${noteId}`,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(
        { message: `Note ${noteId} deleted from book ${bookId}` },
        response_format,
        { title: 'Note Deleted' },
      );
    },
  );
}
