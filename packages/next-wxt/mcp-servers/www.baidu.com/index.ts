;(document as any).modelContext.registerTool({
  name: 'baidu-search',
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

    // 赋值并触发 react/vue 等可能拦截的 input 事件（虽然百度目前是原生，但防一手）
    inputEl.value = keyword
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))

    // 点击搜索
    btnEl.click()

    return {
      content: [{ type: 'text', text: `已在百度执行搜索：${keyword}` }]
    }
  }
})
