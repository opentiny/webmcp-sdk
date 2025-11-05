window.$next_remoter_mcp_server = ({ server, z }) => {
  // Add an addition tool
  server.registerTool(
    'generate-color',
    {
      title: '生成页面背景颜色',
      description: '根据用户的心情或者情绪生成页面的背景颜色,要求：传入的color参数格式为十六进制颜色值,比如 #000000',
      inputSchema: { color: z.string() }
    },
    async ({ color }) => {
      document.body.style.backgroundColor = color
      return {
        content: [{ type: 'text', text: String(color) }]
      }
    }
  )
}
