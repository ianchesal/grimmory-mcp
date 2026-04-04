# Grimmory MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [Grimmory](https://github.com/grimmory-tools/grimmory) book management application. This server enables AI assistants like Claude to interact with your Grimmory library through 53 specialized tools.

[![GitHub](https://img.shields.io/badge/GitHub-bannert1337%2Fgrimmory--mcp-blue)](https://github.com/bannert1337/grimmory-mcp)

## Features

- **53 MCP Tools** for comprehensive book library management
- **JWT Authentication** with automatic token refresh
- **Dual Response Formats** - JSON for data, Markdown for readability
- **Stdio Transport** - Full MCP compatibility with Claude Desktop and other clients
- **SSE Support** - Streaming endpoints for long-running operations
- **Type-Safe** - Built with TypeScript for reliability

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime (recommended) or Node.js 18+
- A running Grimmory instance (v2.3.0+)
- GitHub CLI (`gh`) - optional, for repository operations

### Setup

```bash
# Clone the repository
git clone https://github.com/bannert1337/grimmory-mcp.git
cd grimmory-mcp

# Install dependencies
bun install

# Build the project
bun run build
```

## Configuration

Set the following environment variables:

```bash
export GRIMMORY_URL="https://your-grimmory-instance.com"
export GRIMMORY_EMAIL="your-email@example.com"
export GRIMMORY_PASSWORD="your-password"
```

You can also create a `.env` file in the project root:

```env
GRIMMORY_URL=https://your-grimmory-instance.com
GRIMMORY_EMAIL=your-email@example.com
GRIMMORY_PASSWORD=your-password
```

## Usage

### With Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "grimmory": {
      "command": "bun",
      "args": ["run", "start"],
      "env": {
        "GRIMMORY_URL": "https://your-grimmory-instance.com",
        "GRIMMORY_EMAIL": "your-email@example.com",
        "GRIMMORY_PASSWORD": "your-password"
      }
    }
  }
}
```

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

### With Other MCP Clients

The server uses stdio transport, making it compatible with any MCP client:

```bash
bun run start
```

## Available Tools (53 Total)

### Book Management (2 tools)

| Tool | Description |
|------|-------------|
| `grimmory_list_books` | List books with pagination, library filtering, and search |
| `grimmory_get_book` | Get detailed information about a specific book |

### Library Management (2 tools)

| Tool | Description |
|------|-------------|
| `grimmory_list_libraries` | List all libraries in the Grimmory instance |
| `grimmory_get_library` | Get details for a specific library by UUID |

### Shelf Management (3 tools)

| Tool | Description |
|------|-------------|
| `grimmory_list_shelves` | List all shelves with optional library filter |
| `grimmory_get_shelf` | Get details for a specific shelf |
| `grimmory_get_shelf_books` | Get books in a specific shelf with pagination |

### Author Management (13 tools)

| Tool | Description |
|------|-------------|
| `grimmory_list_authors` | List authors with pagination and search |
| `grimmory_get_author` | Get detailed information about an author |
| `grimmory_find_author_by_name` | Search for an author by name |
| `grimmory_get_book_authors` | Get all authors associated with a book |
| `grimmory_update_author` | Update author name and description |
| `grimmory_search_author_metadata` | Search external sources for author metadata |
| `grimmory_match_author` | Link author to a specific metadata provider |
| `grimmory_quick_match_author` | Automatically find best metadata match |
| `grimmory_auto_match_authors` | Trigger auto-matching for all unmatched authors |
| `grimmory_unmatch_authors` | Remove metadata provider associations |
| `grimmory_search_author_photos` | Search for author photos from providers |
| `grimmory_set_author_photo_url` | Set author photo via URL |
| `grimmory_delete_authors` | Delete one or more authors |

### Reading Progress (3 tools)

| Tool | Description |
|------|-------------|
| `grimmory_update_read_status` | Update read status (UNREAD, READING, READ, ABANDONED, etc.) |
| `grimmory_update_rating` | Update personal rating (1-5 stars) |
| `grimmory_update_progress` | Update reading progress (0-100%) |

### Notes (3 tools)

| Tool | Description |
|------|-------------|
| `grimmory_list_notes` | List notes for a book with pagination |
| `grimmory_create_note` | Create a new note for a book |
| `grimmory_delete_note` | Delete a note from a book |

### Reviews (4 tools)

| Tool | Description |
|------|-------------|
| `grimmory_list_reviews` | List reviews for a specific book |
| `grimmory_refresh_reviews` | Refresh reviews from external sources |
| `grimmory_delete_review` | Delete a specific review by ID |
| `grimmory_delete_all_book_reviews` | Delete all reviews for a book |

### Metadata Management (13 tools)

| Tool | Description |
|------|-------------|
| `grimmory_lookup_isbn` | Look up book metadata by ISBN-10 or ISBN-13 |
| `grimmory_batch_isbn_lookup` | Look up multiple ISBNs at once |
| `grimmory_update_book_metadata` | Update metadata fields for a book |
| `grimmory_get_file_metadata` | Retrieve file-level metadata |
| `grimmory_get_comic_info` | Get ComicInfo XML for CBX books |
| `grimmory_bulk_edit_metadata` | Apply metadata changes to multiple books |
| `grimmory_toggle_all_locks` | Lock/unlock all metadata fields globally |
| `grimmory_toggle_field_locks` | Lock/unlock specific metadata fields |
| `grimmory_get_metadata_lock_fields` | List fields that support locking |
| `grimmory_recalculate_match_scores` | Recalculate metadata match scores |
| `grimmory_consolidate_metadata` | Merge metadata from multiple providers |
| `grimmory_delete_metadata_values` | Delete specific metadata field values |
| `grimmory_get_prospective_metadata` | Preview potential metadata matches |

### Sidecar Files (6 tools)

| Tool | Description |
|------|-------------|
| `grimmory_get_sidecar` | Get sidecar metadata file content |
| `grimmory_get_sidecar_status` | Check sidecar file sync status |
| `grimmory_export_sidecar` | Export sidecar for a specific book |
| `grimmory_import_sidecar` | Import sidecar metadata for a book |
| `grimmory_bulk_export_sidecar` | Export sidecars for all books in a library |
| `grimmory_bulk_import_sidecar` | Import sidecars for all books in a library |

### Statistics & Insights (3 tools)

| Tool | Description |
|------|-------------|
| `grimmory_get_stats` | Get dashboard statistics (book counts, ratings, status distribution) |
| `grimmory_get_recommendations` | Get personalized book recommendations |
| `grimmory_get_notebook` | Get notebook entries (books with notes/highlights) |

## Example Usage with Claude

Once configured, you can ask Claude to interact with your Grimmory library:

```
"Show me all books I'm currently reading"
"List my favorite authors"
"Update the rating for 'Dune' to 5 stars"
"Search for books by Isaac Asimov"
"Get statistics about my book collection"
"Create a note for book 123 about the main character"
"List books in my 'Favorites' shelf"
```

## Development

```bash
# Development mode with watch
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint
```

### Project Structure

```
src/
├── index.ts                    # Entry point
├── constants.ts                # API endpoints and constants
├── types.ts                    # TypeScript type definitions
├── schemas/
│   └── index.ts               # Zod validation schemas
├── services/
│   ├── grimmory-client.ts     # API client with auth
│   └── response-formatter.ts  # Output formatting
└── tools/
    ├── books.ts               # Book management tools
    ├── libraries.ts           # Library management tools
    ├── shelves.ts             # Shelf management tools
    ├── authors.ts             # Author management tools
    ├── reading.ts             # Reading progress tools
    ├── notes.ts               # Notes management tools
    ├── reviews.ts             # Reviews management tools
    ├── metadata.ts            # Metadata management tools
    ├── sidecar.ts             # Sidecar file tools
    └── stats.ts               # Statistics and insights tools

