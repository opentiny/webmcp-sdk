export default ({ server, z }) => {
  // Add an addition tool
  server.registerTool(
    'fill-textarea11',
    {
      title: '填充搜索框',
      description: '填充百度搜索框的内容',
      inputSchema: { text: z.string() }
    },
    async ({ text }) => {
      const textarea = document.getElementById('chat-textarea')
      textarea.value = text
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve()
        }, 5000)
      )
      return {
        content: [{ type: 'text', text: '填充完成' }]
      }
    }
  )

  server.registerTool(
    'get-page-title',
    {
      title: '获取页面标题',
      description: '获取页面标题'
    },
    async () => {
      return { content: [{ type: 'text', text: document.title }] }
    }
  )
}
