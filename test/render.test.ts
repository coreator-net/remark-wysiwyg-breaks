import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import { preprocessMarkdown } from '../src/index'

/**
 * 渲染層測試。
 *
 * index.test.ts 只驗證 preprocessMarkdown 的字串輸出，看不出注入的 <br>
 * 被下游 Markdown 解析器如何歸屬。表格把 <br> 行吃成一列空儲存格、清單與
 * 引用把它吃進 <li>／<blockquote> 的問題，都是因此長期未被發現，
 * 故補上這組端到端測試。
 *
 * 管線與 islas-shared/markdown/Viewer.vue 一致。
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify, { allowDangerousHtml: true })

const render = async (src: string) =>
  String(await processor.process(preprocessMarkdown(src)))

describe('表格後方的空行', () => {
  const table = '| a | b |\n|---|---|\n| 1 | 2 |\n\n\nAfter'

  it('不會被吃成多餘的一列', async () => {
    const html = await render(table)
    expect(html).not.toMatch(/<td><br>/)
    expect(html).not.toMatch(/<td><\/td>/)
  })

  it('<br> 落在表格之外，成為獨立段落', async () => {
    expect(await render(table)).toMatch(/<\/table>\s*<p><br><br><\/p>/)
  })

  it('表格內容本身不受影響', async () => {
    expect(await render(table)).toContain('<tbody><tr><td>1</td><td>2</td></tr></tbody>')
  })

  it('只有表頭的表格也正確', async () => {
    expect(await render('| a |\n|---|\n\n\nAfter')).not.toMatch(/<td>/)
  })

  it('兩個表格之間的空行不會污染任一方', async () => {
    const html = await render('| a |\n|---|\n| 1 |\n\n\n| b |\n|---|\n| 2 |')
    expect(html).not.toMatch(/<td><br>/)
    expect((html.match(/<table>/g) ?? []).length).eqls(2)
  })

  it('以表格結尾、後方只有空行時也不產生多餘的列', async () => {
    const html = await render('| a |\n|---|\n| 1 |\n\n\n')
    expect(html).not.toMatch(/<td><br>/)
    expect(html).toMatch(/<\/table>/)
  })
})

describe('清單後方的空行', () => {
  it('<br> 落在清單之外，不再被吃進 <li>', async () => {
    const html = await render('+ A\n\n\nAfter')
    expect(html).toMatch(/<\/ul>\s*<p><br><br><\/p>/)
    expect(html).not.toMatch(/<li>[^<]*<br>/)
  })

  it('縮排延續的項目也正確收尾', async () => {
    expect(await render('+ A\n  more\n\n\nAfter')).toMatch(/<\/ul>\s*<p><br><br><\/p>/)
  })

  it('惰性延續的項目也正確收尾', async () => {
    expect(await render('+ A\nlazy\n\n\nAfter')).toMatch(/<\/ul>\s*<p><br><br><\/p>/)
  })

  it('巢狀清單正確收尾', async () => {
    expect(await render('+ A\n  + A1\n\n\nAfter')).toMatch(/<\/ul>\s*<p><br><br><\/p>/)
  })

  it('有序清單被分段時保留編號（start 屬性）', async () => {
    expect(await render('1. A\n\n\n2. B')).toContain('<ol start="2">')
  })

  it('僅一個空行時維持單一清單，不插入 <br>', async () => {
    const html = await render('+ A\n\n+ B')
    expect(html).not.toContain('<br>')
    expect((html.match(/<ul>/g) ?? []).length).eqls(1)
  })
})

describe('引用後方的空行', () => {
  it('<br> 落在引用之外，不再被吃進 <blockquote>', async () => {
    expect(await render('> q\n\n\nAfter')).toMatch(/<\/blockquote>\s*<p><br><br><\/p>/)
  })

  it('多行引用也正確收尾', async () => {
    expect(await render('> q\n> more\n\n\nAfter')).toMatch(/<\/blockquote>\s*<p><br><br><\/p>/)
  })
})

describe('其他區塊的空行行為維持不變', () => {
  const sources: Record<string, string> = {
    // 段落：<br> 併入該段落，這是本套件的預期行為，不得更動
    '段落': 'One\n\n\nAfter',
    '標題': '# H1\n\n\nAfter',
    '程式碼區塊': '```js\nx\n```\n\n\nAfter',
    '水平線': '---\n\n\nAfter',
  }
  const patterns: Record<string, RegExp> = {
    '段落': /<p>One<br>\n<br><br><\/p>/,
    '標題': /<h1>H1<\/h1>\n<p><br><br><\/p>/,
    '程式碼區塊': /<\/code><\/pre>\n<p><br><br><\/p>/,
    '水平線': /<hr>\n<p><br><br><\/p>/,
  }

  for (const name of Object.keys(sources)) {
    it(name, async () => {
      expect(await render(sources[name])).toMatch(patterns[name])
    })
  }
})
