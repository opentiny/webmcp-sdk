/**
 * juejin.cn 工具适配层
 */

type ToolResult = {
  success: true
  message: string
  title: string
  contentLength: number
  editor: 'codemirror5' | 'codemirror6'
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] juejin.cn: navigator.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_juejincn) {
  try {
    // 该函数在每次 getBrowserState 之前调用，用于设置当前网站的黑白名单
    //  掘金的草稿箱使用div开发的列表， 无法统计为索引。  这样处理后就可以了。
    window.__webmcpcli_beforeGetBrowserState = () => {
      window.__webmcpcli_interactiveWhitelist.length = 0
      const whites = document.querySelectorAll('.link[target]')
      window.__webmcpcli_interactiveWhitelist.push(...whites)
    }

    // 注册创建文章工具
    mcp.registerTool({
      name: 'create_article',
      title: '发布新文章',
      description: '接收文章的标题和正文，将它们填写到网页中。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文章标题，必填， 建议不超过15个字，不允许有特殊符号影响命令行参数解析'
          },
          content: {
            type: 'string',
            description: '文章内容的base64编码后的字符串，必填。'
          }
        },
        required: ['title', 'content']
      },
      execute: async ({ title, content }: { title: string; content: string }): Promise<ToolResult> => {
        if (!title?.trim()) {
          throw new Error('参数 title 不能为空')
        }
        if (!content?.trim()) {
          throw new Error('参数 content 不能为空')
        }

        if (!location.href.startsWith('https://juejin.cn/editor/drafts/new')) {
          throw new Error('当前页面不是掘金新建文章编辑器，请先打开 https://juejin.cn/editor/drafts/new?v=2')
        }

        let decodeContent: string
        try {
          decodeContent = decodeURIComponent(escape(atob(content)))
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        const titleInput = document.querySelector('.edit-draft .header .title-input') as HTMLInputElement | null
        if (!titleInput) {
          throw new Error('未找到标题输入框，请确认编辑器页面已完全加载')
        }

        titleInput.focus()
        titleInput.value = title
        titleInput.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: title
          })
        )
        titleInput.dispatchEvent(new Event('change', { bubbles: true }))
        titleInput.blur()

        if (titleInput.value.trim() !== title.trim()) {
          throw new Error('标题填写失败，请刷新页面后重试')
        }

        let editor: ToolResult['editor'] | null = null

        const cm5El = document.querySelector('.edit-draft .CodeMirror') as
          | (HTMLElement & { CodeMirror?: { setValue: (v: string) => void; getValue: () => string } })
          | null
        if (cm5El?.CodeMirror) {
          cm5El.CodeMirror.setValue(decodeContent)
          if (cm5El.CodeMirror.getValue() !== decodeContent) {
            throw new Error('正文填写失败（CodeMirror 5），请刷新页面后重试')
          }
          editor = 'codemirror5'
        } else {
          const cm6View = (document.querySelector('.cm-editor') as any)?.cmView?.view
          if (cm6View) {
            cm6View.dispatch({
              changes: { from: 0, to: cm6View.state.doc.length, insert: decodeContent }
            })
            if (cm6View.state.doc.toString() !== decodeContent) {
              throw new Error('正文填写失败（CodeMirror 6），请刷新页面后重试')
            }
            editor = 'codemirror6'
          }
        }

        if (!editor) {
          throw new Error('未找到正文编辑器（CodeMirror），请确认编辑器页面已完全加载')
        }

        return {
          success: true,
          message: '文章标题和正文已成功填写到掘金编辑器，草稿将自动保存',
          title: title.trim(),
          contentLength: decodeContent.length,
          editor
        }
      }
    })

    // 注册获取当前文章信息工具
    mcp.registerTool({
      name: 'get_article_info',
      title: '获取当前文章信息',
      description: '在文章编辑器页面中，获取当前草稿的标题和正文内容，以便 AI 分析其主题以选择合适的分类标签，或总结出 50~100 字的摘要。',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      execute: async () => {
        const titleInput = document.querySelector('.edit-draft .header .title-input') as HTMLInputElement | null
        const title = titleInput ? titleInput.value : ''

        const cm5El = document.querySelector('.edit-draft .CodeMirror') as
          | (HTMLElement & { CodeMirror?: { getValue: () => string } })
          | null
        let content = ''
        if (cm5El?.CodeMirror) {
          content = cm5El.CodeMirror.getValue()
        } else {
          const cm6View = (document.querySelector('.cm-editor') as any)?.cmView?.view
          if (cm6View) {
            content = cm6View.state.doc.toString()
          }
        }

        return {
          success: true,
          title,
          content
        }
      }
    })

    // 注册发布当前草稿工具
    mcp.registerTool({
      name: 'publish_current_draft',
      title: '一键发布当前草稿',
      description: '在文章编辑器页面中，自动点击发布、选择分类、添加标签并确认发布。注意：调用此工具前，AI 必须先读取或了解当前文章的标题和正文内容，并基于文章内容智能推断并选择最合适的分类与标签，切勿盲目使用默认值。',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: '分类名称。AI 应先读取当前文章正文内容判断出其归属的技术领域，例如 "前端"、"后端"、"Android"、"iOS"、"人工智能"、"开发工具"、"代码人生" 等，默认值为 "前端"'
          },
          tag: {
            type: 'string',
            description: '标签名称。AI 应先读取当前文章正文内容，提炼出其具体涉及的核心技术栈标签，例如 "Vue.js"、"React"、"JavaScript"、"Python"、"Go" 等，默认值为 "Vue.js"'
          },
          summary: {
            type: 'string',
            description: '文章摘要，必填，字数必须在 50 到 100 字之间。调用此工具前，AI 必须先使用 get_article_info 获取文章正文，并自主总结出摘要后传入此参数。'
          }
        },
        required: ['summary']
      },
      execute: async ({ category = '前端', tag = 'Vue.js', summary }: { category?: string; tag?: string; summary: string }) => {
        // 1. 找到“发布”按钮并点击
        const publishBtn = Array.from(document.querySelectorAll('button')).find(
          e => e.textContent?.trim() === '发布'
        ) as HTMLButtonElement | null
        if (!publishBtn) {
          throw new Error('未找到“发布”按钮，请确认已处于文章编辑器页面')
        }
        publishBtn.click()

        // 等待弹窗渲染
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 2. 选择分类
        const categoryButtons = Array.from(
          document.querySelectorAll('.category-list .item, .category-list .category-item, .category-item, .item')
        )
        let catBtn = categoryButtons.find(e => e.textContent?.includes(category))
        if (!catBtn) {
          catBtn = Array.from(document.querySelectorAll('*')).find(
            e => e.textContent === category && (e as HTMLElement).tagName !== 'SCRIPT'
          )
        }
        if (!catBtn) {
          throw new Error(`未找到分类按钮: ${category}`)
        }
        ;(catBtn as HTMLElement).click()

        // 3. 搜索标签
        const tagLabel = Array.from(document.querySelectorAll('span, div, label, .label')).find(
          e => e.textContent?.includes('添加标签')
        )
        if (!tagLabel) {
          throw new Error('未找到“添加标签”的表单项')
        }
        const parent = tagLabel.closest('.form-item, .margin-bottom, .entry-form-item, div')
        const input = parent ? (parent.querySelector('input') as HTMLInputElement | null) : null
        if (!input) {
          throw new Error('未找到标签输入框')
        }

        input.focus()
        input.value = tag
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))

        // 等待下拉选项渲染
        await new Promise(resolve => setTimeout(resolve, 1500))

        // 选择下拉项
        const items = Array.from(
          document.querySelectorAll(
            '.byte-select-option, .select-option, .option, .item, .dropdown-item, .byte-select__option, .byte-select-option-wrapper'
          )
        )
        const tagItem = items.find(e => e.textContent?.trim() === tag) as HTMLElement | null
        if (!tagItem) {
          throw new Error(`标签下拉选项中未找到匹配的: ${tag}`)
        }
        tagItem.click()

        // 3.1 对传入的摘要进行长度自适应及填入
        let finalSummary = summary || ''
        if (finalSummary.length < 50) {
          while (finalSummary.length < 50) {
            finalSummary += '。这是关于本文内容的详细介绍，欢迎阅读全文了解更多精彩的技术细节与实践经验分享。'
          }
        }
        if (finalSummary.length > 100) {
          finalSummary = finalSummary.slice(0, 97) + '...'
        }

        // 3.2 找到并填写摘要框
        const summaryTextarea = document.querySelector('.summary-textarea, textarea[placeholder*="摘要"], textarea[placeholder*="文章的摘要"]') as HTMLTextAreaElement | null
        if (summaryTextarea) {
          summaryTextarea.focus()
          summaryTextarea.value = finalSummary
          summaryTextarea.dispatchEvent(new Event('input', { bubbles: true }))
          summaryTextarea.dispatchEvent(new Event('change', { bubbles: true }))
          summaryTextarea.blur()
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // 3.3 点击标题关闭下拉弹窗（避免遮挡“确定并发布”按钮）
        const titleClose = Array.from(document.querySelectorAll('*')).find(
          e => e.textContent?.trim() === '发布文章'
        ) as HTMLElement | null
        if (titleClose) {
          titleClose.click()
        }
        await new Promise(resolve => setTimeout(resolve, 500))

        // 4. 点击确定并发布
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(
          e => e.textContent?.trim() === '确定并发布'
        ) as HTMLButtonElement | null
        if (!confirmBtn) {
          throw new Error('未找到“确定并发布”按钮')
        }
        confirmBtn.click()

        // 停留 500 毫秒后验证发布状态
        await new Promise(resolve => setTimeout(resolve, 500))

        // 判断发布文章的弹出框是否关闭
        const popupTitle = Array.from(document.querySelectorAll('*')).find(
          e => e.textContent?.trim() === '发布文章' && (e as HTMLElement).offsetParent !== null
        )
        if (popupTitle) {
          throw new Error('发布文章失败，弹出框未关闭，请检查分类、标签或其他必填项是否正确填写')
        }

        return {
          success: true,
          message: `自动发布流程已触发，分类: ${category}, 标签: ${tag}`
        }
      }
    })

    ;(window as any).__webmcptools_juejincn = true
    console.log('[webmcp-tools] juejin.cn 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] juejin.cn 工具注册失败:', e.message)
  }
}
