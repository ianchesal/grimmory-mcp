---
name: grimmory-library
description: Use for interacting with Grimmory book libraries. Trigger on: library management, shelf browsing, book discovery, searching collections, listing books, pagination, filtering.
---

# Grimmory Library Management

## Available Tools

### Library Management
- **grimmory_list_libraries** - List all libraries
  - Pagination, sorting support
  - Returns library UUIDs, names, metadata
- **grimmory_get_library** - Get library details
  - Requires libraryId (UUID or numeric ID)
  - Returns library configuration and stats

### Shelf Management
- **grimmory_list_shelves** - List shelves with optional library filter
  - Filter by libraryId
  - Pagination and sorting support
  - Returns shelf UUIDs, names, associated library
- **grimmory_get_shelf** - Get shelf details
  - Requires shelfId
  - Returns shelf configuration and book count
- **grimmory_get_shelf_books** - Get books in a shelf
  - Requires shelfId
  - Pagination and sorting support

### Book Discovery
- **grimmory_list_books** - List books with filtering
  - Filter by libraryId, search by keyword
  - Pagination (max 100 items per page)
  - Sorting by various fields
  - Returns book list with metadata
- **grimmory_get_book** - Get book details
  - Requires bookId (UUID or numeric ID)
  - Returns: title, subtitle, summary, authors, reading status, progress, ratings, reviews, file info, tags, labels, custom metadata

## Common Use Cases

### Exploring Your Collection
```
"Show me all my libraries"
"List the shelves in my main library"
"What books are in my 'Favorites' shelf?"
```

### Finding Books
```
"Search for books by Isaac Asimov"
"List all books in the Science Fiction library"
"Show me books I've added recently"
```

### Book Details
```
"Get details for book 123"
"Tell me about 'Dune'"
"What metadata does my copy of 1984 have?"
```

## Response Formats

All tools support dual formats:
- **JSON** (default): Structured data
- **Markdown** (response_format: "markdown"): Human-readable output

Use markdown for conversational responses.

## Pagination Best Practices

- Default page size: 20, max: 100
- Page numbers start at 0
- Check if more results exist (compare count to size)
- Common sort fields: createdAt, updatedAt, title, addedAt

## Working with IDs

- Book, library, and shelf IDs can be UUIDs or numeric IDs
- Obtain IDs from list operations
- When users mention books by name, search first then use the ID
