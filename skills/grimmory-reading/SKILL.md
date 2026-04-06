description: Use when the user mentions reading progress, book ratings, reading status, taking notes, or tracking their reading journey. Triggers on: currently reading, mark as read, update progress percentage, star ratings (1-5), book notes, annotations, reading status changes (UNREAD, READING, READ, ABANDONED, PAUSED), page numbers, highlights.
description: Use for managing reading progress, book ratings, and notes in Grimmory. Trigger when the user wants to update reading status, set ratings, track progress percentages, or create/delete notes on books.
---

Track what you're reading, how much you've read, and what you think of books.

## Available Tools

- **grimmory_update_read_status** - Change a book's status
  - Status options:
    - `UNREAD` - Not started
    - `READING` - Currently reading
    - `RE_READING` - Reading again
    - `READ` - Finished
    - `PARTIALLY_READ` - Started but paused
    - `PAUSED` - Intentionally paused
    - `WONT_READ` - Decided not to read
    - `ABANDONED` - Started but won't finish
    - `UNSET` - Clear status
  - Requires bookId
- **grimmory_update_rating** - Set your rating (1-5 stars)
  - Requires bookId
- **grimmory_update_progress** - Update reading progress (0-100)
  - Progress range: 0-100
  - Requires bookId
  - Automatically updates status to READING if progress > 0

### Notes Management

- **grimmory_list_notes** - View notes for a book
- **grimmory_create_note** - Create a note for a book
  - Requires bookId and content
  - Optional page number
- **grimmory_delete_note** - Delete a note permanently
## Examples

### Tracking Reading
```
"Mark 'Dune' as currently reading"
"Update my progress on book 123 to 45%"
"I've finished 'The Hobbit', mark it as read and give it 5 stars"
```

### Managing Ratings
```
"Rate book 456 as 4 stars"
"What's my rating for 'Pride and Prejudice'?"
"Update the rating for my current book to 3 stars"
```

### Taking Notes
```
"Add a note to book 789: 'The protagonist's choice here is interesting'"
"Create a note on page 100 of my current book about the plot twist"
"Show me all notes for '1984'"
"Delete note 5 from book 123"
```

### Reading Workflow
```
"Start reading 'The Martian' - set to reading and progress to 0%"
"I'm on page 150 of 300, update my progress"
"Just finished chapter 5, add a note about the main character"
```

## Reading Status Meanings

- **UNREAD**: Default state, haven't started
- **READING**: Actively reading now
- **RE_READING**: Reading a book you've read before
- **READ**: Completed the book
- **PARTIALLY_READ**: Started but stopped (ambiguous)
- **PAUSED**: Intentionally taking a break
- **WONT_READ**: Decided it's not for you (without starting)
- **ABANDONED**: Started but decided not to finish (DNF - Did Not Finish)
- **UNSET**: Clear any status

## Best Practices

### Progress Tracking
- Update progress periodically (e.g., every chapter or 10%)
- Set progress to 100 when finished, then mark as READ
### Taking Good Notes
- Note quotes you want to remember
- Record questions or predictions
- Summarize chapters for complex books

### Rating Guidelines
- 5 stars: Exceptional, would recommend to everyone
- 4 stars: Very good, minor issues
- 3 stars: Good, but forgettable or flawed
- 2 stars: Poor, significant problems
- 1 star: Terrible, couldn't finish or hated it

All tools support JSON (default) and Markdown (response_format: "markdown") output.

## Related Skills

- Use **grimmory-library** to find book IDs
- Use **grimmory-insights** to see reading statistics
- Use **grimmory-metadata** to update book metadata
