import { Marked } from 'marked'

/** 移除正文首个 H1（标题已通过 title 参数单独填写） */
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+[^\n]*\n+/, '')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 仅允许常见安全协议，避免 javascript: 等 XSS */
function sanitizeHref(href: string | null | undefined): string {
  if (!href) return '#'
  const trimmed = href.trim()
  if (/^(https?:|mailto:|#|\/)/i.test(trimmed)) return trimmed
  return '#'
}

/**
 * Markdown → HTML（知乎 Draft.js 编辑器兼容）
 * - 转义 Markdown 中的原始 HTML，避免 marked 透传脚本
 * - 链接/图片仅保留 http(s)/mailto/相对路径
 */
export function markdownToHtml(markdown: string): string {
  const marked = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      html({ text }) {
        return escapeHtml(text)
      },
      code({ text, lang }) {
        const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : ''
        return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>`
      },
      codespan({ text }) {
        return `<code>${escapeHtml(text)}</code>`
      },
      link({ href, title, text }) {
        const safeHref = escapeHtml(sanitizeHref(href))
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
        return `<a href="${safeHref}"${titleAttr}>${text}</a>`
      },
      image({ href, title, text }) {
        const safeHref = escapeHtml(sanitizeHref(href))
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
        return `<img src="${safeHref}" alt="${escapeHtml(text || '')}"${titleAttr}>`
      }
    }
  })

  return marked.parse(markdown) as string
}

/** Base64 → UTF-8（页面内，与掘金等站点一致） */
export function decodeBase64Content(content: string): string {
  return decodeURIComponent(escape(atob(content)))
}
