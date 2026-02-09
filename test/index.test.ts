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
})
