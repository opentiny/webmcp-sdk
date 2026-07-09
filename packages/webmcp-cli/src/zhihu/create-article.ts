import type { Page } from 'puppeteer-core'
import os from 'os'
import {
  decodeBase64Content,
  isZhihuWriteUrl,
  markdownToHtml,
  stripLeadingH1
} from './markdown'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getPasteModifier(): 'Meta' | 'Control' {
  return os.platform() === 'darwin' ? 'Meta' : 'Control'
}

/** 通过 Puppeteer 设置标题 */
async function fillTitle(page: Page, title: string): Promise<void> {
  await page.evaluate((titleText) => {
    const input =
      (document.querySelector('textarea[placeholder*="标题"]') as HTMLTextAreaElement | null) ||
      (document.querySelector('.WriteIndex-titleInput textarea') as HTMLTextAreaElement | null) ||
      (document.querySelector('.WriteIndex-titleInput input') as HTMLInputElement | null)

    if (!input) throw new Error('未找到标题输入框，请确认编辑器页面已完全加载')

    const setter = Object.getOwnPropertyDescriptor(
      input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set

    if (setter) {
      setter.call(input, titleText)
    } else {
      input.value = titleText
    }
    input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: titleText }))
    input.dispatchEvent(new Event('change', { bubbles: true }))

    if (input.value.trim() !== titleText.trim()) {
      throw new Error('标题填写失败，请刷新页面后重试')
    }
  }, title)
}

/** 通过临时页面复制 HTML 到系统剪贴板，再键盘粘贴到 Draft.js 编辑器 */
async function pasteHtmlToEditor(page: Page, html: string): Promise<void> {
  const browser = page.browser()
  const tempPage = await browser.newPage()
  const modifier = getPasteModifier()

  try {
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`
    await tempPage.setContent(fullHtml, { waitUntil: 'domcontentloaded' })
    await delay(300)

    await tempPage.click('body')
    await tempPage.keyboard.down(modifier)
    await tempPage.keyboard.press('KeyA')
    await tempPage.keyboard.up(modifier)
    await delay(100)
    await tempPage.keyboard.down(modifier)
    await tempPage.keyboard.press('KeyC')
    await tempPage.keyboard.up(modifier)
    await delay(300)
  } finally {
    await tempPage.close()
  }

  await page.bringToFront()
  await page.waitForSelector('.public-DraftEditor-content', { timeout: 10000 })
  await page.click('.public-DraftEditor-content')
  await delay(200)

  await page.keyboard.down(modifier)
  await page.keyboard.press('KeyA')
  await page.keyboard.up(modifier)
  await delay(100)
  await page.keyboard.press('Backspace')
  await delay(200)

  await page.keyboard.down(modifier)
  await page.keyboard.press('KeyV')
  await page.keyboard.up(modifier)

  await delay(1500)

  // 用正文纯文本前 15 字作为探针，验证粘贴完整性
  const probe = html.replace(/<[^>]+>/g, '').trim().slice(0, 15)
  const verifyResult = await page.evaluate((probeText) => {
    const editor = document.querySelector('.public-DraftEditor-content') as HTMLElement | null
    if (!editor) return { ok: false, reason: 'no editor' }
    const text = (editor.innerText || '').trim()
    if (!text) return { ok: false, reason: 'empty' }
    const inner = editor.innerHTML
    const hasRichFormat =
      inner.includes('data-text') ||
      /font-weight:\s*bold|font-style:\s*italic|code-block|blockquote/i.test(inner)
    const normalizedText = text.replace(/\s+/g, '')
    const normalizedProbe = probeText.replace(/\s+/g, '')
    const hasProbe = normalizedText.includes(normalizedProbe)
    return {
      ok: text.length > 20 && hasProbe && (hasRichFormat || text.length > 50),
      reason: !hasProbe ? 'probe mismatch' : !hasRichFormat && text.length <= 50 ? 'no rich format' : undefined
    }
  }, probe)

  if (!verifyResult.ok) {
    throw new Error(
      `正文填写失败（Markdown 转 HTML 粘贴未生效）${verifyResult.reason ? `: ${verifyResult.reason}` : ''}`
    )
  }
}

export async function zhihuCreateArticle(
  page: Page,
  args: { title?: string; content?: string }
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { title, content } = args

  if (!title?.trim()) throw new Error('参数 title 不能为空')
  if (!content?.trim()) throw new Error('参数 content 不能为空')

  const url = page.url()
  if (!isZhihuWriteUrl(url)) {
    throw new Error('当前页面不是知乎专栏编辑器，请先打开 https://zhuanlan.zhihu.com/write')
  }

  let markdown: string
  try {
    markdown = stripLeadingH1(decodeBase64Content(content))
  } catch {
    throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
  }

  if (!markdown.trim()) {
    throw new Error('正文内容为空，请检查 Markdown 文件')
  }

  const html = markdownToHtml(markdown)

  await fillTitle(page, title.trim())
  await delay(500)
  await pasteHtmlToEditor(page, html)

  const result = {
    success: true,
    message: '文章标题和正文已成功填写到知乎专栏编辑器（Markdown 已转为富文本），草稿将自动保存',
    title: title.trim(),
    contentLength: markdown.length
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }]
  }
}
