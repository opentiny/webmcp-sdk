/**
 * editor.csdn.net 工具适配层
 */

type EditorType = 'clipboard-paste' | 'codemirror' | 'contenteditable'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function toToolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data) }]
  }
}

/** 关闭进入编辑器时弹出的「模版库」弹窗 */
function closeTemplateDialog(): boolean {
  const modal = Array.from(document.querySelectorAll('.modal')).find(
    (el) => el.textContent?.includes('模版库') || el.textContent?.includes('模板库')
  )
  if (!modal) return false

  const closeBtn = modal.querySelector(
    'button.modal__close-button, [aria-label="关闭"], [title="关闭"]'
  ) as HTMLElement | null
  if (closeBtn) {
    closeBtn.click()
    return true
  }

  const cancelBtn = Array.from(modal.querySelectorAll('button, div')).find(
    (el) => el.textContent?.trim() === '取消'
  ) as HTMLElement | undefined
  if (cancelBtn) {
    cancelBtn.click()
    return true
  }

  return false
}

/** 移除发布弹窗遮罩层，避免 click 被拦截 */
function removePublishMask() {
  document.querySelectorAll('.mark-mask-box-div').forEach((m) => m.remove())
}

function isCsdnEditorPage(): boolean {
  return location.hostname.endsWith('editor.csdn.net')
}

/** 读取当前编辑器中的标题和正文 */
function readArticleFromEditor(): { title: string; content: string; editor: EditorType | null } {
  const titleInput = document.querySelector('input.article-bar__title--input') as HTMLInputElement | null
  const title = titleInput?.value?.trim() || ''

  const cmEl = document.querySelector('.CodeMirror') as
    | (HTMLElement & { CodeMirror?: { getValue: () => string } })
    | null
  if (cmEl?.CodeMirror) {
    return { title, content: cmEl.CodeMirror.getValue(), editor: 'codemirror' }
  }

  const preEditor = document.querySelector('pre.editor__inner') as HTMLElement | null
  if (preEditor) {
    return { title, content: preEditor.textContent || '', editor: 'clipboard-paste' }
  }

  return { title, content: '', editor: null }
}

/** 查找所有可见的「发布文章」按钮 */
function findPublishButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('button')).filter((b) => {
    const el = b as HTMLButtonElement
    return el.textContent?.trim() === '发布文章' && el.offsetParent !== null
  }) as HTMLButtonElement[]
}

