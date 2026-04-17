/**
 * @coreator/remark-wysiwyg-breaks
 *
 * A remark plugin that preserves line breaks and empty lines as users intended.
 * - Non-Markdown syntax lines: adds two trailing spaces (hard break)
 * - Consecutive empty lines: converts to <br> tags
 */

import type { Plugin } from 'unified'

export interface RemarkWysiwygBreaksOptions {
  /**
   * Whether to preserve frontmatter without processing
   * @default true
   */
  preserveFrontmatter?: boolean
}

/**
 * Check if a line is a Markdown syntax line
 */
function isMdSyntaxLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false // Empty line is not a syntax line

  // Heading
  if (/^#{1,6}\s/.test(trimmed)) return true
  // Unordered list
  if (/^[\*\-\+]\s/.test(trimmed)) return true
  // Ordered list
  if (/^\d+\.\s/.test(trimmed)) return true
  // Blockquote
  if (/^>\s?/.test(trimmed)) return true
  // Table
  if (/^\|/.test(trimmed)) return true
  // Horizontal rule
  if (/^(---|\*\*\*|___)/.test(trimmed)) return true
  // Code block start/end
  if (/^```/.test(trimmed)) return true

  return false
}

/**
 * Pre-process lines to handle standalone HTML inline opening tags.
 *
 * Single-paragraph (no blank lines between opening and closing tag):
 *   merge opening tag with next line to prevent CommonMark Type 7 HTML block.
 *
 * Multi-paragraph (blank lines exist between opening and closing tag):
 *   remove the standalone opening tag line and distribute <tag>…</tag> to
 *   the first/last line of every paragraph — producing valid
 *   <p><tag>…</tag></p> for each paragraph.
 */
function distributeInlineHtmlTags(lines: string[]): string[] {
  const isBlank = (line: string) =>
    line.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '').trim() === ''

  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    const openTagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>$/)

    if (!openTagMatch) {
      result.push(lines[i])
      i++
      continue
    }

    const tagName = openTagMatch[1]
    const fullOpenTag = trimmed
    const closeTagRe = new RegExp(`</${tagName}>`, 'i')

    // Scan ahead to find the line containing the closing tag
    let closeIdx = -1
    let hasBlankBetween = false
    for (let j = i + 1; j < lines.length; j++) {
      if (closeTagRe.test(lines[j])) {
        closeIdx = j
        break
      }
      if (isBlank(lines[j])) hasBlankBetween = true
    }

    if (closeIdx === -1) {
      // No closing tag found — leave as-is
      result.push(lines[i])
      i++
      continue
    }

    if (!hasBlankBetween) {
      // Single paragraph: merge opening tag with the immediately following
      // non-empty line so it doesn't trigger a Type 7 HTML block.
      if (i + 1 < lines.length && !isBlank(lines[i + 1])) {
        result.push(fullOpenTag + lines[i + 1])
        i += 2
      } else {
        result.push(lines[i])
        i++
      }
      continue
    }

    // Multi-paragraph: distribute tags to each paragraph boundary
    const blockLines = lines.slice(i + 1, closeIdx + 1)

    // If closing tag is on its own line, merge it into the preceding content line
    if (blockLines[blockLines.length - 1].trim() === `</${tagName}>`) {
      let prevIdx = blockLines.length - 2
      while (prevIdx >= 0 && isBlank(blockLines[prevIdx])) prevIdx--
      if (prevIdx >= 0) {
        blockLines[prevIdx] += blockLines[blockLines.length - 1]
        blockLines.pop()
      }
    }

    // Find index of last non-empty line in block
    let lastNonEmptyIdx = -1
    for (let j = blockLines.length - 1; j >= 0; j--) {
      if (!isBlank(blockLines[j])) { lastNonEmptyIdx = j; break }
    }

    let firstInParagraph = true
    for (let j = 0; j < blockLines.length; j++) {
      const line = blockLines[j]
      if (isBlank(line)) {
        firstInParagraph = true
        result.push(line)
        continue
      }

      let processed = line
      if (firstInParagraph) {
        processed = fullOpenTag + processed
        firstInParagraph = false
      }

      // Append closing tag to last line of each paragraph (unless already present)
      const isLastInPara =
        j === lastNonEmptyIdx ||
        (j < blockLines.length - 1 && isBlank(blockLines[j + 1]))
      if (isLastInPara && !closeTagRe.test(processed)) {
        processed += `</${tagName}>`
      }

      result.push(processed)
    }

    i = closeIdx + 1
  }

  return result
}

/**
 * Preprocess Markdown content to preserve WYSIWYG line breaks
 */
export function preprocessMarkdown(
  content: string,
  options: RemarkWysiwygBreaksOptions = {}
): string {
  const { preserveFrontmatter = true } = options

  // Extract frontmatter
  let frontmatter = ''
  let body = content

  if (preserveFrontmatter) {
    const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)
    if (frontmatterMatch) {
      frontmatter = frontmatterMatch[0]
      body = content.slice(frontmatter.length)
    }
  }

  // Normalize line endings to \n (handles \r\n and \r from pasted content)
  body = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Protect code blocks
  const codeBlocks: string[] = []
  body = body.replace(/```[\s\S]*?```/g, (match: string) => {
    codeBlocks.push(match)
    return `<<<CODEBLOCK_${codeBlocks.length - 1}>>>`
  })

  // Process each line
  // Pre-process: handle standalone HTML inline tag lines before main loop
  const lines = distributeInlineHtmlTags(body.split('\n'))

  const result: string[] = []
  let emptyLineCount = 0
  // false = content, true = syntax; starts false so leading empty lines before
  // content are treated as content→content and preserved with <br>
  let prevWasSyntax = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Empty line: accumulate count
    // Also treat lines containing only zero-width / invisible Unicode characters as empty
    // (e.g. U+200B zero-width space, U+FEFF BOM, U+200C/200D/2060)
    const stripped = line.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '')
    if (stripped.trim() === '') {
      emptyLineCount++
      continue
    }

    const isCurrentSyntax = isMdSyntaxLine(line) || line.includes('<<<CODEBLOCK_')

    // Non-empty line: process accumulated empty lines first
    if (emptyLineCount > 0) {
      const bothContent = !prevWasSyntax && !isCurrentSyntax
      // content↔content: 1+ empty lines → <br>
      // anything involving syntax: 2+ empty lines → <br>
      if (emptyLineCount >= 2 || bothContent) {
        const brs = Array(emptyLineCount).fill('<br>').join('')
        result.push(brs)
      }
      result.push('')
      emptyLineCount = 0
    }

    // Process current line
    if (isCurrentSyntax) {
      // Markdown syntax line: keep as is
      result.push(line)
    } else {
      // Content line: add two trailing spaces (hard break)
      result.push(line + '  ')
    }

    prevWasSyntax = isCurrentSyntax
  }

  // Handle trailing empty lines
  if (emptyLineCount > 0) {
    const brs = Array(emptyLineCount).fill('<br>').join('')
    result.push(brs)
  }

  body = result.join('\n')

  // Restore code blocks
  body = body.replace(/<<<CODEBLOCK_(\d+)>>>/g, (_: string, index: string) => {
    return codeBlocks[parseInt(index)]
  })

  return frontmatter + body
}

/**
 * Remark plugin that preserves WYSIWYG line breaks
 *
 * This plugin works as a preprocessor, modifying the Markdown source
 * before it's parsed into an AST.
 *
 * @example
 * ```ts
 * import { unified } from 'unified'
 * import remarkParse from 'remark-parse'
 * import remarkWysiwygBreaks from '@coreator/remark-wysiwyg-breaks'
 * import remarkHtml from 'remark-html'
 *
 * const result = await unified()
 *   .use(remarkWysiwygBreaks)
 *   .use(remarkParse)
 *   .use(remarkHtml)
 *   .process(markdown)
 * ```
 */
const remarkWysiwygBreaks: Plugin<[RemarkWysiwygBreaksOptions?]> = (
  options = {}
) => {
  return (_tree, file) => {
    // Get the original content and preprocess it
    const content = String(file)
    const processed = preprocessMarkdown(content, options)

    // Update the file value
    // Note: This modifies the source for subsequent plugins
    file.value = processed
  }
}

export default remarkWysiwygBreaks

// Also export as named export for flexibility
export { remarkWysiwygBreaks }
