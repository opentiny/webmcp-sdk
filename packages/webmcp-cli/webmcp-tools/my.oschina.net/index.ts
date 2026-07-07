/**
 * my.oschina.net 工具适配层
 */

type OSCHINAToolResult = {
  success: true
  message: string
  title: string
}

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] my.oschina.net: document.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_myoschinanet) {
  ;(window as any).__webmcptools_myoschinanet = true
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
      execute: async ({
        uid,
        title,
        content
      }: {
        uid: string
        title: string
        content: string
      }): Promise<OSCHINAToolResult> => {
        if (!title?.trim()) {
          throw new Error('参数 title 不能为空')
        }
        if (!content?.trim()) {
          throw new Error('参数 content 不能为空')
        }

        if (!(location.href.startsWith(`https://my.oschina.net/u`) && location.href.endsWith(`/blog/ai-write`))) {
          throw new Error(`当前页面不是发布页面，请先打开 https://my.oschina.net/u/<uid>}/blog/ai-write`)
        }

        let decodeContent: string
        try {
          decodeContent = decodeURIComponent(escape(atob(content)))
        } catch {
          throw new Error('content 不是有效的 Base64 编码，请检查参数或使用 @base64file: 引用文件')
        }

        // 1、 必须先切换 MD 编辑器
        let switchBtn = document.querySelector('.editor-switch-btn') as HTMLButtonElement | null
        if (switchBtn) {
          switchBtn.click()
        }
        await new Promise((resolve) => setTimeout(resolve, 300))
        // 2. 填写标题
        const titleInput = document.querySelector('.title-input-container .title-input') as HTMLInputElement | null
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

        await new Promise((resolve) => setTimeout(resolve, 300)) // 等待标题输入框失去焦点

        // 3. 填写正文
        let editor = document.querySelector('.v-md-textarea-editor textarea') as HTMLTextAreaElement | null
        if (editor) {
          editor.value = decodeContent
          editor.dispatchEvent(new Event('change', { bubbles: true }))
          editor.blur()
        } else {
          throw new Error('未找到正文编辑器')
        }

        return {
          success: true,
          message: '文章标题和正文已成功填写到开源中国的编辑器，草稿将自动保存',
          title: title.trim()
        }
      }
    })
    ;(window as any).__webmcptools_juejincn = true
    console.log('[webmcp-tools] juejin.cn 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] juejin.cn 工具注册失败:', e.message)
  }
}
