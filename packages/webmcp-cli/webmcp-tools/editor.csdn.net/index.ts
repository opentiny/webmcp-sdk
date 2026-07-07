/**
 * editor.csdn.net 工具适配层
 */

type ToolResult = {
  success: true
  message: string
  title: string
  contentLength: number
  editor: 'clipboard-paste' | 'codemirror' | 'contenteditable'
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

/** 模版库弹窗可能异步出现，注入后多次尝试关闭 */
function scheduleCloseTemplateDialog() {
  const tryClose = () => closeTemplateDialog()
  tryClose()
  setTimeout(tryClose, 500)
  setTimeout(tryClose, 1500)
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] editor.csdn.net: document.modelContext.registerTool 未就绪，跳过注入')
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
      execute: async ({ title, content }: { title: string; content: string }): Promise<ToolResult> => {
        if (!title?.trim()) {
          throw new Error('参数 title 不能为空')
        }
        if (!content?.trim()) {
          throw new Error('参数 content 不能为空')
        }

        if (!location.hostname.endsWith('editor.csdn.net')) {
          throw new Error('当前页面不是 CSDN 编辑器，请先打开 https://editor.csdn.net/md/')
        }

        // 关闭「模版库」弹窗，避免遮挡编辑器
        closeTemplateDialog()
        await new Promise((r) => setTimeout(r, 300))

        let decodeContent: string
        try {
          decodeContent = decodeURIComponent(escape(atob(content)))
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        // 切换到 Markdown 模式（默认可能是「比对」模式）
        const mdTab = Array.from(document.querySelectorAll('button.nav-tab-btn')).find((btn) =>
          btn.textContent?.trim().includes('Markdown')
        ) as HTMLButtonElement | undefined
        if (mdTab) {
          mdTab.click()
          await new Promise((r) => setTimeout(r, 500))
        }

        // 标题：先点击显示区域激活隐藏的 input
        const titleDisplay = document.querySelector('.article-bar__title-display') as HTMLElement | null
        titleDisplay?.click()
        await new Promise((r) => setTimeout(r, 300))

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

        let editor: ToolResult['editor'] | null = null

        // 优先 CodeMirror
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
          // contenteditable pre 编辑器：先清空默认模板，再粘贴 Markdown
          const preEditor = document.querySelector('pre.editor__inner') as HTMLElement | null
          if (preEditor) {
            preEditor.focus()
            document.execCommand('selectAll')
            document.execCommand('delete')
            await new Promise((r) => setTimeout(r, 200))

            const dt = new DataTransfer()
            dt.setData('text/plain', decodeContent)
            preEditor.dispatchEvent(
              new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles: true,
                cancelable: true
              })
            )
            await new Promise((r) => setTimeout(r, 800))

            let actual = preEditor.textContent || ''
            const probe = decodeContent.trim().slice(0, 40)
            if (!actual.includes(probe)) {
              // 粘贴未生效时，直接写入并触发 input 事件
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

        return {
          success: true,
          message: '文章标题和正文已成功填写到 CSDN 编辑器，请人工审核后发布',
          title: title.trim(),
          contentLength: decodeContent.length,
          editor
        }
      }
    })

    ;(window as any).__webmcptools_editorcsdnnet = true
    scheduleCloseTemplateDialog()
    console.log('[webmcp-tools] editor.csdn.net 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] editor.csdn.net 工具注册失败:', e.message)
  }
}
