/**
 * opentiny.design 工具适配层
 * 此文件由 content.ts 通过 scripting.executeScript 注入到 opentiny.design 页面的 JS 上下文中执行
 * 可直接访问页面 DOM 和 window
 */
navigator.modelContext.registerTool({
  name: 'generate-color',
  title: '生成页面背景颜色',
  description: '根据用户的心情或者情绪生成页面的背景颜色，要求：传入的color参数格式为十六进制颜色值，比如 #000000',
  inputSchema: {
    type: 'object',
    properties: {
      color: { type: 'string', description: '十六进制颜色值，如 #FF5733' }
    },
    required: ['color']
  },
  execute: async ({ color }: { color: string }) => {
    document.body.style.backgroundColor = color
    return {
      content: [{ type: 'text', text: `已将页面背景色设置为 ${color}` }]
    }
  }
})
