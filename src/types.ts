// ============================================================================
// Grimmory MCP Server — Type Definitions
// Based on Grimmory (Booklore) API Java DTOs and frontend Angular models.
// Source: https://github.com/grimmory-tools/grimmory
// ============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Reading status of a book. Mirrors org.booklore.model.enums.ReadStatus */
export type ReadStatus =
  | "UNREAD"
  | "READING"
  | "RE_READING"
  | "READ"
  | "PARTIALLY_READ"
  | "PAUSED"
  | "WONT_READ"
  | "ABANDONED"
  | "UNSET";

/** File / book format types. */
export type BookType =
  | "PDF"
  | "EPUB"
  | "CBX"
  | "FB2"
  | "MOBI"
  | "AZW3"
  | "AUDIOBOOK";

/** How library metadata is sourced. */
export type MetadataSource =
  | "EMBEDDED"
  | "SIDECAR"
  | "PREFER_SIDECAR"
  | "PREFER_EMBEDDED"
  | "NONE";

/** How books are organised on disk. */
export type OrganizationMode =
  | "BOOK_PER_FILE"
  | "BOOK_PER_FOLDER"
  | "AUTO_DETECT";

/** Shelf icon type. */
export type IconType = "PRIME_NG" | "CUSTOM_SVG";

/** Additional file types attached to a book. */
export type AdditionalFileType = "ALTERNATIVE_FORMAT" | "SUPPLEMENTARY";

/** Metadata field lock flags. Mirrors org.booklore.model.enums.MetadataLockField */
export type MetadataLockField =
  | "TITLE"
  | "SORT_TITLE"
  | "AUTHORS"
  | "DESCRIPTION"
  | "PUBLISHER"
  | "PUBLISHED_DATE"
  | "ISBN_10"
  | "ISBN_13"
  | "LANGUAGE"
  | "PAGE_COUNT"
  | "CATEGORIES"
  | "TAGS"
  | "MOODS"
  | "SERIES"
  | "SERIES_INDEX"
  | "COVER";
// ---------------------------------------------------------------------------
// Pagination — Spring Data Pageable response wrapper
// ---------------------------------------------------------------------------

/** Generic paginated response matching Grimmory's AppPageResponse. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** JWT tokens returned by POST /api/v1/auth/login. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  isDefaultPassword: string;
}

// ---------------------------------------------------------------------------
// Book File
// ---------------------------------------------------------------------------

export interface BookFile {
  id: number;
  bookId: number;
  fileName?: string;
  filePath?: string;
  fileSubPath?: string;
  fileSizeKb?: number;
  bookType?: BookType;
  folderBased?: boolean;
  extension?: string;
  addedOn?: string;
}

export interface AdditionalFile extends BookFile {
  additionalFileType?: AdditionalFileType;
  description?: string;
}

// ---------------------------------------------------------------------------
// Book Metadata
// ---------------------------------------------------------------------------

export interface BookReview {
  id?: number;
  metadataProvider?: string;
  reviewerName?: string;
  title?: string;
  rating?: number;
  date?: string;
  body?: string;
  country?: string;
  spoiler?: boolean;
  followersCount?: number;
  textReviewsCount?: number;
}

export interface AudiobookMetadata {
  narrator?: string;
  abridged?: boolean | null;
  durationSeconds?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  chapterCount?: number;
  chapters?: AudiobookChapterInfo[];
}

export interface AudiobookChapterInfo {
  index?: number;
  title?: string;
  startTimeMs?: number;
  endTimeMs?: number;
  durationMs?: number;
}

export interface ComicMetadata {
  issueNumber?: string;
  volumeName?: string;
  volumeNumber?: number;
  storyArc?: string;
  storyArcNumber?: number;
  alternateSeries?: string;
  alternateIssue?: string;
  pencillers?: string[];
  inkers?: string[];
  colorists?: string[];
  letterers?: string[];
  coverArtists?: string[];
  editors?: string[];
  imprint?: string;
  format?: string;
  blackAndWhite?: boolean;
  manga?: boolean;
  readingDirection?: string;
  characters?: string[];
  teams?: string[];
  locations?: string[];
  webLink?: string;
  notes?: string;
}

export interface BookMetadata {
  bookId: number;
  title?: string;
  subtitle?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  seriesName?: string;
  seriesNumber?: number | null;
  seriesTotal?: number | null;
  isbn13?: string;
  isbn10?: string;
  asin?: string;
  goodreadsId?: string;
  comicvineId?: string;
  hardcoverId?: string;
  hardcoverBookId?: number | null;
  googleId?: string;
  pageCount?: number | null;
  language?: string;
  rating?: number | null;
  reviewCount?: number | null;
  amazonRating?: number | null;
  amazonReviewCount?: number | null;
  goodreadsRating?: number | null;
  goodreadsReviewCount?: number | null;
  hardcoverRating?: number | null;
  hardcoverReviewCount?: number | null;
  lubimyczytacId?: string;
  lubimyczytacRating?: number | null;
  ranobedbId?: string;
  ranobedbRating?: number | null;
  audibleId?: string;
  audibleRating?: number | null;
  audibleReviewCount?: number | null;
  narrator?: string;
  abridged?: boolean | null;
  audiobookMetadata?: AudiobookMetadata;
  comicMetadata?: ComicMetadata;
  coverUpdatedOn?: string;
  audiobookCoverUpdatedOn?: string;
  authors?: string[];
  categories?: string[];
  moods?: string[];
  tags?: string[];
  provider?: string;
  providerBookId?: string;
  externalUrl?: string;
  thumbnailUrl?: string | null;
  reviews?: BookReview[];
  ageRating?: number | null;
  contentRating?: string | null;
}

// ---------------------------------------------------------------------------
// Progress Models
// ---------------------------------------------------------------------------

export interface EpubProgress {
  cfi: string;
  href?: string;
  percentage: number;
  ttsPositionCfi?: string;
}

export interface PdfProgress {
  page: number;
  percentage: number;
}

export interface CbxProgress {
  page: number;
  percentage: number;
}

export interface AudiobookProgress {
  positionMs: number;
  trackIndex?: number;
  trackPositionMs?: number;
  percentage: number;
}

export interface KoboProgress {
  percentage: number;
}

export interface KoreaderProgress {
  timestamp: number;
  document: string;
  percentage: number;
  progress: string;
  device: string;
  deviceId: string;
}

// ---------------------------------------------------------------------------
// Book
// ---------------------------------------------------------------------------

export interface Book {
  id: number;
  libraryId: number;
  libraryName: string;
  primaryFile?: BookFile;
  fileName?: string;
  filePath?: string;
  fileSubPath?: string;
  fileSizeKb?: number;
  metadata?: BookMetadata;
  shelves?: Shelf[];
  lastReadTime?: string;
  addedOn?: string;
  epubProgress?: EpubProgress;
  pdfProgress?: PdfProgress;
  cbxProgress?: CbxProgress;
  audiobookProgress?: AudiobookProgress;
  koreaderProgress?: KoreaderProgress;
  koboProgress?: KoboProgress;
  seriesCount?: number | null;
  metadataMatchScore?: number | null;
  personalRating?: number | null;
  readStatus?: ReadStatus;
  dateFinished?: string;
  libraryPath?: LibraryPath;
  alternativeFormats?: AdditionalFile[];
  supplementaryFiles?: AdditionalFile[];
  isPhysical?: boolean;
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export interface LibraryPath {
  id?: number;
  libraryId?: number;
  path: string;
}

export interface Library {
  id: number;
  name: string;
  icon?: string | null;
  iconType?: IconType | null;
  watch: boolean;
  fileNamingPattern?: string;
  paths: LibraryPath[];
  formatPriority?: BookType[];
  allowedFormats?: BookType[];
  metadataSource?: MetadataSource;
  organizationMode?: OrganizationMode;
}

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------

export interface Shelf {
  id: number;
  name: string;
  icon?: string | null;
  iconType?: IconType | null;
  publicShelf?: boolean;
  userId?: number;
  bookCount?: number;
}

// ---------------------------------------------------------------------------
// Author
// ---------------------------------------------------------------------------

export interface AuthorSummary {
  id: number;
  name: string;
  asin?: string;
  bookCount: number;
  hasPhoto: boolean;
}

export interface AuthorDetails {
  id: number;
  name: string;
  description?: string;
  asin?: string;
  nameLocked?: boolean;
  descriptionLocked?: boolean;
  asinLocked?: boolean;
  photoLocked?: boolean;
}

/** Union type for author responses (summary in lists, details on get). */
export type Author = AuthorSummary | AuthorDetails;

