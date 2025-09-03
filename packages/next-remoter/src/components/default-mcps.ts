import { PluginInfo } from '@opentiny/tiny-robot'

const mcpHost = 'https://agent.opentiny.design'

export const DEFAULT_SERVERS: PluginInfo[] = [
  {
    id: '12306-mcp',
    name: '12306服务器',
    description: '12306购票搜索服务器',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/43/5e/ac/435eaceb-0c86-383c-c262-2e9a405c8ecf/AppIcon-0-0-1x_U007emarketing-0-9-0-0-85-220.png/460x0w.webp',
    enabled: false,
    added: false,
    tools: [],
    url: mcpHost + '/api/v1/mcp-server/12306/mcp',
    type: 'StreamableHTTP'
  },
  {
    id: 'markdown2pdf-mcp',
    name: 'Markdown转PDF MCP服务器',
    description: 'Markdown转PDF MCP服务器，可以将Markdown文件转换为PDF文件',
    icon: 'https://www.science.co.il/internet/browsers/PDF-doc-256.png',
    url: mcpHost + '/servers/markdown2pdf-mcp/sse',
    type: 'sse',
    enabled: false,
    added: false,
    tools: []
  }
]
