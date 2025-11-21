export default {
  name: 'www.baidu.com',
  type: 'contentScriptMcpServer',
  url: 'https://www.baidu.com',
  isAlwaysEnabled: true,
  toolsJumpLinks: {
    'get-page-title': 'https://www.baidu.com/s?wd=get-page-title'
  },
  customMarketMcpServers: [
    {
      id: 'ppt-mcp',
      name: 'PPT文档MCP服务器',
      description: 'PPT文档MCP服务器，可以创建、编辑、保存PPT文档',
      icon: 'https://agent.opentiny.design/public-assets/icons/icon-ppt.png',
      url: 'https://agent.opentiny.design/servers/ppt-mcp/sse',
      type: 'sse',
      enabled: false,
      addState: 'idle',
      tools: []
    }
  ],
  version: '1.0.0'
}
