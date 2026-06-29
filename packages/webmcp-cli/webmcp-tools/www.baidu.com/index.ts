/**
 * www.baidu.com 工具适配层
 * 由 browser.ts 通过 page.evaluate() 注入到 www.baidu.com 页面的 JS 上下文中执行
 * 可直接访问页面 DOM 和 window
 *
 * 注意：工具注册使用 navigator.modelContext（polyfill 服务端接口），
 * 而非 navigator.modelContextTesting（客户端查询接口）。
 */

// navigator.modelContext 不存在时不设 flag，允许下次重试
const _baiduMcp = (navigator as any).modelContext
if (!_baiduMcp || typeof _baiduMcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] www.baidu.com: navigator.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_wwwbaiducom) {
  ;(window as any).__webmcptools_wwwbaiducom = true
  try {
    _baiduMcp.registerTool({
      name: 'baidu_search',
      title: '百度搜索',
      description: '在百度输入框中输入关键字并执行搜索。',
      inputSchema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '要搜索的关键字' }
        },
        required: ['keyword']
      },
      execute: async ({ keyword }: { keyword: string }) => {
        const inputEl = document.querySelector('#kw') as HTMLInputElement
        const btnEl = document.querySelector('#su') as HTMLInputElement

        if (!inputEl || !btnEl) {
          return {
            content: [{ type: 'text', text: '未找到百度搜索框或搜索按钮，可能不在首页或页面结构已变。' }]
          }
        }

        inputEl.value = keyword
        inputEl.dispatchEvent(new Event('input', { bubbles: true }))
        btnEl.click()

        return {
          content: [{ type: 'text', text: `已在百度执行搜索：${keyword}` }]
        }
      }
    })

    _baiduMcp.registerTool({
      name: 'baidu_get_results',
      title: '获取百度搜索结果',
      description: '获取当前百度搜索结果页面中的搜索结果列表，包含标题和链接。',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: '最多返回的结果数量，默认 10' }
        },
        required: []
      },
      execute: async ({ limit }: { limit?: string }) => {
        const maxCount = parseInt(limit || '10', 10)
        const results: Array<{ title: string; url: string; summary: string }> = []

        const items = document.querySelectorAll('.result.c-container')
        items.forEach((item, idx) => {
          if (idx >= maxCount) return
          const titleEl = item.querySelector('h3 a') as HTMLAnchorElement
          const summaryEl = item.querySelector('.content-right_8Zs40, .c-abstract, .c-span9')
          if (titleEl) {
            results.push({
              title: titleEl.textContent?.trim() || '',
              url: titleEl.href || '',
              summary: summaryEl?.textContent?.trim() || ''
            })
          }
        })

        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
        }
      }
    })

    // 注册成功后再设 flag
    ;(window as any).__webmcptools_baidu = true
    console.log('[webmcp-tools] www.baidu.com 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] www.baidu.com 工具注册失败:', e.message)
  }
}
