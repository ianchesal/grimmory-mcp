# Grimmory Reading Skill — Test Results

**Date:** 2026-04-05  
**Instance:** Live Grimmory MCP server  
**Eval file:** `skills/grimmory-reading/evals/evals.json`

---

## Test 1: "Mark 'Dune' as currently reading"

### Tool Calls

**Call 1 — Find the book ID for 'Dune':**
```
grimmory_list_books(search="Dune", size=5, response_format="json")
```
→ Find book matching "Dune", extract `bookId` from results.

**Call 2 — Update read status:**
```
grimmory_update_read_status(bookId="<resolved_id>", status="READING", response_format="json")
```

### Reasoning

Two-step process: the user references a book by name ("Dune"), but `update_read_status` requires a numeric `bookId`. Must first search for the book to resolve the name to an ID, then update the status. The `status="READING"` enum value maps directly to the user's phrase "currently reading".

### Multi-Call Required?

**Yes** — 2 calls required (resolve name → update status). If the user provides a numeric ID directly, only 1 call is needed.

### Expected Response Format

**JSON** — Default for status updates. JSON is preferred for write operations to confirm the update payload.

### Assertions (from evals)

| Assertion | Type | Expected |
|-----------|------|----------|
| `updates_reading_status` | `tool_call` | Tool: `grimmory_update_read_status`, params: `{status: "READING"}` |

### Notes

- If multiple books match "Dune" (e.g., "Dune", "Dune Messiah", "Children of Dune"), the agent should ask the user to disambiguate.
- The skill SKILL.md lists `READING` as the correct enum value for "currently reading."

---

## Test 2: "Update my progress on book 123 to 45%"

### Tool Call

```
grimmory_update_progress(bookId=123, progress=45, response_format="json")
```

### Reasoning

Single call. The user provides both the book ID (123) and the progress value (45%). The `update_progress` tool accepts `bookId` and `progress` directly. No name resolution needed since a numeric ID is given.

Per the SKILL.md: "Automatically updates read status to READING if progress > 0" — so this call has a side effect of setting the book to READING status if it wasn't already.

### Multi-Call Required?

**No** — single call. Book ID is provided directly.

### Expected Response Format

**JSON** — Default. Confirms the progress update with the returned book state.

### Assertions (from evals)

| Assertion | Type | Expected |
|-----------|------|----------|
| `updates_progress` | `tool_call` | Tool: `grimmory_update_progress`, params: `{bookId: "123", progress: 45}` |

### Notes

- Progress is an integer (0-100). The user said "45%" — the agent should strip the `%` and pass `45`.
- Side effect: book status will automatically change to `READING` if it was `UNREAD`.
- No need to call `update_read_status` separately if the only goal is progress tracking.

---

## Test 3: "I've finished 'The Hobbit', mark it as read and give it 5 stars"

### Tool Calls

**Call 1 — Find the book ID for 'The Hobbit':**
```
grimmory_list_books(search="The Hobbit", size=5, response_format="json")
```
→ Resolve "The Hobbit" to a `bookId`.

**Call 2 — Update read status:**
```
grimmory_update_read_status(bookId="<resolved_id>", status="READ", response_format="json")
```

**Call 3 — Update rating:**
```
grimmory_update_rating(bookId="<resolved_id>", rating=5, response_format="json")
```

### Reasoning

Three-step process. The user expresses two intents: (1) mark as finished → `READ` status, and (2) rate it → 5 stars. These are independent operations on the same book, so they can theoretically be parallelized, but sequentially is safer to ensure the status update succeeds before adding a rating. Both require the resolved `bookId`.

"Finished" maps to the `READ` enum value. "5 stars" maps to `rating=5`.

### Multi-Call Required?

**Yes** — 3 calls (resolve name → update status → update rating). Calls 2 and 3 are independent of each other (only depend on call 1).

### Expected Response Format

**JSON** — Default for both write operations.

### Assertions (from evals)

| Assertion | Type | Expected |
|-----------|------|----------|
| `marks_read_and_rated` | `sequence` | Tools called in order: `grimmory_update_read_status`, then `grimmory_update_rating` |

### Notes

- Could optionally also set `progress=100` before marking as READ, following the SKILL.md best practice: "Set progress to 100 when finished, then mark as READ." This would add a 4th call: `grimmory_update_progress(bookId=..., progress=100)`.
- The two write operations are independent — an agent could fire them in parallel after resolving the book ID.

---

## Test 4: "Add a note to book 456 about the plot twist"

### Tool Call

```
grimmory_create_note(bookId=456, content="Note about the plot twist", response_format="json")
```

### Reasoning

Single call. The user provides the book ID (456) directly and describes the note content ("about the plot twist"). The `create_note` tool requires `bookId` and `content`. No `page` parameter is specified, so it's omitted.

**Caveat:** The user said "about the plot twist" — this is vague. A good agent should clarify what specifically the user wants the note to say, or compose a reasonable note based on context. The eval assertion only checks that `bookId=456` is passed, not the exact content.

### Multi-Call Required?

**No** — single call (assuming the user confirms or the agent drafts reasonable content).

