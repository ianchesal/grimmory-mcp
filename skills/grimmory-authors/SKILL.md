---
name: grimmory-authors
description: Use for managing authors in Grimmory - search authors, update information, match with metadata providers, manage photos, and organize author metadata. Trigger when the user mentions authors, wants to find author information, update author details, search for author photos, or match authors with external metadata sources like Goodreads or OpenLibrary.
---

# Grimmory Author Management

Manage authors in Grimmory: search, update, match with metadata providers, and manage photos.

## Available Tools

### Author Discovery

- **grimmory_list_authors** - List authors with pagination and search

- **grimmory_get_author** - Get detailed information about an author

- **grimmory_find_author_by_name** - Search for an author by name (case-insensitive partial matching)

- **grimmory_get_book_authors** - Get all authors associated with a book
### Author Updates

- **grimmory_update_author** - Update author name and description

- **grimmory_delete_authors** - Delete one or more authors (DESTRUCTIVE). Only use if author has no associated books.

### Metadata Matching

- **grimmory_search_author_metadata** - Search external sources (Google Books, Open Library) for author info

- **grimmory_match_author** - Manually link author to metadata provider (google-books, open-library, etc.)

- **grimmory_quick_match_author** - Automatically find and apply best metadata match

- **grimmory_auto_match_authors** - Bulk auto-match all unmatched authors

- **grimmory_unmatch_authors** - Remove metadata provider associations (use when match is incorrect)

### Author Photos

- **grimmory_search_author_photos** - Search for author photos from metadata providers

- **grimmory_set_author_photo_url** - Set author photo via URL

## Common Use Cases

### Finding Authors
```
"List all authors in my library"
"Find authors matching 'Asimov'"
"Who are the authors of book 123?"
"Show me details for author 456"
```

### Managing Author Info
```
"Update author 789's description with a biography"
"Correct the name for author 101 - it should be 'J.R.R. Tolkien'"
"Delete author 202 - it's a duplicate"
```

### Metadata Matching
```
"Search for metadata for author 303"
"Match author 404 to Google Books entry GB-ABC123"
"Auto-match all unmatched authors"
"This author is matched to the wrong person - unmatch them"
"Quick match author 505"
```

### Photo Management
```
"Search for photos of author 606"
"Set the photo for author 707 to this URL"
"Find a better photo for Isaac Asimov"
```

## Metadata Providers

- **google-books** - Google Books API
- **open-library** - Open Library (Internet Archive)
- **goodreads** - Goodreads (if configured)
- **comicvine** - Comic Vine (for comics)

## Best Practices

### Author Matching
1. Search metadata first to see available options
2. Use quick_match for clear cases
3. Use manual match when you know the exact provider ID
4. Unmatch if the automatic match is wrong
5. Run auto-match periodically for new authors

### Name Consistency
- Use consistent naming (e.g., "J.R.R. Tolkien" vs "Tolkien, J.R.R.")
- Include full names when known
- Update descriptions with brief biographies

### Photo Guidelines
- Prefer provider photos for consistency
- Ensure URLs are permanent (avoid temporary hosting)
- Use photos that clearly show the author's face
- Respect copyright when using custom URLs

## Response Formats

- **JSON** (default): Structured data
- **Markdown** (response_format: "markdown"): Formatted for display

## Related Skills

- Use **grimmory-library** to find book and author IDs
- Use **grimmory-metadata** for book-level metadata operations
