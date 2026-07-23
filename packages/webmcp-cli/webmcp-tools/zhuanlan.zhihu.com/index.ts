/**
 * zhuanlan.zhihu.com 工具适配层（知乎专栏文章编辑器）
 *
 * 与其它域名一致：在页面内注册并执行 create_article / get_article_info / publish_current_draft。
 */
import { decodeBase64Content, markdownToHtml, stripLeadingH1 } from './markdown'

/** 知乎专栏编辑器：新建 / 编辑草稿 */
function isZhihuWritePage(): boolean {
  return /^https:\/\/zhuanlan\.zhihu\.com\/(write|p\/\d+\/edit)/.test(location.href)
}

/** 触发 React 双向绑定的 input 赋值 */
function setNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  )?.set
  if (setter) {
    setter.call(input, value)
  } else {
    input.value = value
  }
  input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function findTitleInput(): HTMLTextAreaElement | HTMLInputElement | null {
  return (
    (document.querySelector('textarea[placeholder*="标题"]') as HTMLTextAreaElement | null) ||
    (document.querySelector('.WriteIndex-titleInput textarea') as HTMLTextAreaElement | null) ||
    (document.querySelector('.WriteIndex-titleInput input') as HTMLInputElement | null)
  )
}

/** 查找正文 Draft.js 编辑器 */
function findContentEditor(): HTMLElement | null {
  const draftEditor = document.querySelector('.public-DraftEditor-content') as HTMLElement | null
  if (draftEditor) return draftEditor

  const candidates = Array.from(
    document.querySelectorAll('[contenteditable="true"], [contenteditable]')
  ) as HTMLElement[]

  const visible = candidates.filter(el => {
    const rect = el.getBoundingClientRect()
    return rect.width > 100 && rect.height > 80 && el.offsetParent !== null
  })

  return visible[0] || candidates[0] || null
}

function getEditorText(editor: HTMLElement): string {
  return (editor.innerText || editor.textContent || '').trim()
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 通过 ClipboardEvent 将 HTML 粘贴进 Draft.js（与 CSDN 页面内粘贴策略对齐） */
async function pasteHtmlToDraftEditor(editor: HTMLElement, html: string): Promise<void> {
  editor.focus()
  document.execCommand('selectAll')
  document.execCommand('delete')
  await delay(200)

  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const dt = new DataTransfer()
  dt.setData('text/html', html)
  dt.setData('text/plain', plain)
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true
    })
  )
  await delay(800)

  const probe = plain.slice(0, 15)
  let text = getEditorText(editor)
  const normalizedText = text.replace(/\s+/g, '')
  const normalizedProbe = probe.replace(/\s+/g, '')
  if (!normalizedProbe || !normalizedText.includes(normalizedProbe)) {
    // 降级：insertHTML
    editor.focus()
    document.execCommand('selectAll')
    document.execCommand('delete')
    const inserted = document.execCommand('insertHTML', false, html)
    await delay(500)
    text = getEditorText(editor)
    if (!inserted || !(text.replace(/\s+/g, '').includes(normalizedProbe))) {
      throw new Error('正文填写失败（Markdown 转 HTML 粘贴未生效），请刷新页面后重试')
    }
  }
}

