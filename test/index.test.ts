import { describe, it, expect } from 'vitest'
import { preprocessMarkdown } from '../src/index'

describe('preprocessMarkdown', () => {
  it('should add trailing spaces to content lines', () => {
    const input = `Line 1
Line 2
Line 3`
    const result = preprocessMarkdown(input)
    expect(result).toBe(`Line 1  
Line 2  
Line 3  `)
  })

  it('should preserve heading syntax', () => {
    const input = `# Heading 1
## Heading 2`
    const result = preprocessMarkdown(input)
    expect(result).toContain('# Heading 1')
    expect(result).toContain('## Heading 2')
  })

  it('should preserve list syntax', () => {
    const input = `- Item 1
- Item 2
1. Ordered 1
2. Ordered 2`
    const result = preprocessMarkdown(input)
    expect(result).toContain('- Item 1')
    expect(result).toContain('1. Ordered 1')
  })

  it('should convert multiple empty lines to br tags', () => {
    const input = `Line 1


Line 2`
    const result = preprocessMarkdown(input)
    expect(result).toContain('<br><br>')
  })

  it('should preserve code blocks', () => {
    const input = `\`\`\`js
const x = 1
const y = 2
\`\`\``
    const result = preprocessMarkdown(input)
    expect(result).toContain('const x = 1')
    expect(result).toContain('const y = 2')
  })

  it('should preserve frontmatter', () => {
    const input = `---
title: Test
---
Content here`
    const result = preprocessMarkdown(input)
    expect(result).toContain('---\ntitle: Test\n---')
  })

  it('should handle blockquotes', () => {
    const input = `> This is a quote
> Another line`
    const result = preprocessMarkdown(input)
    expect(result).toContain('> This is a quote')
  })

  it('should handle tables', () => {
    const input = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`
    const result = preprocessMarkdown(input)
    expect(result).toContain('| Header 1 | Header 2 |')
  })

  it('should handle CRLF line endings (pasted content from Windows)', () => {
    // Simulate pasted content with \r\n line endings
    const input = "Line 1\r\nLine 2\r\nLine 3"
    const result = preprocessMarkdown(input)
    // Each line should end with two spaces (hard break), no \r before the spaces
    expect(result).toBe("Line 1  \nLine 2  \nLine 3  ")
  })

  it('should preserve 2+ empty lines before markdown syntax lines (headings)', () => {
    const input = `　　她真的好想哭。


### ⛤⛤⛤`
    const result = preprocessMarkdown(input)
    expect(result).toContain('<br><br>')
    expect(result).toContain('### ⛤⛤⛤')
  })

  it('should NOT add <br> for single empty line between content and syntax', () => {
    const input = `Some content

## Heading`
    const result = preprocessMarkdown(input)
    // Single empty line between content and syntax should not produce <br>
    const parts = result.split('\n')
    expect(parts.some(p => p.includes('<br>'))).toBe(false)
  })

  it('should add <br> for single empty line between two content lines', () => {
    const input = `Line 1

Line 2`
    const result = preprocessMarkdown(input)
    expect(result).toContain('<br>')
  })

  it('should preserve leading empty lines before first content', () => {
    const input = `


第一個內容`
    const result = preprocessMarkdown(input)
    expect(result).toContain('<br>')
    expect(result).toContain('第一個內容')
  })

  it('should treat zero-width space only lines as empty lines', () => {
    // U+200B line between content should be treated as empty (paragraph separator)
    const input = '　　別害怕——</i>\n\n\u200B\n　　「別害怕...」'
    const result = preprocessMarkdown(input)
    // ZWS line counted as empty → emptyLineCount=2, bothContent → <br><br>
    expect(result).toContain('<br><br>')
    expect(result).toContain('　　「別害怕...」')
    // ZWS line should NOT appear as content
    expect(result).not.toContain('\u200B  ')
  })

  it('should merge standalone HTML inline tag line with next line to prevent Type 7 HTML block', () => {
    // <i> on its own line triggers CommonMark Type 7 HTML block where newlines collapse
    const input = '<i>\n　　會被黏1\n　　會被黏2\n　　會被黏3\n\n　　不會被黏1\n　　不會被黏2</i>'
    const result = preprocessMarkdown(input)
    // <i> should be merged with first content line, preventing HTML block
    expect(result).toContain('<i>　　會被黏1  ')
    // Subsequent lines should have trailing spaces (hard breaks)
    expect(result).toContain('　　會被黏2  ')
    expect(result).toContain('　　會被黏3  ')
    // The paragraph after blank line should also work
    expect(result).toContain('　　不會被黏1  ')
  })

  it('should not merge standalone HTML tag with next line if followed by blank line', () => {
    // <i> followed by blank line: Type 7 block ends immediately, no content inside
    const input = '<i>\n\n　　content'
    const result = preprocessMarkdown(input)
    // <i> stays on its own line (no merge needed)
    expect(result).toContain('<i>')
    expect(result).toContain('　　content')
  })

  it('should handle mixed CR/CRLF line endings', () => {
    const input = "Line 1\r\nLine 2\rLine 3"
    const result = preprocessMarkdown(input)
    expect(result).toBe("Line 1  \nLine 2  \nLine 3  ")
  })
})
