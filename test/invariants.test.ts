import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import { preprocessMarkdown } from '../src/index'

/**
 * 語料庫 × 不變量掃描。
 *
 * 本套件的風險集中在一件事：preprocessMarkdown 注入的 <br> 是「文字」，
 * 下游解析器可能把它重新歸屬到別的區塊裡 —— 表格會吃成一列空儲存格，
 * 清單與引用會吃進 <li>／<blockquote>。這類問題看 preprocessMarkdown 的
 * 字串輸出完全看不出來，必須渲染後才現形。
 *
 * 因此這裡用一組涵蓋各種 Markdown 結構的語料，對每一筆套用同一組結構性
 * 不變量。新增樣本只需在 corpus 加一行，所有不變量自動套用。
 *
 * 管線與 islas-shared/markdown/Viewer.vue 一致。
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml', 'toml'])
  .use(remarkDirective)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify, { allowDangerousHtml: true })

const render = async (src: string) =>
  String(await processor.process(preprocessMarkdown(src)))

/** 涵蓋區塊種類、巢狀、邊界與非 ASCII 的語料。 */
const corpus: Record<string, string> = {
  // 基本
  '段落': 'One\n\n\nAfter',
  '兩行段落': 'One\nTwo\n\n\nThree',
  '標題': '# H1\n\n\nAfter',
  '多級標題': '### H3\n\n\nAfter',
  'Setext 標題': 'Title\n===\n\n\nAfter',
  '水平線': '---\n\n\nAfter',
  '圍欄碼塊': '```js\nconst a = 1\n```\n\n\nAfter',
  '縮排碼塊': '    code\n\n\nAfter',

  // 清單
  '無序清單': '+ A\n\n\nAfter',
  '星號清單': '* A\n\n\nAfter',
  '破折號清單': '- A\n\n\nAfter',
  '有序清單(點)': '1. A\n\n\nAfter',
  '有序清單(括號)': '1) A\n\n\nAfter',
  '有序清單保留編號': '1. A\n\n\n2. B',
  '清單項之間': '+ A\n\n\n+ B',
  '清單縮排延續': '+ A\n  more\n\n\nAfter',
  '清單惰性延續': '+ A\nlazy\n\n\nAfter',
  '巢狀清單': '+ A\n  + A1\n\n\nAfter',
  '深層巢狀清單': '+ A\n  + B\n    + C\n\n\nAfter',
  'Tab 縮排清單': '+ A\n\t+ B\n\n\nAfter',
  '待辦清單': '- [ ] task\n- [x] done\n\n\nAfter',
  '清單內含碼塊': '+ A\n\n  ```\n  x\n  ```\n\n\nAfter',
  '清單內含表格': '+ A\n\n  | a |\n  |---|\n\n\nAfter',

  // 引用
  '引用': '> q\n\n\nAfter',
  '多行引用': '> q\n> more\n\n\nAfter',
  '引用惰性延續': '> q\nlazy\n\n\nAfter',
  '巢狀引用': '> > deep\n\n\nAfter',
  '引用內清單': '> + A\n> + B\n\n\nAfter',
  '引用內表格': '> | a |\n> |---|\n\n\nAfter',
  '引用內空行': '> q1\n>\n>\n> q2\n\n\nAfter',

  // 表格
  '表格': '| a | b |\n|---|---|\n| 1 | 2 |\n\n\nAfter',
  '表格僅表頭': '| a |\n|---|\n\n\nAfter',
  '表格對齊列': '| a | b |\n|:--|--:|\n| 1 | 2 |\n\n\nAfter',
  '表格無前導管線': 'a | b\n--|--\n1 | 2\n\n\nAfter',
  '表格多列': '| a |\n|---|\n| 1 |\n| 2 |\n| 3 |\n\n\nAfter',
  '兩個表格': '| a |\n|---|\n| 1 |\n\n\n| b |\n|---|\n| 2 |',

  // 區塊之間的轉換
  '表格接清單': '| a |\n|---|\n\n\n+ B',
  '清單接表格': '+ A\n\n\n| a |\n|---|',
  '清單接引用': '+ A\n\n\n> q',
  '清單接標題': '+ A\n\n\n# H',
  '清單後標題後內容': '+ A\n# H\n\n\nAfter',
  '清單連續三段': '+ A\n\n\n+ B\n\n\n+ C',

  // 邊界
  '容器後單一空行': '+ A\n\nAfter',
  '清單結尾只有空行': '+ A\n\n\n',
  '引用結尾只有空行': '> q\n\n\n',
  '表格結尾只有空行': '| a |\n|---|\n| 1 |\n\n\n',
  '表格後直接 EOF': '| a |\n|---|\n| 1 |',
  '十個空行': 'A' + '\n'.repeat(11) + 'B',
  'CRLF 表格': '| a |\r\n|---|\r\n| 1 |\r\n\r\n\r\nAfter',
  '零寬字元當空行': '+ A\n\u200B\n\u200B\nAfter',
  'frontmatter 接表格': '---\ntitle: x\n---\n| a |\n|---|\n\n\nAfter',

  // 容易誤判
  '非表格的管線行': '| not a table\n\n\nAfter',
  '內文含管線字元': 'A | B\n\n\nAfter',
  '碼塊內含表格列': '```\n| a | b |\n|---|---|\n```\n\n\nAfter',
  '碼塊內含清單': '```\n+ A\n+ B\n```\n\n\nAfter',
  '清單標記但無空格': '+A\n\n\nAfter',
  '行內程式碼含管線': '| `a|b` | c |\n|---|---|\n| 1 | 2 |\n\n\nAfter',

  // 非 ASCII
  '中文內容': '第一行\n\n\n第二行',
  '全形空白開頭': '　　縮排\n\n\nAfter',
  '中文表格': '| 欄一 | 欄二 |\n|---|---|\n| 甲 | 乙 |\n\n\n之後',
}