/** 在发布面板中添加一个话题 */
async function addTopic(topic: string, scope: ParentNode): Promise<void> {
  const addTopicBtn = Array.from(scope.querySelectorAll('button')).find(
    btn => /添加话题|添加专栏话题/.test(btn.textContent?.trim() || '')
  ) as HTMLButtonElement | undefined

  if (addTopicBtn) {
    addTopicBtn.click()
    await delay(500)
  }

  const topicInput = scope.querySelector(
    'input[placeholder*="搜索话题"], input[placeholder*="话题"], input[placeholder*="搜索"]'
  ) as HTMLInputElement | null

  if (!topicInput) {
    throw new Error('未找到话题搜索输入框，请确认发布设置面板已打开')
  }

  topicInput.focus()
  setNativeInputValue(topicInput, topic)
  await delay(1500)

  const topicItems = Array.from(
    document.querySelectorAll(
      '.TopicSelector-item, .TopicSelector-listItem, [class*="TopicSelector"] [class*="item"], [class*="Topic"] li'
    )
  ) as HTMLElement[]

  let topicItem = topicItems.find(el => el.textContent?.trim() === topic && el.offsetParent !== null)
  if (!topicItem) {
    topicItem = topicItems.find(el => el.textContent?.includes(topic) && el.offsetParent !== null)
  }
  if (!topicItem) {
    topicItem = topicItems.find(el => el.offsetParent !== null)
  }
  if (!topicItem) {
    const foundTexts = topicItems.map(e => e.textContent?.trim()).filter(Boolean).join(', ')
    throw new Error(`话题下拉选项中未找到匹配项: ${topic}。当前选项: [${foundTexts}]`)
  }

  topicItem.click()
  await delay(400)
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] zhuanlan.zhihu.com: document.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_zhuanlanzhihucom) {
  try {
    mcp.registerTool({
      name: 'create_article',
      title: '填写知乎专栏文章',
      description:
        '接收文章的标题和 Markdown 正文，填写到知乎专栏编辑器。正文会在页面内转换为 HTML 并粘贴到 Draft.js 编辑器。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文章标题，必填，建议不超过 100 字，不允许有特殊符号影响命令行参数解析'
          },
          content: {
            type: 'string',
            description: '文章 Markdown 正文的 Base64 编码字符串，必填。页面内会转换为 HTML 后粘贴到 Draft.js 编辑器。'
          }
        },
        required: ['title', 'content']
      },
      execute: async ({ title, content }: { title: string; content: string }) => {
        if (!title?.trim()) {
          throw new Error('参数 title 不能为空')
        }
        if (!content?.trim()) {
          throw new Error('参数 content 不能为空')
        }
        if (!isZhihuWritePage()) {
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

        const titleInput = findTitleInput()
        if (!titleInput) {
          throw new Error('未找到标题输入框，请确认编辑器页面已完全加载')
        }
        setNativeInputValue(titleInput, title.trim())
        if (titleInput.value.trim() !== title.trim()) {
          throw new Error('标题填写失败，请刷新页面后重试')
        }

        const editor = findContentEditor()
        if (!editor) {
          throw new Error('未找到正文编辑器，请确认编辑器页面已完全加载')
        }

        await delay(300)
        await pasteHtmlToDraftEditor(editor, markdownToHtml(markdown))

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '文章标题和正文已成功填写到知乎专栏编辑器（Markdown 已转为富文本），草稿将自动保存',
              title: title.trim(),
              contentLength: markdown.length
            })
          }]
        }
      }
    })

    mcp.registerTool({
      name: 'get_article_info',
      title: '获取当前知乎文章信息',
      description: '在知乎专栏编辑器页面中，获取当前草稿的标题和正文内容，以便 AI 分析其主题以选择合适的话题标签。',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        const titleInput = findTitleInput()
        const title = titleInput ? titleInput.value.trim() : ''

        const editor = findContentEditor()
        const content = editor ? getEditorText(editor) : ''

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              title,
              contentLength: content.length,
              content
            })
          }]
        }
      }
    })

    mcp.registerTool({
      name: 'publish_current_draft',
      title: '一键发布当前知乎草稿',
      description: '在知乎专栏编辑器页面中，自动打开发布设置、添加话题并确认发布。注意：调用此工具前，AI 必须先使用 get_article_info 了解当前文章内容，并基于文章内容智能推断最合适的话题，切勿盲目使用默认值。',
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: '文章话题名称。AI 应先读取当前文章正文内容，提炼出最相关的知乎话题，例如 "前端"、"Vue.js"、"人工智能"、"编程" 等，默认值为 "编程"'
          },
          topics: {
            type: 'array',
            items: { type: 'string' },
            description: '可选，额外话题列表（最多再添加 2 个），按相关性从高到低排列'
          }
        },
        required: ['topic']
      },
      execute: async ({
        topic = '编程',
        topics = []
      }: {
        topic?: string
        topics?: string[]
      }) => {
        if (!isZhihuWritePage()) {
          throw new Error('未处于知乎专栏编辑器页面，请先 tabs switch 到编辑器标签页后再发布')
        }

        if (!topic?.trim()) {
          throw new Error('参数 topic 不能为空')
        }

        const allTopics = [topic.trim(), ...topics.map(t => t.trim()).filter(Boolean)]
        const uniqueTopics = [...new Set(allTopics)].slice(0, 3)

        const headerButtons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
        let publishEntryBtn =
          headerButtons.find(btn => btn.textContent?.trim() === '发布' && btn.offsetParent !== null) ||
          headerButtons.find(btn => btn.textContent?.trim() === '发布设置' && btn.offsetParent !== null)

        if (!publishEntryBtn) {
          publishEntryBtn = document.querySelector('.WriteIndex-submitButton, .PublishPanel-trigger') as HTMLButtonElement | null
        }
        if (!publishEntryBtn) {
          throw new Error('未找到「发布」或「发布设置」按钮，请确认已处于文章编辑器页面且页面已完全加载')
        }

        publishEntryBtn.click()
        await delay(1200)

        const dialogScope =
          document.querySelector('.PublishPanel, .Modal, [role="dialog"], .WriteIndex-main') || document

        for (const t of uniqueTopics) {
          await addTopic(t, dialogScope)
        }

        await delay(500)

        let confirmBtn =
          (dialogScope.querySelector('.PublishPanel-submitButton') as HTMLButtonElement | null) ||
          Array.from(dialogScope.querySelectorAll('button')).find(
            btn => btn.textContent?.trim() === '发布' && btn.offsetParent !== null
          ) as HTMLButtonElement | undefined

        if (!confirmBtn) {
          const allPublishBtns = headerButtons.filter(btn => btn.textContent?.trim() === '发布' && btn.offsetParent !== null)
          confirmBtn = allPublishBtns[allPublishBtns.length - 1]
        }
        if (!confirmBtn) {
          throw new Error('未找到确认「发布」按钮')
        }

        confirmBtn.click()

        const publishResult = await Promise.race([
          new Promise<'url_changed'>((resolve) => {
            const startHref = location.href
            const check = setInterval(() => {
              if (/zhuanlan\.zhihu\.com\/p\/\d+/.test(location.href) && location.href !== startHref) {
                clearInterval(check)
                resolve('url_changed')
              }
            }, 300)
            setTimeout(() => clearInterval(check), 15000)
          }),
          new Promise<'panel_closed'>((resolve) => {
            const check = setInterval(() => {
              const panel = document.querySelector('.PublishPanel, .Modal[role="dialog"]')
              if (!panel || (panel as HTMLElement).offsetParent === null) {
                clearInterval(check)
                resolve('panel_closed')
              }
            }, 300)
            setTimeout(() => clearInterval(check), 15000)
          }),
          new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 15000))
        ])

        if (publishResult === 'timeout') {
          const panel = document.querySelector('.PublishPanel, .Modal[role="dialog"]')
          if (panel && (panel as HTMLElement).offsetParent !== null) {
            throw new Error('发布文章失败，发布面板未关闭，请检查话题或其他必填项是否正确填写')
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `自动发布流程已触发，话题: ${uniqueTopics.join(', ')}，发布信号: ${publishResult}`,
              url: location.href
            })
          }]
        }
      }
    })

    ;(window as any).__webmcptools_zhuanlanzhihucom = true
    console.log('[webmcp-tools] zhuanlan.zhihu.com 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] zhuanlan.zhihu.com 工具注册失败:', e.message)
  }
}
