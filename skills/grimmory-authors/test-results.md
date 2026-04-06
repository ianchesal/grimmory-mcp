# Grimmory Authors Skill — Test Results

> **Date:** 2026-04-05
> **Tester:** Sisyphus-Junior (automated analysis)
> **Scope:** 8 test prompts mapping user intent to tool calls

---

## Test 1: "List all authors in my library"

**Tool call:**
```json
{
  "tool": "grimmory_list_authors",
  "args": {
    "page": 0,
    "size": 20,
    "response_format": "markdown"
  }
}
```

**Reasoning:** Straightforward listing request. Default pagination (first 20) is appropriate for an initial view. Markdown format gives a readable result.

**Warnings/confirmations:** None. Read-only, no side effects.

**Follow-up:** If the library has more than 20 authors, inform the user and offer to paginate (`page=1`, `page=2`, etc.) or increase `size`.

---

## Test 2: "Find authors matching 'Asimov'"

**Tool call:**
```json
{
  "tool": "grimmory_find_author_by_name",
  "args": {
    "name": "Asimov",
    "response_format": "json"
  }
}
```

**Reasoning:** This is a name search against the local database. `grimmory_find_author_by_name` is purpose-built for this — it does case-insensitive partial matching. Using JSON format for structured results so we can clearly show match IDs.

**Alternative considered:** `grimmory_list_authors(search="Asimov")` would also work but `find_author_by_name` is semantically more precise for a name lookup.

**Warnings/confirmations:** None. Read-only.

**Follow-up:** If results are ambiguous (e.g., "Isaac Asimov" vs a collaborator), present all matches and let the user pick.

---

## Test 3: "Show me details for author 987"

**Tool call:**
```json
{
  "tool": "grimmory_get_author",
  "args": {
    "authorId": 987,
    "response_format": "markdown"
  }
}
```

**Reasoning:** Direct author detail retrieval by ID. Markdown format for a clean, human-readable profile including name, bio, metadata links, photo, and book count.

**Warnings/confirmations:** None. Read-only.

**Edge case:** If author 987 doesn't exist, the API will return an error/null — inform the user and suggest listing authors to find the correct ID.

---

## Test 4: "Update author 654's description with their life story"

**⚠️ CLARIFICATION NEEDED before proceeding.**

The user says "their life story" but doesn't provide the actual text. I would:

1. **Ask the user for the description text** before making any API call.
2. Once provided, call:

```json
{
  "tool": "grimmory_update_author",
  "args": {
    "authorId": 654,
    "description": "<user-provided biography text>",
    "response_format": "json"
  }
}
```

**Reasoning:** `grimmory_update_author` accepts `name` and `description` fields. Since only description is being changed, we omit `name` (no rename needed).

**Warnings/confirmations:**
- **Destructive?** Partially — it overwrites the existing description. If the current description is valuable, we should show it first via `grimmory_get_author` so the user can confirm.
- **Recommended flow:** Get current author details → show existing description → get new text → apply update.

---

## Test 5: "Search for metadata for author 321"

**Tool call:**
```json
{
  "tool": "grimmory_search_author_metadata",
  "args": {
    "authorId": 321,
    "response_format": "json"
  }
}
```

**Reasoning:** This searches external metadata providers (Google Books, Open Library, etc.) for potential matches. JSON format gives structured results with provider names and item IDs needed for subsequent matching.

**Warnings/confirmations:** None. Read-only — this only returns potential matches, it doesn't apply them.

**Follow-up:** Present results to the user. If they want to apply a match, offer:
- `grimmory_quick_match_author` (auto-pick best match)
- `grimmory_match_author` (manual pick with specific provider + item ID)

---

## Test 6: "Auto-match all unmatched authors in my library"

**Tool call:**
```json
{
  "tool": "grimmory_auto_match_authors",
  "args": {
    "response_format": "json"
  }
}
```

**Reasoning:** Bulk operation that finds and applies best matches for all authors without existing provider links. JSON format for a structured summary of matches made.

**Warnings/confirmations:**
- ⚠️ **This is a bulk write operation.** It will modify metadata associations for potentially many authors.
- **Recommend confirming with the user first** before executing, especially in large libraries.
- **Risk:** Automatic matching can produce incorrect matches (e.g., two authors with the same name). Suggest running on a small subset first or reviewing results afterward.
- **May block until complete** — warn the user it could take time for large libraries.

**Post-action follow-up:** Report how many authors were matched, and suggest reviewing any suspicious matches with `grimmory_unmatch_authors`.

---

## Test 7: "Find photos for author 147"

**Tool call:**
```json
{
  "tool": "grimmory_search_author_photos",
  "args": {
    "authorId": 147,
    "response_format": "json"
  }
}
```

**Reasoning:** Searches metadata providers for author photo URLs. JSON format to get structured URL results.

**Warnings/confirmations:** None. Read-only — doesn't set a photo, just returns candidates.

**Follow-up:** Present photo URLs to the user. If they want to apply one, call:
```json
{
  "tool": "grimmory_set_author_photo_url",
  "args": {
    "authorId": 147,
    "url": "<selected photo URL>"
  }
}
```

---

## Test 8: "Unmatch author 258, it's linked to the wrong person"

**⚠️ DESTRUCTIVE OPERATION — requires confirmation.**

Before executing, I would:

1. **Show the user the current match** via `grimmory_get_author(authorId=258)` so they can confirm it's the wrong match.
2. **Ask for explicit confirmation** before proceeding.
3. Then call:

```json
{
  "tool": "grimmory_unmatch_authors",
  "args": {
    "authorIds": [258],
    "response_format": "json"
  }
}
```

**Reasoning:** `grimmory_unmatch_authors` removes metadata provider associations. It takes an array, so single or bulk unmatching uses the same tool. The author record itself is preserved — only the external link is removed.

**Warnings/confirmations:**
- ⚠️ **DESTRUCTIVE** — removes provider associations permanently.
- The author entry stays in the database; only the link to the metadata provider is severed.
- **Must confirm** before executing.
- **Suggest re-matching** after unmatch: `grimmory_search_author_metadata` → `grimmory_match_author` or `grimmory_quick_match_author`.

---

## Summary Table

| Test | Prompt | Tool | Destructive? | Confirmation Needed? |
|------|--------|------|-------------|---------------------|
| 1 | List all authors | `grimmory_list_authors` | No | No |
| 2 | Find 'Asimov' | `grimmory_find_author_by_name` | No | No |
| 3 | Details for author 987 | `grimmory_get_author` | No | No |
| 4 | Update description | `grimmory_update_author` | Partial (overwrite) | Yes — need text + show current |
| 5 | Search metadata | `grimmory_search_author_metadata` | No | No |
| 6 | Auto-match all | `grimmory_auto_match_authors` | Yes (bulk write) | Yes — bulk operation |
| 7 | Find photos | `grimmory_search_author_photos` | No | No |
| 8 | Unmatch author 258 | `grimmory_unmatch_authors` | Yes (remove links) | Yes — destructive |

## Observations

1. **Read-only operations (5/8)** are safe to execute immediately — no confirmation needed.
2. **Write operations (3/8)** require varying levels of confirmation:
   - Test 4: Need missing input (description text) + show current state
   - Test 6: Bulk operation — should warn about scope and duration
   - Test 8: Destructive — must confirm correct target before removing
3. **Tool design is clean** — each prompt maps to exactly one primary tool with clear parameter requirements.
4. **Follow-up chains** are natural (search → match, find photos → set photo, unmatch → re-match).
