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

/** 掘金编辑器页面：/editor/drafts/new 会在填写标题后自动跳转为 /editor/drafts/{id} */
function isJuejinDraftEditorPage(): boolean {
  if (!/^https:\/\/juejin\.cn\/editor\/drafts\//.test(location.href)) {
    return false
  }
  return !!document.querySelector('.edit-draft .header .title-input')
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] juejin.cn: document.modelContext.registerTool 未就绪，跳过注入')
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

        if (!isJuejinDraftEditorPage()) {
          throw new Error(
            '当前页面不是掘金文章编辑器（新建或草稿页均可），请先打开 https://juejin.cn/editor/drafts/new?v=2'
          )
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
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '文章标题和正文已成功填写到掘金编辑器，草稿将自动保存',
              title: title.trim(),
              contentLength: decodeContent.length,
              editor
            })
          }]
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
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              title: title.trim(),
              contentLength: content.length,
              content
            })
          }]
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
        if (!isJuejinDraftEditorPage()) {
          throw new Error('未处于掘金文章编辑器页面，请先 tabs switch 到编辑器标签页后再发布')
        }

        // 1. 在编辑器区域内找到“发布”按钮并点击
        const editorRoot = document.querySelector('.edit-draft') ?? document
        const publishBtn = Array.from(editorRoot.querySelectorAll('button')).find(
          e => e.textContent?.trim() === '发布'
        ) as HTMLButtonElement | null
        if (!publishBtn) {
          throw new Error('未找到“发布”按钮，请确认已处于文章编辑器页面且页面已完全加载')
        }
        publishBtn.click()

        // 等待弹窗渲染
        await new Promise(resolve => setTimeout(resolve, 1000))

        const dialogScope = document.querySelector('.panel, .modal, [role="dialog"]') || document

        // 2. 选择分类：掘金真实 DOM 结构是 .category-list > div.item（文本两侧有空格，用 trim 处理）
        const candidateSelectors = [
          '.category-list .item',      // 掘金：直接命中
          '.category-list li', '.category-list button', '.category-list [role="button"]',
          '.category-item', '[class*="category"] li', '[class*="category"] span'
        ]
        let catBtn: Element | undefined
        for (const sel of candidateSelectors) {
          catBtn = Array.from(dialogScope.querySelectorAll(sel)).find(
            e => e.textContent?.trim() === category
          )
          if (catBtn) break
        }
        // 降级：全文本精确匹配所有可见 div/span 元素
        if (!catBtn) {
          catBtn = Array.from(dialogScope.querySelectorAll('div, span, li, button')).find(e => {
            const el = e as HTMLElement
            return el.textContent?.trim() === category && el.offsetParent !== null
          })
        }
        if (!catBtn) {
          throw new Error(`未找到分类按钮: ${category}`)
        }
        ;(catBtn as HTMLElement).click()

        // 3. 搜索标签：掘金真实输入框类名为 .byte-select__input（没有 placeholder 属性），优先用类名查找
        const input = (
          dialogScope.querySelector('.byte-select__input, input[placeholder*="搜索添加标签"], input[placeholder*="添加标签"], input[placeholder*="标签"]')
        ) as HTMLInputElement | null
        if (!input) {
          throw new Error('未找到标签输入框')
        }

        input.focus()
        // 使用 InputEvent 触发 Vue/React 响应式监听（普通 Event 无法被框架感知）
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, tag)
        } else {
          input.value = tag
        }
        input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: tag }))
        input.dispatchEvent(new Event('change', { bubbles: true }))

        // 等待异步搜索接口返回并渲染下拉选项（增大至 2000ms 防止网络慢丢失结果）
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 选择下拉项：使用 ByteDance/掘金特有的下拉选项类名，同时也保留 .item 防止类名混用
        const tagDropdownItems = Array.from(
          document.querySelectorAll(
            '.byte-select-option, .byte-select__option, .byte-select-option-wrapper, .select-option, .dropdown-item, .item'
          )
        )
        let tagItem = tagDropdownItems.find(e => e.textContent?.trim() === tag) as HTMLElement | null
        // 降级：在所有可见的 li / [role=option] 中查找精确文本匹配
        if (!tagItem) {
          tagItem = Array.from(document.querySelectorAll('li, [role="option"]')).find(e => {
            const el = e as HTMLElement
            return el.textContent?.trim() === tag && el.offsetParent !== null
          }) as HTMLElement | null
        }
        if (!tagItem) {
          const foundTexts = tagDropdownItems.map(e => e.textContent?.trim()).join(', ')
          throw new Error(`标签下拉选项中未找到匹配的: ${tag}。当前找到的选项有: [${foundTexts}]，请检查标签名称是否正确，或手动打开下拉框选择`)
        }
        tagItem.click()

        // 3.1 强制要求摘要在 50-100 字之间
        let finalSummary = summary || ''
        if (finalSummary.length < 50 || finalSummary.length > 100) {
          throw new Error(`摘要字数必须在 50 到 100 字之间，当前字数为：${finalSummary.length}。请重新生成摘要后再试。`)
        }

        // 3.2 找到并填写摘要框
        // 掘金摘要框真实类名是 .byte-input__textarea（无 placeholder），不是 .summary-textarea
        const summaryTextarea = (
          dialogScope.querySelector('.byte-input__textarea') ||
          dialogScope.querySelector('textarea') ||
          dialogScope.querySelector('.summary-textarea, textarea[placeholder*="摘要"]')
        ) as HTMLTextAreaElement | null

        if (!summaryTextarea) {
          throw new Error('未找到摘要输入框（.byte-input__textarea），请检查弹窗是否正常打开')
        }

        // 使用 nativeInputValueSetter 触发 ByteDance 组件响应式（普通赋值无效）
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        summaryTextarea.focus()
        if (nativeTextareaValueSetter) {
          nativeTextareaValueSetter.call(summaryTextarea, finalSummary)
        } else {
          summaryTextarea.value = finalSummary
        }
        summaryTextarea.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
        summaryTextarea.dispatchEvent(new Event('change', { bubbles: true }))
        summaryTextarea.blur()
        await new Promise(resolve => setTimeout(resolve, 300))

        // 3.3 用 Escape 键关闭标签下拉（避免误点"发布文章"标题关闭整个弹窗）
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        input.blur()
        await new Promise(resolve => setTimeout(resolve, 500))

        // 3.4 找到并点击确认发布按钮
        // 在掘金发布弹窗中，按钮文本通常是“确定并发布”
        let confirmBtn = Array.from(dialogScope.querySelectorAll('button')).find(
          e => e.textContent?.trim() === '确定并发布'
        ) as HTMLButtonElement | null
        if (!confirmBtn) {
          throw new Error('未找到“确定并发布”按钮')
        }
        confirmBtn.click()

        // 用 Promise.race 同时监听两个成功信号：
        //   1. 弹窗 .panel 从 DOM 中消失（正常发布流程）
        //   2. 页面发生跳转（window.location 变化，掘金有时会导航到发布成功页）
        //   3. 超时兜底（5000ms 后若仍未变化，认为发布已触发，不再阻塞）
        const publishResult = await Promise.race([
          // 信号1：轮询检测弹窗是否消失
          new Promise<'popup_closed'>((resolve) => {
            const check = setInterval(() => {
              const panel = document.querySelector('.panel')
              if (!panel || (panel as HTMLElement).offsetParent === null) {
                clearInterval(check)
                resolve('popup_closed')
              }
            }, 200)
            setTimeout(() => { clearInterval(check) }, 5000)
          }),
          // 信号2：监听页面跳转（beforeunload / hashchange 均可触发）
          new Promise<'navigating'>((resolve) => {
            const handler = () => resolve('navigating')
            window.addEventListener('beforeunload', handler, { once: true })
            setTimeout(() => { window.removeEventListener('beforeunload', handler) }, 5000)
          }),
          // 信号3：超时兜底
          new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 5000))
        ])

        // 如果是超时兜底，再检查一次弹窗
        if (publishResult === 'timeout') {
          const panel = document.querySelector('.panel')
          if (panel && (panel as HTMLElement).offsetParent !== null) {
            throw new Error('发布文章失败，弹出框未关闭，请检查分类、标签或其他必填项是否正确填写')
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `自动发布流程已触发，分类: ${category}, 标签: ${tag}，发布信号: ${publishResult}`
            })
          }]
        }
      }
    })

    ;(window as any).__webmcptools_juejincn = true
    console.log('[webmcp-tools] juejin.cn 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] juejin.cn 工具注册失败:', e.message)
  }
}
