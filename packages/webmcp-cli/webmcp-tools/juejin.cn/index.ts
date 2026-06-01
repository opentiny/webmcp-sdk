/**
 * juejin.cn 工具适配层
 */

const mcp = (navigator as any).modelContext
if (!mcp || typeof mcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] juejin.cn: navigator.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_juejincn) {
  try {
    // ─── 工具注册 ────────────────────────────────────────────────────
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
      execute: async ({ title, content }: { title: string; content: string }) => {
        // 不是发布网页，则返回
        if (!location.href.startsWith('https://juejin.cn/editor/drafts/new')) {
          return {
            content: [
              { type: 'text', text: '当前页面不是发布新文章页面，请先访问 https://juejin.cn/editor/drafts/new?v=2' }
            ]
          }
        }

        // 填写标题
        const titleInput = document.querySelector('.edit-draft .header  .title-input')
        if (titleInput) {
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
        }
        // 填写内容
        const decodeContent = decodeURIComponent(escape(atob(content)))
        // 1. CodeMirror 5 注入 (如 ByteMD)
        const cm5El = document.querySelector('.edit-draft .CodeMirror')
        if (cm5El && cm5El.CodeMirror) {
          cm5El.CodeMirror.setValue(decodeContent)
        } else {
          // 2. CodeMirror 6 注入
          const cm6View = document.querySelector('.cm-editor')?.cmView?.view
          if (cm6View) {
            cm6View.dispatch({
              changes: { from: 0, to: cm6View.state.doc.length, insert: decodeContent }
            })
          }
        }

        return { content: [{ type: 'text', text: '文章标题和内容已经填写到网页' }] }
      }
    })

    // 注册成功后设 flag
    ;(window as any).__webmcptools_juejincn = true
    console.log('[webmcp-tools] juejin.cn 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] juejin.cn 工具注册失败:', e.message)
  }
}
