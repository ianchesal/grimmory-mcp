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
// ID schemas - accept both strings and numbers (API uses numeric IDs)
// ---------------------------------------------------------------------------

export const BookIdSchema = z
  .object({
    bookId: z.union([z.string(), z.number()]).transform((val) =>
      typeof val === "string" ? val : String(val)
    ),
  })
  .strict();

export const LibraryIdSchema = z
  .object({
    libraryId: z.union([z.string(), z.number()]).transform((val) =>
      typeof val === "string" ? val : String(val)
    ),
  })
  .strict();

export const ShelfIdSchema = z
  .object({
    shelfId: z.union([z.string(), z.number()]).transform((val) =>
      typeof val === "string" ? val : String(val)
    ),
  })
  .strict();

export const AuthorIdSchema = z
  .object({
    authorId: z.union([z.string(), z.number()]).transform((val) =>
      typeof val === "string" ? val : String(val)
    ),
  })
  .strict();

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

/** List books – supports filtering by library and text search */
export const ListBooksInputSchema = PaginationSchema.extend({
  response_format: ResponseFormatSchema,
  libraryId: z.union([z.string(), z.number()]).optional().transform((val) =>
    val === undefined ? undefined : typeof val === "string" ? val : String(val)
  ),
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
  libraryId: z.union([z.string(), z.number()]).optional().transform((val) =>
    val === undefined ? undefined : typeof val === "string" ? val : String(val)
  ),
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
  noteId: z.union([z.string(), z.number()]).transform((val) =>
    typeof val === "string" ? val : String(val)
  ),
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
  libraryId: z.union([z.string(), z.number()]).optional().transform((val) =>
    val === undefined ? undefined : typeof val === "string" ? val : String(val)
  ),
}).strict();

// ---------------------------------------------------------------------------
// Metadata tool schemas
// ---------------------------------------------------------------------------

/** Update book metadata */
export const UpdateBookMetadataInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  metadata: z.record(z.unknown()).describe('Key-value pairs of metadata fields to update'),
}).strict().describe('Update metadata fields for a specific book');

/** Get file metadata for a book */
export const GetFileMetadataInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Retrieve file-level metadata for a book');

/** Get ComicInfo metadata for a book */
export const GetComicInfoInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Retrieve ComicInfo XML metadata for a CBX book');

/** Bulk edit metadata for multiple books */
export const BulkEditMetadataInputSchema = z.object({
  response_format: ResponseFormatSchema,
  bookIds: z.array(z.union([z.string(), z.number()])).describe('Array of book IDs to update'),
  metadata: z.record(z.unknown()).describe('Key-value pairs of metadata fields to apply to all books'),
}).strict().describe('Apply the same metadata changes to multiple books at once');

/** Toggle all metadata field locks */
export const ToggleAllLocksInputSchema = z.object({
  response_format: ResponseFormatSchema,
  locked: z.boolean().describe('Set to true to lock all fields, false to unlock all'),
}).strict().describe('Lock or unlock all metadata fields globally');

/** Toggle specific metadata field locks */
export const ToggleFieldLocksInputSchema = z.object({
  response_format: ResponseFormatSchema,
  fields: z.array(z.string()).describe('Array of field names to toggle lock state on'),
  locked: z.boolean().describe('Set to true to lock, false to unlock the specified fields'),
}).strict().describe('Lock or unlock specific metadata fields');

/** Recalculate metadata match scores */
export const RecalcMatchScoresInputSchema = z.object({
  response_format: ResponseFormatSchema,
}).strict().describe('Trigger recalculation of metadata match scores for all books');

/** Batch ISBN lookup */
export const BatchIsbnLookupInputSchema = z.object({
  response_format: ResponseFormatSchema,
  isbns: z.array(z.string().min(1)).describe('Array of ISBN-10 or ISBN-13 values to look up'),
}).strict().describe('Look up metadata for multiple ISBNs in a single request');

/** Get provider metadata by provider and provider item ID */
export const GetProviderMetadataInputSchema = z.object({
  response_format: ResponseFormatSchema,
  provider: z.string().describe('Metadata provider name (e.g. google-books, open-library)'),
  providerItemId: z.string().describe('The provider-specific item identifier'),
}).strict().describe('Retrieve metadata from a specific provider by provider item ID');

/** Get available metadata lock fields */
export const GetMetadataLockFieldsInputSchema = z.object({
  response_format: ResponseFormatSchema,
}).strict().describe('List all metadata fields that support locking');

/** Consolidate metadata across providers */
export const ConsolidateMetadataInputSchema = z.object({
  response_format: ResponseFormatSchema,
  bookIds: z.array(z.union([z.string(), z.number()])).optional().describe('Optional array of book IDs to consolidate; omit for all'),
}).strict().describe('Merge and deduplicate metadata from multiple providers');

