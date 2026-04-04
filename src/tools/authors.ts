// ============================================================================
// Grimmory MCP Server — Author Tools
// ============================================================================

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GrimmoryClient } from '../services/grimmory-client.js';
import { ResponseFormatter } from '../services/response-formatter.js';
import {
  ListAuthorsInputSchema,
  GetAuthorInputSchema,
  FindAuthorByNameInputSchema,
  GetBookAuthorsInputSchema,
  UpdateAuthorInputSchema,
  SearchAuthorMetadataInputSchema,
  MatchAuthorInputSchema,
  QuickMatchAuthorInputSchema,
  UnmatchAuthorsInputSchema,
  SearchAuthorPhotosInputSchema,
  SetAuthorPhotoUrlInputSchema,
  DeleteAuthorsInputSchema,
  AutoMatchAuthorsInputSchema,
} from '../schemas/index.js';
import type { Author, Page, AuthorSearchResult } from '../types.js';

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

const AUTHOR_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const DESTRUCTIVE_AUTHOR_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const MUTATING_AUTHOR_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const EXTERNAL_API_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const MUTATING_EXTERNAL_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all author-related tools on the MCP server.
 *
 * @param server   — The MCP server instance.
 * @param client   — Authenticated Grimmory API client.
 * @param formatter — Response formatter for JSON / Markdown output.
 */
