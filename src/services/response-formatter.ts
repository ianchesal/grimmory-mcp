import { stripHtml, truncateText } from '../utils.js';
import type {
  Book,
  BookNote,
  BookReview,
  Library,
  Page,
  Shelf,
  Author,
  BooksSummary,
  BookRecommendationLite,
  RatingDistribution,
  StatusDistribution,
  SeriesEntry,
} from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResponseFormat = 'json' | 'markdown';

export interface FormattedResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  /** Index signature required for MCP CallToolResult compatibility. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stars(rating: number | null | undefined): string {
  if (rating == null) return 'N/A';
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full) + ` (${rating}/5)`;
}

function pct(progress: { percentage: number } | undefined | null): string | undefined {
  return progress ? `${progress.percentage}%` : undefined;
}

function getProgress(book: Book): string | undefined {
  return (
    pct(book.epubProgress) ??
    pct(book.pdfProgress) ??
    pct(book.cbxProgress) ??
    pct(book.audiobookProgress) ??
    pct(book.koreaderProgress) ??
    pct(book.koboProgress) ??
    undefined
  );
}

function metaLine(label: string, value: string | number | undefined | null): string | undefined {
  if (value == null || value === '') return undefined;
  return `- ${label}: ${value}`;
}

function formatPagination(page: Page<unknown>): string {
  const lines = [
    `Page ${page.page + 1} of ${page.totalPages}`,
    `Showing ${page.content.length} of ${page.totalElements} items`,
  ];
  if (page.hasNext) lines.push('(next page available)');
  if (page.hasPrevious) lines.push('(previous page available)');
  return `---\n${lines.join(' | ')}`;
}

// ---------------------------------------------------------------------------
// ResponseFormatter
// ---------------------------------------------------------------------------

export class ResponseFormatter {
  // -- generic ---------------------------------------------------------------

  format<T>(
    data: T,
    format: ResponseFormat,
    options?: { title?: string; isError?: boolean },
  ): FormattedResponse {
    // Handle undefined/null data
    if (data == null) {
      const emptyText = format === 'json' ? 'null' : 'No data available.';
      const result: FormattedResponse = { content: [{ type: 'text', text: emptyText }] };
      if (options?.isError) result.isError = true;
      return result;
    }

    const text =
      format === 'markdown'
        ? this.toMarkdown(data, options?.title)
        : truncateText(JSON.stringify(data, null, 2));

    const result: FormattedResponse = { content: [{ type: 'text', text }] };
    if (options?.isError) result.isError = true;
    return result;
  }

  // -- error -----------------------------------------------------------------

  formatError(error: string): FormattedResponse {
    return {
      content: [{ type: 'text', text: truncateText(`Error: ${error}`) }],
      isError: true,
    };
  }

  // -- book ------------------------------------------------------------------

  formatBook(book: Book, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(book, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.bookToMarkdown(book)),
        },
      ],
    };
  }

  formatBookList(page: Page<Book>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(page, 'json');
    }
    const books = page.content.map((b) => this.bookToMarkdown(b));
    return {
      content: [
        {
          type: 'text',
          text: truncateText(books.join('\n\n---\n\n') + '\n\n' + formatPagination(page)),
        },
      ],
    };
  }

  // -- library ---------------------------------------------------------------

  formatLibrary(library: Library, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(library, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.libraryToMarkdown(library)),
        },
      ],
    };
  }

  formatLibraryList(page: Page<Library>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(page, 'json');
    }
    const libs = page.content.map((l) => this.libraryToMarkdown(l));
    return {
      content: [
        {
          type: 'text',
          text: truncateText(libs.join('\n\n---\n\n') + '\n\n' + formatPagination(page)),
        },
      ],
    };
  }

  // -- shelf -----------------------------------------------------------------

  formatShelf(shelf: Shelf, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(shelf, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.shelfToMarkdown(shelf)),
        },
      ],
    };
  }

  // -- author ----------------------------------------------------------------

  formatAuthor(author: Author, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(author, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.authorToMarkdown(author)),
        },
      ],
    };
  }

  formatAuthorList(page: Page<Author>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(page, 'json');
    }
    const authors = page.content.map((a) => this.authorToMarkdown(a));
    return {
      content: [
        {
          type: 'text',
          text: truncateText(authors.join('\n\n---\n\n') + '\n\n' + formatPagination(page)),
        },
      ],
    };
  }

  // -- note ------------------------------------------------------------------

  formatNote(note: BookNote, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(note, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.noteToMarkdown(note)),
        },
      ],
    };
  }

  // -- review ----------------------------------------------------------------

  formatReview(review: BookReview, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(review, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.reviewToMarkdown(review)),
        },
      ],
    };
  }

  // -- stats -----------------------------------------------------------------

  formatStats(
    data: {
      summary: BooksSummary;
      ratingDistribution: RatingDistribution[];
      statusDistribution: StatusDistribution[];
    },
    format: ResponseFormat,
  ): FormattedResponse {
    if (format === 'json') {
      return this.format(data, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.statsToMarkdown(data)),
        },
      ],
    };
  }

  // -- recommendations -------------------------------------------------------

  formatRecommendations(page: Page<BookRecommendationLite>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(page, 'json');
    }
    const items = page.content.map((r) => this.recommendationToMarkdown(r));
    return {
      content: [
        {
          type: 'text',
          text: truncateText(items.join('\n\n---\n\n') + '\n\n' + formatPagination(page)),
        },
      ],
    };
  }

  // -- notebook --------------------------------------------------------------

  formatNotebook(page: Page<Book>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(page, 'json');
    }
    const items = page.content.map((b) => this.notebookEntryToMarkdown(b));
    return {
      content: [
        {
          type: 'text',
          text: truncateText(items.join('\n\n---\n\n') + '\n\n' + formatPagination(page)),
        },
      ],
    };
  }

  // -- series ----------------------------------------------------------------

  formatSeriesList(page: Page<SeriesEntry>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(page, 'json');
    }
    const items = page.content.map((s) => this.seriesToMarkdown(s));
    return {
      content: [
        {
          type: 'text',
          text: truncateText(items.join('\n\n---\n\n') + '\n\n' + formatPagination(page)),
        },
      ],
    };
  }

  // -- sidecar ---------------------------------------------------------------

  formatSidecarContent(content: Record<string, unknown>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(content, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.sidecarContentToMarkdown(content)),
        },
      ],
    };
  }

  formatSidecarStatus(status: Record<string, unknown>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(status, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.sidecarStatusToMarkdown(status)),
        },
      ],
    };
  }

  // -- filter options ---------------------------------------------------------

  formatFilterOptions(options: Record<string, unknown>, format: ResponseFormat): FormattedResponse {
    if (format === 'json') {
      return this.format(options, 'json');
    }
    return {
      content: [
        {
          type: 'text',
          text: truncateText(this.filterOptionsToMarkdown(options)),
        },
      ],
    };
  }


  // =========================================================================
  // Private markdown generators
  // =========================================================================
  // Private markdown generators
  // =========================================================================

  private toMarkdown<T>(data: T, title?: string): string {
    const header = title ? `# ${title}\n\n` : '';
    return truncateText(header + '```json\n' + JSON.stringify(data, null, 2) + '\n```');
  }

  private bookToMarkdown(book: Book): string {
    const m = book.metadata;
    const title = m?.title ?? book.fileName ?? `Book #${book.id}`;
    const authors = m?.authors?.join(', ') ?? 'Unknown';
    const lines: string[] = [`# ${title}`, ''];

    lines.push(`**Author:** ${authors}`);
    if (book.readStatus) lines.push(`**Status:** ${book.readStatus}`);
    if (book.personalRating != null) lines.push(`**Rating:** ${stars(book.personalRating)}`);
    if (m?.rating != null && book.personalRating == null) lines.push(`**Rating:** ${stars(m.rating)}`);

    const progress = getProgress(book);
    if (progress) lines.push(`**Progress:** ${progress}`);

    lines.push('');

    if (m?.description) {
      lines.push('## Description');
      lines.push('');
      lines.push(stripHtml(m.description));
      lines.push('');
    }

    const meta: string[] = [];
    const push = (l: string, v: string | number | undefined | null) => {
      const line = metaLine(l, v);
      if (line) meta.push(line);
    };

    push('ISBN', m?.isbn13 ?? m?.isbn10);
    push('Published', m?.publishedDate);
    push('Pages', m?.pageCount);
    push('Publisher', m?.publisher);
    push('Language', m?.language);
    push('Series', m?.seriesName ? `${m.seriesName}${m.seriesNumber != null ? ` #${m.seriesNumber}` : ''}` : undefined);
    push('Format', m?.provider);
    if (m?.categories?.length) push('Categories', m.categories.join(', '));
    if (m?.tags?.length) push('Tags', m.tags.join(', '));

    if (meta.length) {
      lines.push('## Metadata');
      lines.push('');
      lines.push(meta.join('\n'));
      lines.push('');
    }

    return lines.join('\n');
  }

  private libraryToMarkdown(lib: Library): string {
    const lines: string[] = [`# ${lib.name}`, ''];
    lines.push(`**ID:** ${lib.id}`);
    lines.push(`**Watch:** ${lib.watch ? 'Yes' : 'No'}`);
    if (lib.icon) lines.push(`**Icon:** ${lib.icon}`);
    if (lib.metadataSource) lines.push(`**Metadata Source:** ${lib.metadataSource}`);
    if (lib.organizationMode) lines.push(`**Organization:** ${lib.organizationMode}`);

    if (lib.paths.length) {
      lines.push('');
      lines.push('## Paths');
      lines.push('');
      for (const p of lib.paths) {
        lines.push(`- ${p.path}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private shelfToMarkdown(shelf: Shelf): string {
    const lines: string[] = [`# ${shelf.name}`, ''];
    lines.push(`**ID:** ${shelf.id}`);
    if (shelf.bookCount != null) lines.push(`**Book Count:** ${shelf.bookCount}`);
    if (shelf.publicShelf != null) lines.push(`**Public:** ${shelf.publicShelf ? 'Yes' : 'No'}`);
    return lines.join('\n');
  }

  private authorToMarkdown(author: Author): string {
    const lines: string[] = [`# ${author.name}`, ''];
    lines.push(`**ID:** ${author.id}`);
    if ('bookCount' in author) lines.push(`**Book Count:** ${author.bookCount}`);
    if ('description' in author && author.description) {
      lines.push('');
      lines.push('## Description');
      lines.push('');
      lines.push(stripHtml(author.description));
      lines.push('');
    }
    if ('asin' in author && author.asin) {
      lines.push(`**ASIN:** ${author.asin}`);
    }
    return lines.join('\n');
  }

  private noteToMarkdown(note: BookNote): string {
    const lines: string[] = [`# ${note.title}`, ''];
    lines.push(`**ID:** ${note.id}`);
    lines.push(`**Book ID:** ${note.bookId}`);
    lines.push(`**Created:** ${note.createdAt}`);
    lines.push(`**Updated:** ${note.updatedAt}`);
    lines.push('');
    lines.push(note.content);
    lines.push('');
    return lines.join('\n');
  }

  private reviewToMarkdown(review: BookReview): string {
    const lines: string[] = [];
    if (review.title) {
      lines.push(`# ${review.title}`, '');
    }
    if (review.reviewerName) lines.push(`**Reviewer:** ${review.reviewerName}`);
    if (review.rating != null) lines.push(`**Rating:** ${stars(review.rating)}`);
    if (review.date) lines.push(`**Date:** ${review.date}`);
    if (review.metadataProvider) lines.push(`**Source:** ${review.metadataProvider}`);
    if (review.country) lines.push(`**Country:** ${review.country}`);
    if (review.followersCount != null) lines.push(`**Followers:** ${review.followersCount}`);

    if (review.body) {
      lines.push('');
      lines.push(stripHtml(review.body));
      lines.push('');
    }

    return lines.join('\n');
  }

  private statsToMarkdown(data: {
    summary: BooksSummary;
    ratingDistribution: RatingDistribution[];
    statusDistribution: StatusDistribution[];
  }): string {
    const { summary, ratingDistribution, statusDistribution } = data;
    const lines: string[] = ['# Book Collection Statistics', ''];

    lines.push('## Summary');
    lines.push('');
    lines.push(`**Total Books:** ${summary.totalBooks}`);
    lines.push(`**Total Authors:** ${summary.totalAuthors}`);
    lines.push(`**Total Series:** ${summary.totalSeries}`);
    lines.push(`**Total Publishers:** ${summary.totalPublishers}`);
    if (summary.totalSizeKb) lines.push(`**Total Size:** ${(summary.totalSizeKb / 1024).toFixed(1)} MB`);

    if (ratingDistribution.length) {
      lines.push('');
      lines.push('## Rating Distribution');
      lines.push('');
      for (const r of ratingDistribution) {
        lines.push(`- ${stars(r.rating)} — ${r.count} books`);
      }
    }

    if (statusDistribution.length) {
      lines.push('');
      lines.push('## Status Distribution');
      lines.push('');
      for (const s of statusDistribution) {
        lines.push(`- **${s.status}** — ${s.count} books`);
      }
    }

    return lines.join('\n');
  }

  private recommendationToMarkdown(rec: BookRecommendationLite): string {
    const lines: string[] = [`# ${rec.title}`, ''];
    if (rec.authors?.length) lines.push(`**Author:** ${rec.authors.join(', ')}`);
    lines.push(`**Similarity Score:** ${(rec.similarityScore * 100).toFixed(0)}%`);
    lines.push(`**Book ID:** ${rec.bookId}`);
    return lines.join('\n');
  }

  private notebookEntryToMarkdown(book: Book): string {
    const m = book.metadata;
    const title = m?.title ?? book.fileName ?? `Book #${book.id}`;
    const authors = m?.authors?.join(', ') ?? 'Unknown';
    const lines: string[] = [`# ${title}`, ''];

    lines.push(`**Author:** ${authors}`);
    if (book.readStatus) lines.push(`**Status:** ${book.readStatus}`);
    if (book.personalRating != null) lines.push(`**Rating:** ${stars(book.personalRating)}`);
    lines.push(`**Book ID:** ${book.id}`);

    return lines.join('\n');
  }

  private seriesToMarkdown(entry: SeriesEntry): string {
    const lines: string[] = [];
    const name = String(entry.seriesName ?? entry.name ?? 'Unknown Series');
    lines.push(`# ${name}`, '');
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'seriesName' || key === 'name') continue;
      lines.push(`- **${key}:** ${value}`);
    }
    return lines.join('\n');
  }

  private sidecarContentToMarkdown(content: Record<string, unknown>): string {
    const lines: string[] = ['# Sidecar Content', ''];
    for (const [key, value] of Object.entries(content)) {
      const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      lines.push(`**${key}:** ${display}`);
    }
    return lines.join('\n');
  }

  private sidecarStatusToMarkdown(status: Record<string, unknown>): string {
    const lines: string[] = ['# Sidecar Sync Status', ''];
    for (const [key, value] of Object.entries(status)) {
      lines.push(`- **${key}:** ${value}`);
    }
    return lines.join('\n');
  }

  private filterOptionsToMarkdown(options: Record<string, unknown>): string {
    const lines: string[] = ['# Filter Options', ''];
    for (const [key, value] of Object.entries(options)) {
      if (Array.isArray(value)) {
        lines.push(`**${key}:** ${value.join(', ')}`);
      } else {
        lines.push(`- **${key}:** ${value}`);
      }
    }
    return lines.join('\n');
  }

}
