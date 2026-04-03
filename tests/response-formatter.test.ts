import { describe, expect, it } from 'bun:test';
import { ResponseFormatter } from '../src/services/response-formatter.js';
import type {
  Book,
  BookNote,
  BookReview,
  Library,
  Page,
  Shelf,
  Author,
} from '../src/types.js';

const fmt = new ResponseFormatter();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    libraryId: 10,
    libraryName: 'Test Library',
    metadata: {
      title: 'Test Book',
      authors: ['Jane Doe'],
      description: '<p>A great <b>book</b> about testing.</p>',
      isbn13: '9781234567890',
      publishedDate: '2023',
      pageCount: 342,
      publisher: 'Test Press',
      language: 'en',
      seriesName: 'Test Series',
      seriesNumber: 3,
      categories: ['Fiction', 'Tech'],
      tags: ['testing', 'tdd'],
    },
    readStatus: 'READING',
    personalRating: 4,
    epubProgress: { cfi: 'epubcfi(/6/4)', percentage: 45 },
    ...overrides,
  };
}

function makePage<T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    ...overrides,
  };
}

function makeLibrary(overrides: Partial<Library> = {}): Library {
  return {
    id: 1,
    name: 'My Library',
    watch: true,
    paths: [{ id: 1, libraryId: 1, path: '/books' }],
    metadataSource: 'PREFER_SIDECAR',
    organizationMode: 'AUTO_DETECT',
    ...overrides,
  };
}

function makeShelf(overrides: Partial<Shelf> = {}): Shelf {
  return {
    id: 1,
    name: 'To Read',
    bookCount: 42,
    publicShelf: true,
    ...overrides,
  };
}

function makeAuthorSummary(overrides: Partial<Author> = {}): Author {
  return {
    id: 1,
    name: 'Jane Doe',
    bookCount: 15,
    hasPhoto: false,
    ...overrides,
  };
}

function makeAuthorDetails(overrides: Partial<Author> = {}): Author {
  return {
    id: 2,
    name: 'John Smith',
    description: '<p>A prolific <em>writer</em> of fiction.</p>',
    asin: 'B001XX',
    nameLocked: false,
    descriptionLocked: false,
    asinLocked: false,
    photoLocked: false,
    ...overrides,
  };
}

