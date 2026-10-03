# Changelog

## [1.0.5] - 2026-10-03

### Bug Fixes

#### Injected `<br>` absorbed by tables, lists and blockquotes

**Problem:** When two or more empty lines followed a table, list or blockquote, the injected `<br>` run was swallowed by that block instead of standing on its own. Tables were the most visible: the `<br>` line became an extra row of empty cells.

```
| a | b |        <table>…<tbody>
|---|---|          <tr><td>1</td><td>2</td></tr>
| 1 | 2 |   →      <tr><td><br><br></td><td></td></tr>   ← phantom row
                 </tbody></table>

+ A         →    <ul><li>A<br><br></li></ul>            ← breaks inside <li>
> q         →    <blockquote><p>q<br><br></p></blockquote>
```

**Root cause:** The empty lines are replaced by a `<br>` line emitted directly after the preceding line, with no blank line in between. Tables, lists and blockquotes all continue into the following non-blank line (extra table row / lazy continuation), so the `<br>` line was parsed as part of that block rather than as its own.

**Fix:** Track whether the preceding line belongs to a container block (list, blockquote, or a GFM table opened by a delimiter row) and emit a blank line before the `<br>` run to close it. Paragraphs are deliberately excluded — letting the `<br>` run join the preceding paragraph is the intended behaviour and is unchanged.

Container detection covers both ordered list delimiters (`1.` and `1)`) and GFM tables written without leading pipes.

**Note:** A list split by two or more empty lines now renders as separate `<ul>`/`<ol>` elements. Explicit numbering is preserved via `start` (`1.` … `2.` → `<ol>` + `<ol start="2">`), but a source that writes `1.` for every item will no longer be renumbered automatically.

### Tests

Added render-level test suites (`test/render.test.ts`, `test/invariants.test.ts`). The existing tests only asserted the string returned by `preprocessMarkdown`, which cannot reveal how a downstream parser re-attributes the injected `<br>` — the class of bug above was invisible to them. The new suites run a corpus of Markdown structures through the same unified pipeline as `islas-shared/markdown/Viewer.vue` and assert structural invariants on the rendered HTML.

---

## [1.0.4] - 2026-04-17

### Bug Fixes

#### Multi-paragraph `<i>` blocks rendered with inconsistent HTML structure

**Problem:** When an HTML inline tag (e.g. `<i>`) appears on its own line and spans multiple paragraphs (blank lines between opening and closing tag), only the first paragraph was wrapped correctly as `<p><i>…</i></p>`. Subsequent paragraphs were rendered as `<i><p>…</p></i>` — an invalid HTML5 structure (inline wrapping block).

**Root cause:** The 1.0.3 fix merged the standalone opening tag with the first content line only, which solved the Type 7 HTML block problem for the first paragraph but left later paragraphs untagged, causing renderers to wrap them inconsistently.

**Fix:** Extend the pre-processing step to detect multi-paragraph blocks (blank lines between `<i>` and `</i>`). For these blocks, instead of merging the opening tag with only the first line, the tag is distributed: `<tag>` is prepended to the first line of each paragraph and `</tag>` is appended to the last line of each paragraph. This produces `<p><tag>…</tag></p>` consistently for all paragraphs, while preserving Markdown syntax processing inside each paragraph (bold, inline code, etc.).

Single-paragraph blocks (no blank lines) continue to use the existing merge approach.

---

## [1.0.3] - 2026-04-17

### Bug Fixes

#### Standalone HTML inline tag lines causing content lines to merge (`<i>`, `<em>`, etc.)

**Problem:** When an HTML inline opening tag (e.g. `<i>`, `<em>`, `<b>`) appears on its own line immediately followed by content, the content lines merge into a single line with spaces between them.

**Root cause:** A lone `<tag>` on its own line satisfies CommonMark's Type 7 HTML block condition. Inside a Type 7 HTML block, content is treated as raw HTML — where line breaks are whitespace and collapse to spaces. The trailing-space hard break technique has no effect inside HTML blocks.

**Fix:** Pre-process lines before the main loop. If a line consists only of an HTML opening tag and the immediately following line is non-empty, merge the tag onto the front of the next line. This prevents the Type 7 HTML block from triggering and keeps subsequent lines in a normal Markdown paragraph where trailing-space hard breaks work correctly.

---

## [1.0.2] - 2026-04-17

### Bug Fixes

#### Zero-width space lines not treated as empty lines

**Problem:** Lines containing only zero-width Unicode characters (e.g. U+200B zero-width space, commonly inserted by rich-text editors or copy-paste from browsers) were not recognized as empty lines by `String.prototype.trim()`. This caused them to be treated as content lines, breaking expected paragraph separation — most visibly when such a line appeared between an `</i>` block and the next dialogue paragraph, making the spacing disappear.

**Fix:** Strip zero-width and invisible Unicode characters (`\u200B`, `\u200C`, `\u200D`, `\u2060`, `\uFEFF`) before checking if a line is empty.

---

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