export function registerAuthorTools(
  server: McpServer,
  client: GrimmoryClient,
  formatter: ResponseFormatter,
): void {
  // -- grimmory_list_authors ------------------------------------------------

  server.registerTool(
    'grimmory_list_authors',
    {
      description: 'List authors with pagination and optional search filter',
      inputSchema: ListAuthorsInputSchema,
      annotations: AUTHOR_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, search, page, size, sort, dir } = args;

      const params: Record<string, unknown> = { page, size };
      if (sort) params.sort = sort;
      if (dir) params.dir = dir;
      if (search) params.search = search;

      const result = await client.get<Page<Author>>('authors', params);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthorList(result.data, response_format);
    },
  );

  // -- grimmory_get_author --------------------------------------------------

  server.registerTool(
    'grimmory_get_author',
    {
      description: 'Get detailed information about a specific author',
      inputSchema: GetAuthorInputSchema,
      annotations: AUTHOR_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format } = args;

      const result = await client.get<Author>(`authors/${authorId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthor(result.data, response_format);
    },
  );

  // -- grimmory_find_author_by_name -----------------------------------------

  server.registerTool(
    'grimmory_find_author_by_name',
    {
      description: 'Find an author by their name (searches local database)',
      inputSchema: FindAuthorByNameInputSchema,
      annotations: AUTHOR_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { name, response_format } = args;

      const result = await client.get<Author>('authors/by-name', { name });

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthor(result.data, response_format);
    },
  );

  // -- grimmory_get_book_authors --------------------------------------------

  server.registerTool(
    'grimmory_get_book_authors',
    {
      description: 'Get all authors associated with a specific book',
      inputSchema: GetBookAuthorsInputSchema,
      annotations: AUTHOR_TOOL_ANNOTATIONS,
    },
    async (args) => {
      const { bookId, response_format } = args;

      const result = await client.get<Page<Author>>(`authors/book/${bookId}`);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthorList(result.data, response_format);
    },
  );

  // -- grimmory_update_author -----------------------------------------------

  server.registerTool(
    'grimmory_update_author',
    {
      description: 'Update details for a specific author (name, description)',
      inputSchema: UpdateAuthorInputSchema,
      annotations: MUTATING_AUTHOR_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format, name, description } = args;

      const body: Record<string, unknown> = {};
      if (name != null) body.name = name;
      if (description != null) body.description = description;

      const result = await client.put<Author>(`authors/${authorId}`, body);

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.formatAuthor(result.data, response_format);
    },
  );

  // -- grimmory_search_author_metadata --------------------------------------

  server.registerTool(
    'grimmory_search_author_metadata',
    {
      description: 'Search external metadata sources for author information',
      inputSchema: SearchAuthorMetadataInputSchema,
      annotations: EXTERNAL_API_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format, query } = args;

      const params: Record<string, unknown> = {};
      if (query != null) params.query = query;

      const result = await client.get<AuthorSearchResult[]>(
        `authors/${authorId}/search-metadata`,
        params,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: `Author Metadata Search — ${authorId}`,
      });
    },
  );

  // -- grimmory_match_author ------------------------------------------------

  server.registerTool(
    'grimmory_match_author',
    {
      description: 'Manually link an author to a specific metadata provider entry',
      inputSchema: MatchAuthorInputSchema,
      annotations: MUTATING_AUTHOR_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format, provider, providerItemId } = args;

      const result = await client.post<unknown>(
        `authors/${authorId}/match`,
        { provider, providerItemId },
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Author Matched',
      });
    },
  );

  // -- grimmory_quick_match_author ------------------------------------------

  server.registerTool(
    'grimmory_quick_match_author',
    {
      description: 'Automatically find and apply the best metadata match for an author',
      inputSchema: QuickMatchAuthorInputSchema,
      annotations: MUTATING_EXTERNAL_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format } = args;

      const result = await client.post<unknown>(
        `authors/${authorId}/quick-match`,
        {},
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Author Quick Match',
      });
    },
  );

  // -- grimmory_unmatch_authors ---------------------------------------------

  server.registerTool(
    'grimmory_unmatch_authors',
    {
      description: 'Remove metadata provider associations from authors (destructive)',
      inputSchema: UnmatchAuthorsInputSchema,
      annotations: DESTRUCTIVE_AUTHOR_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, authorIds } = args;

      const result = await client.post<unknown>(
        'authors/unmatch',
        { authorIds },
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Authors Unmatched',
      });
    },
  );

  // -- grimmory_search_author_photos ----------------------------------------

  server.registerTool(
    'grimmory_search_author_photos',
    {
      description: 'Search for author photos from external metadata providers',
      inputSchema: SearchAuthorPhotosInputSchema,
      annotations: EXTERNAL_API_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format, query } = args;

      const params: Record<string, unknown> = {};
      if (query != null) params.query = query;

      const result = await client.get<AuthorSearchResult[]>(
        `authors/${authorId}/search-photos`,
        params,
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: `Author Photo Search — ${authorId}`,
      });
    },
  );

  // -- grimmory_set_author_photo_url ----------------------------------------

  server.registerTool(
    'grimmory_set_author_photo_url',
    {
      description: 'Set the photo for an author via a URL',
      inputSchema: SetAuthorPhotoUrlInputSchema,
      annotations: MUTATING_AUTHOR_ANNOTATIONS,
    },
    async (args) => {
      const { authorId, response_format, url } = args;

      const result = await client.post<unknown>(
        `authors/${authorId}/photo/url`,
        { url },
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Author Photo Set',
      });
    },
  );

  // -- grimmory_delete_authors ----------------------------------------------

  server.registerTool(
    'grimmory_delete_authors',
    {
      description: 'Delete one or more authors (destructive)',
      inputSchema: DeleteAuthorsInputSchema,
      annotations: DESTRUCTIVE_AUTHOR_ANNOTATIONS,
    },
    async (args) => {
      const { response_format, authorIds } = args;

      const result = await client.delete<unknown>(
        'authors',
        { authorIds },
      );

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Authors Deleted',
      });
    },
  );

  // -- grimmory_auto_match_authors ------------------------------------------

  server.registerTool(
    'grimmory_auto_match_authors',
    {
      description: 'Trigger automatic matching for all unmatched authors (may block until complete)',
      inputSchema: AutoMatchAuthorsInputSchema,
      annotations: MUTATING_EXTERNAL_ANNOTATIONS,
    },
    async (args) => {
      const { response_format } = args;

      const result = await client.ssePost('authors/auto-match', {});

      if (!result.success) {
        return formatter.formatError(result.error);
      }

      return formatter.format(result.data, response_format, {
        title: 'Auto-Match Authors',
      });
    },
  );
}
