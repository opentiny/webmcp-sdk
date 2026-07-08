/**
 * zhuanlan.zhihu.com 工具适配层（知乎专栏文章编辑器）
 */

type ToolResult = {
  success: true
  message: string
  title: string
  contentLength: number
}

/** 知乎专栏编辑器：新建 / 编辑草稿 */
function isZhihuWritePage(): boolean {
  return /^https:\/\/zhuanlan\.zhihu\.com\/(write|p\/\d+\/edit)/.test(location.href)
}

/** Base64 解码（兼容中文） */
function decodeBase64Content(content: string): string {
  return decodeURIComponent(escape(atob(content)))
}

/** 触发 React/Vue 双向绑定的 input 赋值 */
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

/** 查找正文 Draft.js / ProseMirror 编辑器 */
function findContentEditor(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll('.ProseMirror, [contenteditable="true"], [contenteditable]')
  ) as HTMLElement[]

  const visible = candidates.filter(el => {
    const rect = el.getBoundingClientRect()
    return rect.width > 100 && rect.height > 80 && el.offsetParent !== null
  })

  return visible[0] || candidates[0] || null
}

/** 通过 ClipboardEvent 向 Draft.js 编辑器批量粘贴正文 */
function pasteTextToEditor(editor: HTMLElement, text: string): boolean {
  editor.focus()

  try {
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    const pasted = editor.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    )
    if (pasted) return true
  } catch {
    // 部分浏览器不支持构造 ClipboardEvent，走降级方案
  }

  try {
    const selection = window.getSelection()
    if (selection) {
      const range = document.createRange()
      range.selectNodeContents(editor)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    return document.execCommand('insertText', false, text)
  } catch {
    return false
  }
}

function getEditorText(editor: HTMLElement): string {
  return (editor.innerText || editor.textContent || '').trim()
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
      description: '接收文章的标题和正文，将它们填写到知乎专栏编辑器中。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文章标题，必填，建议不超过 100 字，不允许有特殊符号影响命令行参数解析'
          },
          content: {
            type: 'string',
            description: '文章内容的 base64 编码后的字符串，必填。支持 Markdown 纯文本，将通过粘贴方式填入 Draft.js 编辑器。'
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
          throw new Error(
            '当前页面不是知乎专栏编辑器，请先打开 https://zhuanlan.zhihu.com/write'
          )
        }

        let decodeContent: string
        try {
          decodeContent = decodeBase64Content(content)
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        const titleInput = findTitleInput()
        if (!titleInput) {
          throw new Error('未找到标题输入框，请确认编辑器页面已完全加载')
        }

        titleInput.focus()
        setNativeInputValue(titleInput, title)
        titleInput.blur()

        if (titleInput.value.trim() !== title.trim()) {
          throw new Error('标题填写失败，请刷新页面后重试')
        }

        await delay(500)

        const editor = findContentEditor()
        if (!editor) {
          throw new Error('未找到正文编辑器（Draft.js），请确认编辑器页面已完全加载')
        }

        editor.click()
        await delay(300)

        const pasted = pasteTextToEditor(editor, decodeContent)
        if (!pasted) {
          throw new Error('正文填写失败（Draft.js 粘贴未生效），请刷新页面后重试')
        }

        await delay(500)

        const written = getEditorText(editor)
        if (!written && decodeContent.trim()) {
          throw new Error('正文填写失败，编辑器内容为空，请刷新页面后重试')
        }

        const result: ToolResult = {
          success: true,
          message: '文章标题和正文已成功填写到知乎专栏编辑器，草稿将自动保存',
          title: title.trim(),
          contentLength: decodeContent.length
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result)
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

        // 1. 点击顶部「发布」或「发布设置」打开发布面板
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

        // 2. 依次添加话题
        for (const t of uniqueTopics) {
          await addTopic(t, dialogScope)
        }

        await delay(500)

        // 3. 点击确认发布（面板内的「发布」按钮，优先匹配 PublishPanel-submitButton）
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
