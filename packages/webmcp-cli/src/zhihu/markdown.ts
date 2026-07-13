import { Marked } from 'marked'

/** 移除正文首个 H1（标题已通过 title 参数单独填写） */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+[^\n]*\n+/, '')
}

/** Markdown → HTML（知乎 Draft.js 编辑器兼容） */
export function markdownToHtml(markdown: string): string {
  const marked = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      code({ text, lang }) {
        const langClass = lang ? ` class="language-${lang}"` : ''
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return `<pre><code${langClass}>${escaped}</code></pre>`
      },
      codespan({ text }) {
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return `<code>${escaped}</code>`
      }
    }
  })

  return marked.parse(markdown) as string
}

export function decodeBase64Content(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8')
}

/** 知乎专栏编辑器 URL 匹配 */
export const ZHIHU_WRITE_PAGE_RE = /^https:\/\/zhuanlan\.zhihu\.com\/(write|p\/\d+\/edit)/

export function isZhihuWriteUrl(url: string): boolean {
  return ZHIHU_WRITE_PAGE_RE.test(url)
}
