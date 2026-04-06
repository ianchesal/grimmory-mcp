---
description: ALWAYS use this skill when the user mentions reading statistics, book recommendations, reviews, or their reading notebook. Triggers on: library stats, reading analytics, book suggestions, what to read next, review management, external reviews, notebook entries, books with notes, reading history, rating distributions, reading habits.
---

# Grimmory Insights & Recommendations

Access reading analytics, personalized recommendations, reviews, and your reading notebook with all notes and highlights.

## Available Tools

### Statistics & Dashboard

- **grimmory_get_stats** - Get library statistics
  - Returns: book counts, read status breakdown, rating distribution (1-5 stars), library/shelf counts

### Recommendations

- **grimmory_get_recommendations** - Get personalized book recommendations based on reading history and ratings
  - Supports pagination (page, size) and sorting

### Reviews Management

- **grimmory_list_reviews** - List reviews for a specific book (requires bookId)
- **grimmory_refresh_reviews** - Refresh reviews from external sources (Goodreads, etc.)
- **grimmory_delete_review** - Delete a specific review by ID
- **grimmory_delete_all_book_reviews** - Delete all reviews for a book

### Notebook

- **grimmory_get_notebook** - Get books with notes/highlights
  - Optional libraryId filter, pagination, and search

## Common Use Cases

### Statistics & Analytics
```
"Show me my library statistics"
"How many books have I read this year?"
"What's my average rating?"
"How many books am I currently reading?"
"Show me a breakdown by read status"
```

### Recommendations
```
"Recommend me a book based on my reading history"
"What should I read next?"
"Show me recommendations"
"Get book suggestions similar to what I've enjoyed"
```

### Reviews
```
"Show me reviews for book 123"
"Refresh the reviews for 'Dune'"
"Delete review 456"
"Get the latest reviews from Goodreads for book 789"
```

### Notebook
```
"Show me my notebook"
"Which books have I taken notes on?"
"List all books with highlights"
"Search my notebook for 'philosophy'"
"Show notebook entries from my main library"
```

## Read Status Values

- **UNREAD**: Haven't started
- **READING**: Currently active
- **READ**: Completed
- **RE_READING**: Reading again
- **PARTIALLY_READ**: Started but stopped
- **PAUSED**: Intentionally on hold
- **ABANDONED**: DNF (Did Not Finish)
- **WONT_READ**: Decided against

## Response Format

All tools support JSON (default) or Markdown via `response_format: "markdown"`.

## Related Skills

- Use **grimmory-library** to navigate to recommended books
- Use **grimmory-reading** to update ratings (improves recommendations) and manage notes
