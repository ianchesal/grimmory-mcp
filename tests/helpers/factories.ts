/**
 * Mock-data factories for Grimmory domain types.
 *
 * Every factory accepts a `Partial<T>` override so tests can customise only
 * the fields they care about while the rest stay sensibly defaulted.
 */

import type {
  Book,
  BookFile,
  BookMetadata,
  BookNote,
  BookReview,
  Library,
  LibraryPath,
  Shelf,
  AuthorSummary,
  AuthorDetails,
  Page,
  ReadStatus,
  BookType,
  AdditionalFile,
} from "../../src/types.js";

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

export function createMockBookFile(overrides?: Partial<BookFile>): BookFile {
  return {
    id: 1,
    bookId: 1,
    fileName: "test-book.epub",
    filePath: "/books/test-book.epub",
    fileSubPath: "/",
    fileSizeKb: 1024,
    bookType: "EPUB" satisfies BookType,
    folderBased: false,
    extension: "epub",
    addedOn: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockBookReview(overrides?: Partial<BookReview>): BookReview {
  return {
    id: 1,
    metadataProvider: "goodreads",
    reviewerName: "Test Reviewer",
    title: "Great book",
    rating: 4,
    date: "2025-01-01",
    body: "An excellent read.",
    ...overrides,
  };
}

export function createMockBookMetadata(overrides?: Partial<BookMetadata>): BookMetadata {
  return {
    bookId: 1,
    title: "Test Book",
    subtitle: "A Subtitle",
    publisher: "Test Publisher",
    publishedDate: "2025-01-01",
    description: "A test book description.",
    seriesName: "Test Series",
    seriesNumber: 1,
    seriesTotal: 3,
    isbn13: "9781234567890",
    pageCount: 300,
    language: "en",
    rating: 4.5,
    authors: ["Test Author"],
    categories: ["Fiction"],
    tags: ["test"],
    ...overrides,
  };
}

export function createMockBook(overrides?: Partial<Book>): Book {
  return {
    id: 1,
    libraryId: 1,
    libraryName: "Test Library",
    primaryFile: createMockBookFile(),
    fileName: "test-book.epub",
    filePath: "/books/test-book.epub",
    fileSizeKb: 1024,
    metadata: createMockBookMetadata(),
    shelves: [createMockShelf()],
    lastReadTime: "2025-06-01T12:00:00Z",
    addedOn: "2025-01-01T00:00:00Z",
    readStatus: "UNREAD" satisfies ReadStatus,
    ...overrides,
  };
}

export function createMockAdditionalFile(overrides?: Partial<AdditionalFile>): AdditionalFile {
  return {
    ...createMockBookFile({ id: 2 }),
    additionalFileType: "ALTERNATIVE_FORMAT",
    description: "PDF version",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export function createMockLibraryPath(overrides?: Partial<LibraryPath>): LibraryPath {
  return {
    id: 1,
    libraryId: 1,
    path: "/books",
    ...overrides,
  };
}

export function createMockLibrary(overrides?: Partial<Library>): Library {
  return {
    id: 1,
    name: "Test Library",
    icon: null,
    iconType: null,
    watch: true,
    paths: [createMockLibraryPath()],
    metadataSource: "EMBEDDED",
    organizationMode: "BOOK_PER_FILE",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

export function createMockShelf(overrides?: Partial<Shelf>): Shelf {
  return {
    id: 1,
    name: "Test Shelf",
    icon: null,
    iconType: null,
    publicShelf: false,
    userId: 1,
    bookCount: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

export function createMockAuthorSummary(overrides?: Partial<AuthorSummary>): AuthorSummary {
  return {
    id: 1,
    name: "Test Author",
    bookCount: 10,
    hasPhoto: false,
    ...overrides,
  };
}

export function createMockAuthorDetails(overrides?: Partial<AuthorDetails>): AuthorDetails {
  return {
    id: 1,
    name: "Test Author",
    description: "A prolific test author.",
    asin: "B000000000",
    nameLocked: false,
    descriptionLocked: false,
    asinLocked: false,
    photoLocked: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function createMockBookNote(overrides?: Partial<BookNote>): BookNote {
  return {
    id: 1,
    userId: 1,
    bookId: 1,
    title: "Test Note",
    content: "Some test note content.",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function createMockPage<T>(content: T[], overrides?: Partial<Page<T>>): Page<T> {
  const totalElements = content.length;
  return {
    content,
    page: 0,
    size: 20,
    totalElements,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    ...overrides,
  };
}