/** Generic record for author provider search results. */
export interface AuthorSearchResult {
  [key: string]: unknown;
}
// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------

export interface BookNote {
  id: number;
  userId: number;
  bookId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookNoteRequest {
  id?: number;
  bookId: number;
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface UserPermissions {
  isAdmin: boolean;
  canUpload: boolean;
  canDownload: boolean;
  canEditMetadata: boolean;
  canManageLibrary: boolean;
  canSyncKoReader: boolean;
  canSyncKobo: boolean;
  canEmailBook: boolean;
  canDeleteBook: boolean;
  canAccessOpds: boolean;
  canCreateBooks: boolean;
  canManageShelves: boolean;
  canManageBookdrops: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canUseBookDrop: boolean;
  canUseDeviceSync: boolean;
  canManageAuthors: boolean;
  canViewAllLibraries: boolean;
  canRead: boolean;
  canManageSeries: boolean;
  canManageBookLists: boolean;
  canManageReadingLists: boolean;
  canManageNotes: boolean;
  canExportBooks: boolean;
  canImportBooks: boolean;
  canManageAnnotations: boolean;
  canManageBookmarks: boolean;
  canManageProgress: boolean;
}

export interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  isDefaultPassword: boolean;
  assignedLibraries?: Library[];
  permissions?: UserPermissions;
}

// ---------------------------------------------------------------------------
// Stats DTOs (used by stats tools)
// ---------------------------------------------------------------------------

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface StatusDistribution {
  status: ReadStatus;
  count: number;
}

export interface BookRecommendationLite {
  bookId: number;
  title: string;
  authors: string[];
  thumbnailUrl?: string | null;
  similarityScore: number;
}

export interface BooksSummary {
  totalBooks: number;
  totalSizeKb: number;
  totalAuthors: number;
  totalSeries: number;
  totalPublishers: number;
}

// ---------------------------------------------------------------------------
// Request / Response helpers
// ---------------------------------------------------------------------------

export interface BookStatusUpdateResponse {
  bookId: number;
  readStatus: ReadStatus;
  readStatusModifiedTime: string;
  dateFinished?: string;
}

export interface PersonalRatingUpdateResponse {
  bookId: number;
  personalRating?: number;
}

export interface ProgressUpdateResponse {
  bookId: number;
  epubProgress?: EpubProgress;
  pdfProgress?: PdfProgress;
  cbxProgress?: CbxProgress;
  audiobookProgress?: AudiobookProgress;
}

export interface SortOption {
  field?: string;
  direction?: string;
}

// ---------------------------------------------------------------------------
// Loose / Generic record types
// ---------------------------------------------------------------------------

/** Generic record for series list items (API returns Page<Map<String, Object>>). */
export interface SeriesEntry {
  [key: string]: unknown;
}
