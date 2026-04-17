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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Release Flow

### Prerequisites

- npm account with access to `@coreator` scope
- A **Granular Access Token** (Packages and scopes, Read and write) stored in `~/.npmrc`:
  ```
  //registry.npmjs.org/:_authToken=<token>
  ```
- npm 2FA set to **not** require OTP for write actions, OR use a recovery code with `--otp`

### Steps

```bash
# 1. Make changes on develop
git checkout develop
git merge main

# ... make changes, run tests ...
npm test

# 2. Bump version in package.json, update CHANGELOG.md

# 3. Commit on develop
git add <files>
git commit -m "chore: release vX.Y.Z"

# 4. Merge to main
git checkout main
git merge develop

# 5. Push both branches
git push origin develop
git push origin main

# 6. Publish (build runs automatically via prepublishOnly)
npm publish

# If OTP is required (2FA recovery code):
npm publish --otp=<recovery-code>
```

## License

MIT
