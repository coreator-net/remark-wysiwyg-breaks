# Changelog

## [1.0.1] - 2026-04-09

### Bug Fixes

#### Context-aware empty line handling (content↔content vs. involving syntax)

**Problem:** Single empty lines between content paragraphs should be preserved as `<br>`, but a single empty line between content and a Markdown syntax line (heading, list, etc.) is just a paragraph separator and should not produce `<br>`. Only 2+ empty lines before/after syntax indicate intentional spacing.

**Root cause:** The original logic did not track what type of line preceded the empty lines, so it applied the same rule regardless of context.

**Fix:** Track `prevWasSyntax` to apply different rules:
- content↔content: 1+ empty lines → `<br>`
- either side is syntax: 2+ empty lines → `<br>`
- Initial value is `false` (treated as content) so leading empty lines before the first content are preserved.

---

#### Empty lines before Markdown syntax lines (headings, etc.) were discarded

**Problem:** When multiple empty lines were followed by a Markdown syntax line (e.g. `### heading`), they were not converted to `<br>` and were silently dropped — losing intentional vertical spacing.

**Root cause:** The original logic distinguished between "empty lines followed by content line" (preserve `<br>`) and "empty lines followed by syntax line" (only emit one paragraph separator), discarding the `<br>` in the latter case.

**Fix:** Superseded by the context-aware fix above.

---

#### CRLF line endings caused paragraph lines to merge

**Problem:** Content pasted from external sources (text editors, Word, etc.) may carry Windows line endings (`\r\n`). After splitting on `\n`, each line retains a trailing `\r`, making `line + '  '` become `text\r  `. CommonMark parsers treat `\r` as a line ending, so the two trailing spaces are no longer at the end of the line — hard break fails and lines within a paragraph are merged into one (separated by spaces).

**Fix:** Normalize all `\r\n` and `\r` to `\n` before line processing.

---

## [1.0.0] - Initial release

- Adds two trailing spaces (hard break) to content lines
- Converts consecutive empty lines to `<br>` tags
- Protects code blocks from processing
- Preserves YAML frontmatter
