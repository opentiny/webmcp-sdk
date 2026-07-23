import { describe, expect, it } from 'vitest'
import { markdownToHtml, stripLeadingH1 } from '../webmcp-tools/zhuanlan.zhihu.com/markdown'

describe('zhuanlan.zhihu.com markdownToHtml', () => {
  it('转义 Markdown 原始 HTML，避免脚本透传', () => {
    const html = markdownToHtml('你好<script>alert(1)</script>世界')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('危险协议链接被降级为 #', () => {
    const html = markdownToHtml('[x](javascript:alert(1))')
    expect(html).toContain('href="#"')
    expect(html).not.toContain('javascript:')
  })

  it('保留常规 Markdown 格式', () => {
    const html = markdownToHtml('**粗体** 与 `code`')
    expect(html).toMatch(/<(strong|b)>粗体<\/(strong|b)>/)
    expect(html).toContain('<code>code</code>')
  })

  it('stripLeadingH1 去掉首个标题', () => {
    expect(stripLeadingH1('# 标题\n\n正文')).toBe('正文')
  })
})
