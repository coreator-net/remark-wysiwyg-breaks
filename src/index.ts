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
  const lines = body.split('\n')
  const result: string[] = []
  let emptyLineCount = 0
  // false = content, true = syntax; starts false so leading empty lines before
  // content are treated as content→content and preserved with <br>
  let prevWasSyntax = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Empty line: accumulate count
    if (line.trim() === '') {
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