tests/                         # Test suite
```

## API Compatibility

This MCP server is compatible with **Grimmory v2.3.0+** and uses the following API endpoints:

- `/api/v1/auth/*` - Authentication
- `/api/v1/books/*` - Book management
- `/api/v1/libraries/*` - Library management
- `/api/v1/shelves/*` - Shelf management
- `/api/v1/authors/*` - Author management
- `/api/v1/book-notes/*` - Notes management
- `/api/v1/reviews/*` - Reviews management
- `/api/v1/user-stats/*` - Statistics
- `/api/v1/notebook/*` - Notebook entries
- `/api/v1/recommendations/*` - Recommendations

## Troubleshooting

### Authentication Issues

If you see "Authentication failed" errors:
1. Verify your `GRIMMORY_URL`, `GRIMMORY_EMAIL`, and `GRIMMORY_PASSWORD` are correct
2. Ensure your Grimmory instance is accessible
3. Check that the user account has appropriate permissions

### Connection Issues

If the server fails to connect:
1. Verify the Grimmory URL includes the protocol (`https://`)
2. Check network connectivity to your Grimmory instance
3. Ensure no firewall rules are blocking the connection

### Empty Responses

Some endpoints return 204 No Content when no data exists (e.g., books without reviews). This is normal behavior.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `bun test`
5. Commit with semantic messages: `feat:`, `fix:`, `refactor:`, etc.
6. Push and create a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for [Grimmory](https://github.com/grimmory-tools/grimmory) - A modern book management application
- Uses the [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
