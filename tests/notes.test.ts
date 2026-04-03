/**
 * Tests for Notes tools (grimmory_list_notes, grimmory_create_note,
 * grimmory_delete_note).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createTestMCPContext, cleanupMCPContext, callTool, listTools, type TestMCPContext } from './helpers/mcp-helpers.js';
import { registerNotesTools } from '../src/tools/notes.js';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type { GrimmoryClient } from '../src/services/grimmory-client.js';
import type { ApiResponse } from '../src/services/grimmory-client.js';
import type { BookNote, Page } from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOOK_ID = '00000000-0000-0000-0000-000000000001';
const NOTE_ID = '00000000-0000-0000-0000-000000000002';

const mockNote: BookNote = {
  id: 42,
  userId: 1,
  bookId: 1,
  title: 'Note Title',
  content: 'This is a note about the book.',
  createdAt: '2025-06-15T10:00:00Z',
  updatedAt: '2025-06-15T10:00:00Z',
};

const mockNotesPage: Page<BookNote> = {
  content: [mockNote],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

function createMockClient(overrides?: {
  getNotes?: ApiResponse<Page<BookNote>>;
  createNote?: ApiResponse<BookNote>;
  deleteNote?: ApiResponse<void>;
}): GrimmoryClient {
  const mockGetNotes = overrides?.getNotes ?? { success: true, data: mockNotesPage };
  const mockCreateNote = overrides?.createNote ?? { success: true, data: mockNote };
  const mockDeleteNote = overrides?.deleteNote ?? { success: true, data: undefined };

  return {
    get: vi.fn(<T>(path: string) => {
      if (path.includes('/notes')) return Promise.resolve(mockGetNotes) as Promise<ApiResponse<T>>;
      return Promise.resolve({ success: false, error: 'Unknown path', isError: true });
    }),
    post: vi.fn(<T>(path: string) => {
      if (path.includes('/notes')) return Promise.resolve(mockCreateNote) as Promise<ApiResponse<T>>;
      return Promise.resolve({ success: false, error: 'Unknown path', isError: true });
    }),
    delete: vi.fn(<T>(path: string) => {
      if (path.includes('/notes')) return Promise.resolve(mockDeleteNote) as Promise<ApiResponse<T>>;
      return Promise.resolve({ success: false, error: 'Unknown path', isError: true });
    }),
  } as unknown as GrimmoryClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notes Tools', () => {
  const formatter = new ResponseFormatter();
  let ctx: TestMCPContext;
  let mockClient: GrimmoryClient;

  beforeAll(async () => {
    mockClient = createMockClient();
    ctx = await createTestMCPContext({
      setup: (server) => {
        registerNotesTools(server, mockClient, formatter);
      },
    });
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  // -- Registration ----------------------------------------------------------

  describe('tool registration', () => {
    it('registers all three notes tools', async () => {
      const tools = await listTools(ctx);
      const names = tools.map((t) => t.name);
      expect(names).toContain('grimmory_list_notes');
      expect(names).toContain('grimmory_create_note');
      expect(names).toContain('grimmory_delete_note');
    });

    it('grimmory_list_notes has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_list_notes');
      expect(tool?.description).toContain('notes');
    });

    it('grimmory_create_note has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_create_note');
      expect(tool?.description).toContain('note');
    });

    it('grimmory_delete_note has a description', async () => {
      const tools = await listTools(ctx);
      const tool = tools.find((t) => t.name === 'grimmory_delete_note');
      expect(tool?.description).toContain('note');
    });
  });

  // -- grimmory_list_notes ---------------------------------------------------

  describe('grimmory_list_notes', () => {
    it('returns notes page as JSON by default', async () => {
      const result = await callTool<Page<BookNote>>(ctx, 'grimmory_list_notes', {
        bookId: BOOK_ID,
      });
      expect(result.content).toHaveLength(1);
      expect(result.totalElements).toBe(1);
    });

    it('returns notes page as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_list_notes', {
        bookId: BOOK_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Notes for Book');
    });

    it('calls the API with correct path and pagination params', async () => {
      await callTool(ctx, 'grimmory_list_notes', {
        bookId: BOOK_ID,
        page: 1,
        size: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `books/${BOOK_ID}/notes`,
        { page: 1, size: 10 },
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            getNotes: { success: false, error: 'Book not found', isError: true },
          });
          registerNotesTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_list_notes',
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

  // -- grimmory_create_note --------------------------------------------------

  describe('grimmory_create_note', () => {
    it('returns created note as JSON by default', async () => {
      const result = await callTool<BookNote>(ctx, 'grimmory_create_note', {
        bookId: BOOK_ID,
        content: 'My note',
      });
      expect(result.id).toBe(42);
      expect(result.content).toBe('This is a note about the book.');
    });

    it('returns created note as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_create_note', {
        bookId: BOOK_ID,
        content: 'My note',
        response_format: 'markdown',
      });
      expect(result).toContain('Note Title');
    });

    it('calls the API with correct path and body', async () => {
      await callTool(ctx, 'grimmory_create_note', {
        bookId: BOOK_ID,
        content: 'My note content',
        page: 42,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `books/${BOOK_ID}/notes`,
        { content: 'My note content', page: 42 },
      );
    });

    it('omits page from body when not provided', async () => {
      await callTool(ctx, 'grimmory_create_note', {
        bookId: BOOK_ID,
        content: 'Simple note',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `books/${BOOK_ID}/notes`,
        { content: 'Simple note' },
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            createNote: { success: false, error: 'Forbidden', isError: true },
          });
          registerNotesTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_create_note',
          arguments: { bookId: BOOK_ID, content: 'test' },
        });
        expect(result.isError).toBe(true);
        const text = result.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        expect(text).toContain('Forbidden');
      } finally {
        await cleanupMCPContext(errorCtx);
      }
    });
  });

  // -- grimmory_delete_note --------------------------------------------------

  describe('grimmory_delete_note', () => {
    it('returns deletion confirmation as JSON by default', async () => {
      const result = await callTool<{ message: string }>(ctx, 'grimmory_delete_note', {
        bookId: BOOK_ID,
        noteId: NOTE_ID,
      });
      expect(result.message).toContain('deleted');
    });

    it('returns deletion confirmation as markdown when requested', async () => {
      const result = await callTool<string>(ctx, 'grimmory_delete_note', {
        bookId: BOOK_ID,
        noteId: NOTE_ID,
        response_format: 'markdown',
      });
      expect(result).toContain('Note Deleted');
    });

    it('calls the API with correct path', async () => {
      await callTool(ctx, 'grimmory_delete_note', {
        bookId: BOOK_ID,
        noteId: NOTE_ID,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        `books/${BOOK_ID}/notes/${NOTE_ID}`,
      );
    });

    it('returns error when API fails', async () => {
      const errorCtx = await createTestMCPContext({
        setup: (server) => {
          const errorClient = createMockClient({
            deleteNote: { success: false, error: 'Not found', isError: true },
          });
          registerNotesTools(server, errorClient, formatter);
        },
      });

      try {
        const result = await errorCtx.client.callTool({
          name: 'grimmory_delete_note',
          arguments: { bookId: BOOK_ID, noteId: NOTE_ID },
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
});