function makeNote(overrides: Partial<BookNote> = {}): BookNote {
  return {
    id: 1,
    userId: 1,
    bookId: 1,
    title: 'My Note',
    content: 'This is a note about the book.',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

function makeReview(overrides: Partial<BookReview> = {}): BookReview {
  return {
    id: 1,
    metadataProvider: 'goodreads',
    reviewerName: 'Alice',
    title: 'Great read!',
    rating: 5,
    date: '2024-06-01',
    body: '<p>Loved every page of this <b>masterpiece</b>.</p>',
    country: 'US',
    followersCount: 100,
    textReviewsCount: 50,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Generic format
// ---------------------------------------------------------------------------

describe('ResponseFormatter', () => {
  describe('format (generic)', () => {
    it('returns JSON string for json format', () => {
      const result = fmt.format({ foo: 'bar' }, 'json');
      expect(result.content[0].text).toContain('"foo": "bar"');
      expect(result.isError).toBeUndefined();
    });

    it('returns markdown code block for markdown format', () => {
      const result = fmt.format({ foo: 'bar' }, 'markdown', { title: 'Test' });
      expect(result.content[0].text).toContain('# Test');
      expect(result.content[0].text).toContain('```json');
    });

    it('sets isError when options.isError is true', () => {
      const result = fmt.format({}, 'json', { isError: true });
      expect(result.isError).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // formatError
  // ---------------------------------------------------------------------------

  describe('formatError', () => {
    it('returns error text with isError flag', () => {
      const result = fmt.formatError('something went wrong');
      expect(result.content[0].text).toContain('Error: something went wrong');
      expect(result.isError).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // formatBook
  // ---------------------------------------------------------------------------

  describe('formatBook', () => {
    it('returns valid JSON for json format', () => {
      const book = makeBook();
      const result = fmt.formatBook(book, 'json');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1);
    });

    it('returns markdown with title, author, status, rating', () => {
      const book = makeBook();
      const result = fmt.formatBook(book, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# Test Book');
      expect(text).toContain('**Author:** Jane Doe');
      expect(text).toContain('**Status:** READING');
      expect(text).toContain('★★★★☆ (4/5)');
    });

    it('strips HTML from description', () => {
      const book = makeBook();
      const result = fmt.formatBook(book, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('A great book about testing.');
      expect(text).not.toContain('<p>');
      expect(text).not.toContain('<b>');
    });

    it('shows progress percentage', () => {
      const book = makeBook();
      const result = fmt.formatBook(book, 'markdown');
      expect(result.content[0].text).toContain('**Progress:** 45%');
    });

    it('includes metadata section', () => {
      const book = makeBook();
      const result = fmt.formatBook(book, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('## Metadata');
      expect(text).toContain('- ISBN: 9781234567890');
      expect(text).toContain('- Published: 2023');
      expect(text).toContain('- Pages: 342');
      expect(text).toContain('- Publisher: Test Press');
      expect(text).toContain('- Series: Test Series #3');
      expect(text).toContain('- Categories: Fiction, Tech');
      expect(text).toContain('- Tags: testing, tdd');
    });

    it('handles book with no metadata gracefully', () => {
      const book = makeBook({ metadata: undefined, fileName: 'file.epub' });
      const result = fmt.formatBook(book, 'markdown');
      expect(result.content[0].text).toContain('# file.epub');
      expect(result.content[0].text).toContain('**Author:** Unknown');
    });

    it('uses metadata rating when no personal rating', () => {
      const book = makeBook({ personalRating: undefined, metadata: { ...makeBook().metadata, personalRating: undefined, rating: 3 } });
      const result = fmt.formatBook(book, 'markdown');
      expect(result.content[0].text).toContain('★★★☆☆ (3/5)');
    });
  });

  // ---------------------------------------------------------------------------
  // formatBookList
  // ---------------------------------------------------------------------------

  describe('formatBookList', () => {
    it('returns valid JSON for json format', () => {
      const page = makePage([makeBook(), makeBook({ id: 2 })]);
      const result = fmt.formatBookList(page, 'json');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.content).toHaveLength(2);
    });

    it('returns markdown with pagination info', () => {
      const page = makePage([makeBook()], { totalElements: 50, totalPages: 5, hasNext: true });
      const result = fmt.formatBookList(page, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('Page 1 of 5');
      expect(text).toContain('Showing 1 of 50 items');
      expect(text).toContain('next page available');
    });
  });

  // ---------------------------------------------------------------------------
  // formatLibrary
  // ---------------------------------------------------------------------------

  describe('formatLibrary', () => {
    it('returns valid JSON for json format', () => {
      const lib = makeLibrary();
      const result = fmt.formatLibrary(lib, 'json');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.name).toBe('My Library');
    });

    it('returns markdown with name, paths, metadata', () => {
      const lib = makeLibrary();
      const result = fmt.formatLibrary(lib, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# My Library');
      expect(text).toContain('- /books');
      expect(text).toContain('**Metadata Source:** PREFER_SIDECAR');
    });
  });

  // ---------------------------------------------------------------------------
  // formatLibraryList
  // ---------------------------------------------------------------------------

  describe('formatLibraryList', () => {
    it('returns markdown with multiple libraries', () => {
      const page = makePage([makeLibrary(), makeLibrary({ id: 2, name: 'Other' })]);
      const result = fmt.formatLibraryList(page, 'markdown');
      expect(result.content[0].text).toContain('# My Library');
      expect(result.content[0].text).toContain('# Other');
    });
  });

  // ---------------------------------------------------------------------------
  // formatShelf
  // ---------------------------------------------------------------------------

  describe('formatShelf', () => {
    it('returns markdown with name and book count', () => {
      const shelf = makeShelf();
      const result = fmt.formatShelf(shelf, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# To Read');
      expect(text).toContain('**Book Count:** 42');
      expect(text).toContain('**Public:** Yes');
    });
  });

  // ---------------------------------------------------------------------------
  // formatAuthor
  // ---------------------------------------------------------------------------

  describe('formatAuthor', () => {
    it('formats AuthorSummary with book count', () => {
      const author = makeAuthorSummary();
      const result = fmt.formatAuthor(author, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# Jane Doe');
      expect(text).toContain('**Book Count:** 15');
    });

    it('formats AuthorDetails with description (HTML stripped)', () => {
      const author = makeAuthorDetails();
      const result = fmt.formatAuthor(author, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# John Smith');
      expect(text).toContain('A prolific writer of fiction.');
      expect(text).not.toContain('<em>');
      expect(text).toContain('**ASIN:** B001XX');
    });
  });

  // ---------------------------------------------------------------------------
  // formatNote
  // ---------------------------------------------------------------------------

  describe('formatNote', () => {
    it('returns markdown with title and content', () => {
      const note = makeNote();
      const result = fmt.formatNote(note, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# My Note');
      expect(text).toContain('This is a note about the book.');
      expect(text).toContain('**Created:** 2024-01-15T10:00:00Z');
    });
  });

  // ---------------------------------------------------------------------------
  // formatReview
  // ---------------------------------------------------------------------------

  describe('formatReview', () => {
    it('returns markdown with stripped HTML body', () => {
      const review = makeReview();
      const result = fmt.formatReview(review, 'markdown');
      const text = result.content[0].text;
      expect(text).toContain('# Great read!');
      expect(text).toContain('**Reviewer:** Alice');
      expect(text).toContain('★★★★★ (5/5)');
      expect(text).toContain('Loved every page of this masterpiece.');
      expect(text).not.toContain('<b>');
    });

    it('handles minimal review', () => {
      const review: BookReview = { id: 1 };
      const result = fmt.formatReview(review, 'json');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1);
    });
  });
});