const entries = Object.entries(corpus)

describe('結構不變量（全語料掃描）', () => {
  it.each(entries)('%s：表格不含 <br> 造成的幽靈儲存格', async (_name, src) => {
    const html = await render(src)
    expect(html).not.toMatch(/<td[^>]*><br>/)
    expect(html).not.toMatch(/<td[^>]*><\/td>/)
  })

  it.each(entries)('%s：<br> 不被吃進 <li>', async (_name, src) => {
    const html = await render(src)
    expect(html).not.toMatch(/<li[^>]*>[^<]*<br>/)
  })

  it.each(entries)('%s：<br> 不被吃進 <blockquote>', async (_name, src) => {
    const html = await render(src)
    expect(html).not.toMatch(/<blockquote>(?:(?!<\/blockquote>)[\s\S])*<br>/)
  })

  it.each(entries)('%s：不產生巢狀 <p>', async (_name, src) => {
    const html = await render(src)
    expect(html).not.toMatch(/<p[^>]*>\s*<p[^>]*>/)
  })

  it.each(entries)('%s：不殘留 code block 佔位符', async (_name, src) => {
    expect(await render(src)).not.toContain('CODEBLOCK_')
  })

  it.each(entries)('%s：連續空行數量完整保留', async (_name, src) => {
    // 來源若有 N(≥2) 個連續空行，輸出必須出現一段剛好 N 個連續的 <br>。
    // 空行的認定與實作一致：去掉零寬字元後為空白即算空行。
    const lines = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    const gaps: number[] = []
    let run = 0
    for (const line of lines) {
      if (line.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '').trim() === '') {
        run++
      } else {
        if (run >= 2) gaps.push(run)
        run = 0
      }
    }
    if (run >= 2) gaps.push(run)
    if (gaps.length === 0) return

    const html = await render(src)
    const runs = (html.match(/(?:<br>)+/g) ?? []).map(r => r.split('<br>').length - 1)
    for (const gap of gaps) {
      expect(runs, `來源有 ${gap} 個連續空行，輸出的 <br> 連續段為 ${JSON.stringify(runs)}`)
        .toContain(gap)
    }
  })
})
