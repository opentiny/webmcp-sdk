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
          throw new Error(
            '当前页面不是掘金新建文章编辑器，请先打开 https://juejin.cn/editor/drafts/new?v=2'
          )
        }

        let decodeContent: string
        try {
          decodeContent = decodeURIComponent(escape(atob(content)))
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        const titleInput = document.querySelector(
          '.edit-draft .header .title-input'
        ) as HTMLInputElement | null
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

    ;(window as any).__webmcptools_juejincn = true
    console.log('[webmcp-tools] juejin.cn 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] juejin.cn 工具注册失败:', e.message)
  }
}