/** Delete metadata values */
export const DeleteMetadataValuesInputSchema = z.object({
  response_format: ResponseFormatSchema,
  bookIds: z.array(z.union([z.string(), z.number()])).describe('Array of book IDs whose metadata values to delete'),
  fields: z.array(z.string()).describe('Array of metadata field names to delete'),
}).strict().describe('Delete specific metadata field values from books');

/** Get prospective metadata for a book */
export const ProspectiveMetadataInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Preview potential metadata matches for a book before applying');

// ---------------------------------------------------------------------------
// Author tool schemas
// ---------------------------------------------------------------------------

/** Find an author by name */
export const FindAuthorByNameInputSchema = z.object({
  response_format: ResponseFormatSchema,
  name: z.string().min(1).describe('Author name to search for'),
}).strict().describe('Search for an author by their name');

/** Get authors for a specific book */
export const GetBookAuthorsInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Retrieve all authors associated with a specific book');

/** Update an author */
export const UpdateAuthorInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
  name: z.string().min(1).optional().describe('Updated author name'),
  description: z.string().optional().describe('Updated author description/bio'),
}).strict().describe('Update details for a specific author');

/** Search metadata for an author */
export const SearchAuthorMetadataInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
  query: z.string().min(1).optional().describe('Search query to filter metadata results'),
}).strict().describe('Search external metadata sources for author information');

/** Match an author to a metadata provider entry */
export const MatchAuthorInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
  provider: z.string().describe('Metadata provider to match against'),
  providerItemId: z.string().describe('The provider-specific author item ID to match'),
}).strict().describe('Manually link an author to a specific metadata provider entry');

/** Quick match an author */
export const QuickMatchAuthorInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Automatically find and apply the best metadata match for an author');

/** Unmatch authors */
export const UnmatchAuthorsInputSchema = z.object({
  response_format: ResponseFormatSchema,
  authorIds: z.array(z.union([z.string(), z.number()])).describe('Array of author IDs to unmatch'),
}).strict().describe('Remove metadata provider associations from authors');

/** Search for author photos */
export const SearchAuthorPhotosInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
  query: z.string().min(1).optional().describe('Search query to filter photo results'),
}).strict().describe('Search for author photos from metadata providers');

/** Set author photo URL */
export const SetAuthorPhotoUrlInputSchema = AuthorIdSchema.extend({
  response_format: ResponseFormatSchema,
  url: z.string().url().describe('URL of the author photo to set'),
}).strict().describe('Set the photo for an author via a URL');

/** Delete authors */
export const DeleteAuthorsInputSchema = z.object({
  response_format: ResponseFormatSchema,
  authorIds: z.array(z.union([z.string(), z.number()])).describe('Array of author IDs to delete'),
}).strict().describe('Delete one or more authors');

/** Auto-match all unmatched authors */
export const AutoMatchAuthorsInputSchema = z.object({
  response_format: ResponseFormatSchema,
}).strict().describe('Trigger automatic matching for all unmatched authors');

// ---------------------------------------------------------------------------
// Review tool schemas
// ---------------------------------------------------------------------------

/** Refresh reviews for a book */
export const RefreshBookReviewsInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Trigger a refresh of reviews from external sources for a book');

/** Delete a specific review */
export const DeleteReviewInputSchema = z.object({
  response_format: ResponseFormatSchema,
  reviewId: z.union([z.string(), z.number()]).describe('ID of the review to delete'),
}).strict().describe('Delete a specific review by its ID');

/** Delete all reviews for a book */
export const DeleteAllBookReviewsInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Delete all reviews associated with a specific book');

// ---------------------------------------------------------------------------
// Sidecar tool schemas
// ---------------------------------------------------------------------------

/** Get sidecar content for a book */
export const GetSidecarContentInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Retrieve the sidecar metadata file content for a book');

/** Get sidecar status for a book */
export const GetSidecarStatusInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Check the sidecar file status for a book');

/** Export sidecar for a book */
export const ExportSidecarInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Export the sidecar metadata file for a specific book');

/** Import sidecar for a book */
export const ImportSidecarInputSchema = BookIdSchema.extend({
  response_format: ResponseFormatSchema,
  content: z.string().min(1).describe('Sidecar file content to import'),
}).strict().describe('Import sidecar metadata content for a specific book');

/** Bulk export sidecars for a library */
export const BulkExportSidecarInputSchema = LibraryIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Export sidecar files for all books in a library');

/** Bulk import sidecars for a library */
export const BulkImportSidecarInputSchema = LibraryIdSchema.extend({
  response_format: ResponseFormatSchema,
}).strict().describe('Import sidecar files for all books in a library');