### Expected Response Format

**JSON** — Default. Returns the created note with its generated `noteId` and timestamp.

### Assertions (from evals)

| Assertion | Type | Expected |
|-----------|------|----------|
| `creates_note` | `tool_call` | Tool: `grimmory_create_note`, params: `{bookId: "456"}` |

### Notes

- The `page` parameter is optional and not specified here.
- The note content is vague — the agent should ideally ask for clarification or draft something like "Interesting plot twist in this section."
- The eval only validates `bookId`, not the content text.

---

## Test 5: "Show me all notes for book 789"

### Tool Call

```
grimmory_list_notes(bookId=789, response_format="markdown")
```

### Reasoning

Single call. The user provides a book ID (789) and wants to see all notes. `list_notes` is a read-only query tool. Using `response_format="markdown"` since the user is asking to "show" notes (display-oriented).

### Multi-Call Required?

**No** — single call.

### Expected Response Format

**Markdown** — The user said "show me", which is display-oriented. Markdown provides better readability for listing notes. If pagination is needed (more than 20 notes), additional calls with `page` parameter would be required.

### Assertions (from evals)

| Assertion | Type | Expected |
|-----------|------|----------|
| `lists_notes` | `tool_call` | Tool: `grimmory_list_notes` |

### Notes

- Default page size is 20. If the book has more than 20 notes, the agent should paginate and offer to show more.
- The `sort` parameter can be used to order notes (e.g., by creation date or page number).
- Based on the library skill test results, `response_format="markdown"` has been buggy on some endpoints. If it fails, fall back to `"json"`.

---

## Test 6: "Create a note on page 150 of book 321: 'Important quote about freedom'"

### Tool Call

```
grimmory_create_note(bookId=321, content="Important quote about freedom", page=150, response_format="json")
```

### Reasoning

Single call. All required parameters are explicitly provided:
- `bookId`: 321 (numeric ID given directly)
- `content`: "Important quote about freedom" (quoted in the prompt)
- `page`: 150 (explicitly stated)

This is the most straightforward test case — no name resolution, no ambiguity, all params are literal.

### Multi-Call Required?

**No** — single call.

### Expected Response Format

**JSON** — Default for write operations. Returns the created note object with `noteId`, `content`, `page`, and timestamp.

### Assertions (from evals)

| Assertion | Type | Expected |
|-----------|------|----------|
| `includes_page_number` | `parameter_check` | Tool: `grimmory_create_note`, parameter: `page`, equals: `150` |

### Notes

- This test specifically validates that the `page` parameter is correctly extracted from natural language and passed to the tool.
- The content is in quotes, making it unambiguous.
- Ideal test case for verifying parameter extraction accuracy.

---

## Summary Table

| Test | Prompt | Tool(s) | Calls | Key Challenge | Eval Assertions |
|------|--------|---------|-------|---------------|-----------------|
| 1 | Mark 'Dune' as currently reading | `list_books` → `update_read_status` | 2 | Name → ID resolution | `status="READING"` |
| 2 | Update progress on book 123 to 45% | `update_progress` | 1 | Parse `%` to integer | `bookId="123", progress=45` |
| 3 | Finished 'The Hobbit', mark read + 5 stars | `list_books` → `update_read_status` → `update_rating` | 3 | Two intents, one name | Sequential tool calls |
| 4 | Add note to book 456 about plot twist | `create_note` | 1 | Vague content | `bookId="456"` |
| 5 | Show all notes for book 789 | `list_notes` | 1 | Display format choice | Tool called |
| 6 | Note on page 150 of book 321 | `create_note` | 1 | Page param extraction | `page=150` |

## Parameter Mapping Reference

| User Phrase | Tool | Parameter | Value |
|-------------|------|-----------|-------|
| "currently reading" | `update_read_status` | `status` | `READING` |
| "finished" / "mark as read" | `update_read_status` | `status` | `READ` |
| "45%" | `update_progress` | `progress` | `45` |
| "5 stars" | `update_rating` | `rating` | `5` |
| "page 150" | `create_note` | `page` | `150` |
| quoted text after colon | `create_note` | `content` | (literal quote content) |

## Cross-Skill Dependencies

| When Needed | Skill | Tool |
|-------------|-------|------|
| Book name → ID resolution | `grimmory-library` | `grimmory_list_books(search=...)` |
| Reading statistics | `grimmory-insights` | `grimmory_get_stats()` |
| Book metadata (title/author) | `grimmory-metadata` | `grimmory_get_book(bookId)` |

## Observations

1. **Name resolution is the main source of multi-call overhead** — 3 of 6 tests require a book search first because the user provides a name instead of an ID.
2. **Test 3 is the most complex** — two independent write operations triggered by a single sentence, plus name resolution.
3. **Test 6 is the simplest** — all parameters are explicit and numeric; no resolution or interpretation needed.
4. **The skill SKILL.md is well-aligned with the evals** — all 6 test prompts appear as examples in the skill documentation.
5. **Side effects matter** — `update_progress` automatically sets status to `READING`, which agents should be aware of to avoid redundant calls.
