/**
 * Grimmory MCP Server - Zod Input Validation Schemas
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PaginationSchema = z
  .object({
    page: z.number().int().min(0).default(0),
    size: z.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    dir: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Response format
// ---------------------------------------------------------------------------

export const ResponseFormatSchema = z.enum(["json", "markdown"]).default("json");

// ---------------------------------------------------------------------------
// ID schemas
// ---------------------------------------------------------------------------

export const BookIdSchema = z
  .object({
    bookId: z.string().uuid(),
  })
  .strict();

export const LibraryIdSchema = z
  .object({
    libraryId: z.string().uuid(),
  })
  .strict();

export const ShelfIdSchema = z
  .object({
    shelfId: z.string().uuid(),
  })
  .strict();

export const AuthorIdSchema = z
  .object({
    authorId: z.string().uuid(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

/** List books – supports filtering by library and text search */
export const ListBooksInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
  libraryId: z.string().uuid().optional(),
  search: z.string().optional(),
}).strict();

/** Get a single book by ID */
export const GetBookInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

/** List libraries */
export const ListLibrariesInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

/** Get a single library by ID */
export const GetLibraryInputSchema = LibraryIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

/** List shelves within a library */
export const ListShelvesInputSchema = LibraryIdSchema.extend({
  response_format: ResponseFormatSchema,
  ...PaginationSchema.shape,
}).strict();

/** Get a single shelf by ID */
export const GetShelfInputSchema = ShelfIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

/** List all shelves with optional library filter */
export const ListShelvesAllInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
  libraryId: z.string().uuid().optional(),
}).strict();

/** Get books in a specific shelf */
export const GetShelfBooksInputSchema = ShelfIdSchema.extend({
  response_format: ResponseFormatSchema,
  ...PaginationSchema.shape,
}).strict();

/** List authors */
export const ListAuthorsInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
  search: z.string().optional(),
}).strict();

/** Get a single author by ID */
export const GetAuthorInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

/** Create or update a note/review for a book */
export const CreateNoteInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  note: z.string().min(1),
  rating: z.number().int().min(0).max(5).optional(),
}).strict();

/** List notes/reviews for a book */
export const ListNotesInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  ...PaginationSchema.shape,
}).strict();

// ---------------------------------------------------------------------------
// Notes tool schemas
// ---------------------------------------------------------------------------

/** Create a note for a book */
export const CreateBookNoteInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  content: z.string().min(1),
  page: z.number().int().min(1).optional(),
}).strict();

/** Delete a note for a book */
export const DeleteNoteInputSchema = BookIdSchema.extend({
  noteId: z.string().uuid(),
  response_format: ResponseFormatSchema,
}).strict();

// ---------------------------------------------------------------------------
// Reading status enum
// ---------------------------------------------------------------------------

export const ReadStatusEnum = z.enum([
  "UNREAD",
  "READING",
  "RE_READING",
  "READ",
  "PARTIALLY_READ",
  "PAUSED",
  "WONT_READ",
  "ABANDONED",
  "UNSET",
]);

// ---------------------------------------------------------------------------
// Reading tool schemas
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Review & Metadata schemas
// ---------------------------------------------------------------------------

/** List reviews for a book */
export const ListReviewsInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  ...PaginationSchema.shape,
}).strict();

/** Lookup book metadata by ISBN */
export const LookupIsbnInputSchema = z
  .object({
    isbn: z.string().min(1).describe('ISBN-10 or ISBN-13 to look up'),
    response_format: ResponseFormatSchema,
  })
  .strict();
/** Update the read status of a book */
export const UpdateReadStatusInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  status: ReadStatusEnum,
}).strict();

/** Update the personal rating of a book (1-5) */
export const UpdateRatingInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  rating: z.number().int().min(1).max(5),
}).strict();

/** Update the reading progress of a book (0-100) */
export const UpdateProgressInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  progress: z.number().int().min(0).max(100),
}).strict();

// ---------------------------------------------------------------------------
// Stats, Recommendations & Notebook schemas
// ---------------------------------------------------------------------------

/** Get dashboard stats */
export const GetStatsInputSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

/** Get book recommendations */
export const GetRecommendationsInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

/** Get notebook entries (books with notes/highlights) */
export const GetNotebookInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
  search: z.string().optional(),
  libraryId: z.string().uuid().optional(),
}).strict();
