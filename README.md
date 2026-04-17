# @coreator/remark-wysiwyg-breaks

A [remark](https://github.com/remarkjs/remark) plugin that preserves line breaks and empty lines exactly as users intended — achieving true WYSIWYG (What You See Is What You Get) behavior for Markdown.

## Problem

In standard Markdown:
- A single line break is ignored (treated as a space)
- Multiple empty lines are collapsed into one paragraph break

This plugin fixes that by:
1. Adding two trailing spaces (hard break) to content lines
2. Converting consecutive empty lines to `<br>` tags

## Installation

```bash
npm install @coreator/remark-wysiwyg-breaks
```

## Usage

### With unified/remark

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkWysiwygBreaks from '@coreator/remark-wysiwyg-breaks'
import remarkHtml from 'remark-html'

const markdown = `Line 1
Line 2

Line after one empty line


Line after two empty lines`

const result = await unified()
  .use(remarkWysiwygBreaks)
  .use(remarkParse)
  .use(remarkHtml)
  .process(markdown)

console.log(String(result))
```

### Standalone preprocessing

You can also use the preprocessing function directly:

```ts
import { preprocessMarkdown } from '@coreator/remark-wysiwyg-breaks'

const processed = preprocessMarkdown(markdown)
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `preserveFrontmatter` | `boolean` | `true` | Whether to preserve YAML frontmatter without processing |

```ts
unified()
  .use(remarkWysiwygBreaks, { preserveFrontmatter: false })
```

## How It Works

### Markdown Syntax Lines (unchanged)
The following are recognized as Markdown syntax and left untouched:
- Headings (`# heading`)
- Lists (`- item`, `1. item`)
- Blockquotes (`> quote`)
- Tables (`| cell |`)
- Horizontal rules (`---`, `***`, `___`)
- Code blocks (` ``` `)

### Content Lines
Non-syntax lines receive two trailing spaces to create hard breaks.

### Empty Lines

The plugin applies context-aware rules:

| Previous line | Next line | Empty line count | Result |
|---------------|-----------|------------------|--------|
| content | content | 1+ | `<br>` per empty line |
| content | syntax | 1 | paragraph separator only |
| content | syntax | 2+ | `<br>` per empty line |
| syntax | content | 1 | paragraph separator only |
| syntax | content | 2+ | `<br>` per empty line |
| (start of file) | content | 1+ | `<br>` per empty line |

### Inline HTML Tags (`<i>`, `<em>`, `<b>`, etc.)

A standalone HTML inline tag on its own line (e.g. `<i>` with nothing else on the line) would normally trigger a CommonMark Type 7 HTML block, causing all line breaks inside to collapse. This plugin handles it automatically:

**Single-paragraph** — tag is merged onto the next line:

```markdown
<i>
content line
more content</i>
```

**Multi-paragraph** — tag is distributed to each paragraph's first and last line, producing valid `<p><i>…</i></p>` for every paragraph:

```markdown
<i>
First paragraph line 1
First paragraph line 2

Second paragraph.</i>
```

Renders as:

```html
<p><i>First paragraph line 1<br>First paragraph line 2</i></p>
<p><i>Second paragraph.</i></p>
```

Markdown syntax inside the block (bold, inline code, etc.) continues to work normally.

## Changelog

See [CHANGELOG.md](./docs/CHANGELOG.md).

## License

MIT