/** 模版库弹窗可能异步出现，注入后多次尝试关闭 */
function scheduleCloseTemplateDialog() {
  const tryClose = () => closeTemplateDialog()
  tryClose()
  setTimeout(tryClose, 500)
  setTimeout(tryClose, 1500)
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] editor.csdn.net: navigator.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_editorcsdnnet) {
  try {
    mcp.registerTool({
      name: 'create_article',
      title: '填写 CSDN 文章',
      description: '接收文章的标题和正文（Markdown），填写到 CSDN Markdown 编辑器中。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '文章标题，必填，建议不超过 100 字，不允许有特殊符号影响命令行参数解析'
          },
          content: {
            type: 'string',
            description: '文章 Markdown 正文的 Base64 编码字符串，必填。'
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

        if (!isCsdnEditorPage()) {
          throw new Error('当前页面不是 CSDN 编辑器，请先打开 https://editor.csdn.net/md/')
        }

        closeTemplateDialog()
        await sleep(300)

        let decodeContent: string
        try {
          decodeContent = decodeURIComponent(escape(atob(content)))
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        const mdTab = Array.from(document.querySelectorAll('button.nav-tab-btn')).find((btn) =>
          btn.textContent?.trim().includes('Markdown')
        ) as HTMLButtonElement | undefined
        if (mdTab) {
          mdTab.click()
          await sleep(500)
        }

        const titleDisplay = document.querySelector('.article-bar__title-display') as HTMLElement | null
        titleDisplay?.click()
        await sleep(300)

        const titleInput = document.querySelector('input.article-bar__title--input') as HTMLInputElement | null
        if (!titleInput) {
          throw new Error('未找到标题输入框，请确认编辑器页面已完全加载并已登录')
        }

        titleInput.focus()
        titleInput.value = title
        titleInput.dispatchEvent(
          new InputEvent('input', { bubbles: true, cancelable: true, data: title })
        )
        titleInput.dispatchEvent(new Event('change', { bubbles: true }))
        titleInput.blur()

        if (titleInput.value.trim() !== title.trim()) {
          throw new Error('标题填写失败，请刷新页面后重试')
        }

        let editor: EditorType | null = null

        const cmEl = document.querySelector('.CodeMirror') as
          | (HTMLElement & { CodeMirror?: { setValue: (v: string) => void; getValue: () => string } })
          | null
        if (cmEl?.CodeMirror) {
          cmEl.CodeMirror.setValue(decodeContent)
          if (cmEl.CodeMirror.getValue() !== decodeContent) {
            throw new Error('正文填写失败（CodeMirror），请刷新页面后重试')
          }
          editor = 'codemirror'
        } else {
          const preEditor = document.querySelector('pre.editor__inner') as HTMLElement | null
          if (preEditor) {
            preEditor.focus()
            document.execCommand('selectAll')
            document.execCommand('delete')
            await sleep(200)

            const dt = new DataTransfer()
            dt.setData('text/plain', decodeContent)
            preEditor.dispatchEvent(
              new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles: true,
                cancelable: true
              })
            )
            await sleep(800)

            let actual = preEditor.textContent || ''
            const probe = decodeContent.trim().slice(0, 40)
            if (!actual.includes(probe)) {
              preEditor.textContent = decodeContent
              preEditor.dispatchEvent(new InputEvent('input', { bubbles: true }))
              actual = preEditor.textContent || ''
            }

            if (!actual.includes(probe)) {
              throw new Error('正文填写失败（contenteditable），请刷新页面后重试')
            }
            editor = 'clipboard-paste'
          }
        }

        if (!editor) {
          throw new Error('未找到正文编辑器，请确认编辑器页面已完全加载')
        }

        return toToolResult({
          success: true,
          message: '文章标题和正文已成功填写到 CSDN 编辑器',
          title: title.trim(),
          contentLength: decodeContent.length,
          editor
        })
      }
    })

    mcp.registerTool({
      name: 'get_article_info',
      title: '获取当前 CSDN 文章信息',
      description:
        '在 CSDN 编辑器页面中获取当前文章的标题和正文，以便 AI 分析主题、选择合适的分类与标签，或生成摘要。',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        if (!isCsdnEditorPage()) {
          throw new Error('当前页面不是 CSDN 编辑器，请先打开 https://editor.csdn.net/md/')
        }

        const { title, content, editor } = readArticleFromEditor()
        return toToolResult({
          success: true,
          title,
          contentLength: content.length,
          content,
          editor
        })
      }
    })

    mcp.registerTool({
      name: 'publish_current_draft',
      title: '一键发布当前 CSDN 草稿',
      description:
        '在 CSDN 编辑器中自动打开发布弹窗、填写标签/分类/摘要并确认发布。调用前 AI 必须先使用 get_article_info 获取正文，智能推断 category 与 tags，并生成 100 字以内的摘要，切勿盲目使用默认值。',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              '文章分类。AI 应先读取正文判断技术领域，如「前端」「后端」「人工智能」「运维」等，默认「前端」'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description:
              '文章标签数组，必填 1~3 个。AI 应先读取正文提炼核心技术栈标签，如 ["Vue.js","JavaScript","前端"]'
          },
          summary: {
            type: 'string',
            description: '文章摘要，必填，字数必须在 100 字以内。调用前 AI 须基于 get_article_info 自主总结。'
          }
        },
        required: ['tags', 'summary']
      },
      execute: async ({
        category = '前端',
        tags,
        summary
      }: {
        category?: string
        tags: string[]
        summary: string
      }) => {
        if (!isCsdnEditorPage()) {
          throw new Error('当前页面不是 CSDN 编辑器，请先 tabs switch 到编辑器标签页后再发布')
        }

        if (!tags?.length) {
          throw new Error('参数 tags 不能为空，请至少提供一个标签')
        }
        if (tags.length > 7) {
          throw new Error('CSDN 最多支持 7 个标签')
        }

        const finalSummary = summary?.trim() || ''
        if (!finalSummary) {
          throw new Error('参数 summary 不能为空')
        }
        if (finalSummary.length > 100) {
          throw new Error(`摘要字数必须在 100 字以内，当前字数为：${finalSummary.length}`)
        }

        closeTemplateDialog()
        removePublishMask()
        await sleep(300)

        // 1. 点击工具栏「发布文章」（打开发布设置弹窗）
        const toolbarBtn = findPublishButtons()[0]
        if (!toolbarBtn) {
          throw new Error('未找到工具栏「发布文章」按钮，请确认编辑器页面已完全加载')
        }
        toolbarBtn.click()
        await sleep(1000)

        const dialogScope =
          document.querySelector('.publish-setting, .publish-dialog, .modal:not(:has(.modal__title))') ||
          Array.from(document.querySelectorAll('.modal, [role="dialog"]')).find(
            (el) => el.textContent?.includes('文章标签') || el.textContent?.includes('摘要')
          ) ||
          document

        // 2. 添加标签
        const addTagBtn = Array.from(dialogScope.querySelectorAll('button, div, span, a')).find((el) =>
          el.textContent?.trim().includes('添加文章标签')
        ) as HTMLElement | undefined
        if (addTagBtn) {
          addTagBtn.click()
          await sleep(800)
        }

        const tagDialog =
          Array.from(document.querySelectorAll('.modal, [role="dialog"]')).find(
            (el) => el.textContent?.includes('文章标签') && el !== dialogScope
          ) || document

        const clickedTags: string[] = []
        for (const tag of tags) {
          const tagEls = Array.from(
            tagDialog.querySelectorAll('.el-tag, span.tag, button.tag, li, [class*="tag"]')
          ) as HTMLElement[]
          const match = tagEls.find((el) => el.textContent?.trim() === tag && el.offsetParent !== null)
          if (match) {
            match.click()
            clickedTags.push(tag)
          }
        }

        // 右栏标签常无独立索引，用 JS 批量点选兜底
        if (clickedTags.length < tags.length) {
          const remaining = tags.filter((t) => !clickedTags.includes(t))
          for (const tag of remaining) {
            const found = Array.from(
              document.querySelectorAll('.el-tag, span.tag, button.tag, [class*="tag"]')
            ).find((el) => el.textContent?.trim() === tag) as HTMLElement | undefined
            if (found) {
              found.click()
              clickedTags.push(tag)
            }
          }
        }

        // 关闭标签子弹窗
        const tagCloseBtn = Array.from(tagDialog.querySelectorAll('button, div')).find(
          (el) => el.textContent?.trim() === '关闭' || el.textContent?.trim() === '取消'
        ) as HTMLElement | undefined
        tagCloseBtn?.click()
        await sleep(500)

        // 3. 选择分类
        const catEl = Array.from(dialogScope.querySelectorAll('li, label, span, div, button')).find(
          (el) => el.textContent?.trim() === category && (el as HTMLElement).offsetParent !== null
        ) as HTMLElement | undefined
        if (catEl) {
          catEl.click()
          await sleep(300)
        }

        // 4. 填写摘要
        const summaryTextarea = (
          dialogScope.querySelector('textarea[placeholder*="摘要"]') ||
          Array.from(dialogScope.querySelectorAll('textarea')).find(
            (ta) => ta.placeholder?.includes('摘要') || ta.closest('[class*="summary"]')
          ) ||
          dialogScope.querySelector('textarea')
        ) as HTMLTextAreaElement | null

        if (!summaryTextarea) {
          throw new Error('未找到摘要输入框，请检查发布弹窗是否正常打开')
        }

        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        summaryTextarea.focus()
        if (nativeSetter) {
          nativeSetter.call(summaryTextarea, finalSummary)
        } else {
          summaryTextarea.value = finalSummary
        }
        summaryTextarea.dispatchEvent(new InputEvent('input', { bubbles: true }))
        summaryTextarea.dispatchEvent(new Event('change', { bubbles: true }))
        summaryTextarea.blur()
        await sleep(300)

        // 5. 确认发布
        removePublishMask()

        const publishBtns = findPublishButtons()
        const confirmBtn = publishBtns[publishBtns.length - 1] || publishBtns[0]
        if (!confirmBtn) {
          throw new Error('未找到弹窗内「发布文章」确认按钮')
        }
        confirmBtn.click()

        await sleep(3000)

        const url = location.href
        const published = url.includes('mp.csdn.net') && url.includes('/success/')

        return toToolResult({
          success: true,
          message: published
            ? `CSDN 文章发布成功，分类: ${category}，标签: ${clickedTags.join(', ')}`
            : `发布流程已触发，分类: ${category}，标签: ${clickedTags.join(', ')}，请检查页面是否跳转到发布成功页`,
          category,
          tags: clickedTags,
          summary: finalSummary,
          url
        })
      }
    })

    ;(window as any).__webmcptools_editorcsdnnet = true
    scheduleCloseTemplateDialog()
    console.log('[webmcp-tools] editor.csdn.net 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] editor.csdn.net 工具注册失败:', e.message)
  }
}
