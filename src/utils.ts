import { CHARACTER_LIMIT } from './constants.js';

/**
 * Strip HTML tags from a string, returning plain text.
 * Replaces <br> and block-level tags with newlines.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Log an error message to stderr.
 */
export function logError(message: string): void {
  process.stderr.write(`[grimmory-mcp:error] ${message}\n`);
}

/**
 * Log an info message to stderr.
 */
export function logInfo(message: string): void {
  process.stderr.write(`[grimmory-mcp] ${message}\n`);
}

/**
 * Truncate text to the given limit, appending "..." if truncated.
 */
export function truncateText(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) {
    return text;
  }
  return text.slice(0, limit - 3) + '...';
}

/**
 * Format an unknown error into a standard MCP error response object.
 */
export function formatError(error: unknown): { message: string; isError: true } {
  if (error instanceof Error) {
    return { message: error.message, isError: true };
  }
  if (typeof error === 'string') {
    return { message: error, isError: true };
  }
  return { message: String(error), isError: true };
}
