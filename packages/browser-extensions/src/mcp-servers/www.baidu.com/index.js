window.$next_remoter_mcp_server = ({ server, z }) => {
  // Add an addition tool
  server.registerTool(
    'fill-textarea',
    {
      title: '填充搜索框',
      description: '填充百度搜索框的内容',
      inputSchema: { text: z.string() }
    },
    async ({ text }) => {
      const textarea = document.getElementById('chat-textarea')
      textarea.value = text
      return {
        content: [{ type: 'text', text: '填充完成' }]
      }
    }
  )
}
