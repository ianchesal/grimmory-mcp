# Grimmory MCP Server

MCP server for Grimmory book management application.

## Features

- 19 MCP tools for book management
- JWT authentication with auto-refresh
- Dual JSON/Markdown response formats
- Stdio transport for MCP compatibility

## Installation

```bash
bun install
bun run build
```

## Configuration

Set environment variables:

```bash
export GRIMMORY_URL="https://your-grimmory-instance.com"
export GRIMMORY_EMAIL="your-email@example.com"
export GRIMMORY_PASSWORD="your-password"
```

## Usage

### With Claude Desktop

Add to `claude_desktop_config.json`:

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

### Direct Execution

```bash
bun run start
```

## Available Tools

### Book Tools

- `grimmory_list_books` - List books with pagination and optional filters
- `grimmory_get_book` - Get detailed information about a specific book

### Library Tools

- `grimmory_list_libraries` - List all libraries in the Grimmory instance with optional pagination
- `grimmory_get_library` - Get details for a specific library by its UUID

### Shelf Tools

- `grimmory_list_shelves` - List all shelves with optional library filter and pagination
- `grimmory_get_shelf_books` - Get books in a specific shelf with pagination

### Author Tools

- `grimmory_list_authors` - List authors with pagination and optional search filter
- `grimmory_get_author` - Get detailed information about a specific author

### Reading Tools

- `grimmory_update_read_status` - Update the read status of a book (e.g., READING, READ, ABANDONED)
- `grimmory_update_rating` - Update the personal rating of a book (1-5)
- `grimmory_update_progress` - Update the reading progress of a book (0-100)

### Notes Tools

- `grimmory_list_notes` - List notes for a book with pagination
- `grimmory_create_note` - Create a new note for a book
- `grimmory_delete_note` - Delete a note from a book

### Reviews Tools

- `grimmory_list_reviews` - List reviews for a specific book with pagination

### Metadata Tools

- `grimmory_lookup_isbn` - Look up book metadata by ISBN (ISBN-10 or ISBN-13)

### Stats Tools

- `grimmory_get_stats` - Get dashboard statistics including book counts, rating distribution, and reading status breakdown
- `grimmory_get_recommendations` - Get personalized book recommendations based on your reading history
- `grimmory_get_notebook` - Get notebook entries (books with notes, highlights, and annotations)

## Development

```bash
bun run dev        # Watch mode
bun test           # Run tests
bun run build      # Build for production
bun run typecheck  # Run TypeScript type checking
```

## License

MIT
