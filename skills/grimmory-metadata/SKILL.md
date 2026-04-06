---
description: ALWAYS use this skill when the user mentions ISBN, book metadata, catalog management, field locking, sidecar files, ComicInfo, bulk edits, or metadata enrichment. Triggers on: ISBN lookup, update book metadata, lock fields, export/import sidecars, batch operations, consolidate metadata, preview matches, delete metadata fields.
---

# Grimmory Metadata Management

Book metadata operations - from individual ISBN lookups to bulk management and sidecar files.

## Available Tools

- **grimmory_lookup_isbn** - Look up book metadata by ISBN (ISBN-10 or ISBN-13)
  - Searches external metadata providers
  - Returns comprehensive book metadata

- **grimmory_batch_isbn_lookup** - Look up multiple ISBNs at once
  - Array of ISBNs (max 100)
  - More efficient than individual lookups

- **grimmory_update_book_metadata** - Update metadata fields for a book
  - Common fields: title, subtitle, summary, publisher, publishedDate, isbn, language, pageCount, etc.
  - Respects field locks (locked fields won't update)

- **grimmory_bulk_edit_metadata** - Apply metadata changes to multiple books (DESTRUCTIVE)
  - Requires array of bookIds
  - Overwrites existing values
  - Use carefully for batch updates

- **grimmory_get_file_metadata** - Retrieve file-level metadata
  - Returns technical metadata from the actual file (format, size, creation date, etc.)

- **grimmory_get_comic_info** - Get ComicInfo XML for CBX books
  - Returns ComicInfo.xml content if present
  - Common in CBZ/CBR comic archives

- **grimmory_toggle_all_locks** - Lock/unlock all metadata fields globally
  - locked: true to lock all, false to unlock all
  - Affects all books

- **grimmory_toggle_field_locks** - Lock/unlock specific fields
  - Requires array of field names
  - Granular control over which fields can be edited

- **grimmory_get_metadata_lock_fields** - List fields that support locking

- **grimmory_recalculate_match_scores** - Recalculate metadata match scores
  - Updates confidence scores for provider matches

- **grimmory_consolidate_metadata** - Merge metadata from multiple providers (DESTRUCTIVE)
  - Optional bookIds array (omit for all books)
  - Merges and deduplicates metadata

- **grimmory_delete_metadata_values** - Delete specific field values (DESTRUCTIVE)
  - Permanently removes specified field values

- **grimmory_get_prospective_metadata** - Preview potential metadata matches

- **grimmory_get_provider_metadata** - Get metadata from a specific provider by ID
  - Requires provider name and providerItemId
  - Useful for inspecting raw provider data

- **grimmory_get_sidecar** - Get sidecar metadata file content

- **grimmory_get_sidecar_status** - Check sidecar file sync status

- **grimmory_export_sidecar** - Export sidecar for a specific book

- **grimmory_import_sidecar** - Import sidecar metadata for a book

- **grimmory_bulk_export_sidecar** - Export sidecars for all books in a library
  - Use for backups or migrations

- **grimmory_bulk_import_sidecar** - Import sidecars for all books in a library

## Common Use Cases

**ISBN Lookups:**
```
Look up ISBN 978-0-123456-78-9
Get metadata for these 5 ISBNs: [list]
```

**Metadata Updates:**
```
Update book 123's title to 'Corrected Title'
Change the publisher for book 456 to 'Penguin'
Update metadata for multiple books: set publisher to 'Vintage'
```

**Field Locking:**
```
Lock the title field so it doesn't get overwritten
Unlock all metadata fields
Which fields can I lock?
```

**Sidecar Management:**
```
Get the sidecar file for book 202
Export sidecars for all books in library 1
Import this sidecar content to book 303
```

**Bulk Operations:**
```
Consolidate metadata for all books
Delete the 'subtitle' field from books [1, 2, 3]
Preview metadata matches for book 505
```

## Common Metadata Fields

Lockable and updatable fields:

- `title` - Book title
- `subtitle` - Subtitle
- `summary` - Description/synopsis
- `publisher` - Publishing house
- `publishedDate` - Publication date
- `isbn` - ISBN-10 or ISBN-13
- `language` - Language code (e.g., "en", "de")
- `pageCount` - Number of pages
- `tags` - Array of tags
- `labels` - Array of labels
- `series` - Series name
- `seriesIndex` - Position in series

## Best Practices

- Include dashes in ISBNs when possible (more reliable)
- Lock fields you've manually corrected to prevent overwrites
- Export sidecars before major metadata operations
- Preview with `prospective_metadata` before destructive operations
- Test bulk operations on small batches first

## Response Formats

- **JSON** (default): Structured data
- **Markdown** (`response_format: "markdown"`): Formatted for display

## Important Notes

- ⚠️ **DESTRUCTIVE operations** cannot be undone
- Always preview before bulk operations
- Field locks protect data from accidental changes

## Related Skills

- **grimmory-library**: Find book IDs
- **grimmory-authors**: Author metadata
- **grimmory-insights**: Statistics after metadata updates
