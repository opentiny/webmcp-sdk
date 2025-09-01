import { PluginInfo } from '@opentiny/tiny-robot'

const mcpHost = import.meta.env.DEV ? location.origin : 'https://agent.opentiny.design'

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
    id: 'amap-mcp',
    name: '高德MCP服务器',
    description: '使用高德地图能力，如获取地图数据',
    icon: 'https://a.amap.com/pc/static/img/amaplogo.png',
    enabled: false,
    added: false,
    tools: [],
    url: mcpHost + '/api/v1/mcp-server/amap/mcp',
    type: 'StreamableHTTP'
  },
  {
    id: 'bingcn-mcp',
    name: 'Bing搜索MCP服务器',
    description: 'Bing搜索MCP服务器，可以搜索网页',
    icon: 'https://logowik.com/content/uploads/images/bing-icon2191.logowik.com.webp',
    url: mcpHost + '/servers/bing-mcp/sse',
    type: 'SSE',
    enabled: false,
    added: false,
    tools: []
  },
  {
    id: 'docx-mcp',
    name: 'Word文档MCP服务器',
    description: 'Word文档MCP服务器，可以创建、编辑、保存Word文档',
    icon: 'https://media-cdn.microsoftstore.com.cn/media/category/office2019/icon-word.png',
    url: mcpHost + '/servers/excel-mcp/sse',
    type: 'SSE',
    enabled: false,
    added: false,
    tools: []
  },
  {
    id: 'excel-mcp',
    name: 'Excel文档MCP服务器',
    description: 'Excel文档MCP服务器，可以创建、编辑、保存Excel文档',
    icon: 'https://media-cdn.microsoftstore.com.cn/media/category/office2019/icon-Excel.png',
    url: mcpHost + '/servers/excel-mcp/sse',
    type: 'SSE',
    enabled: false,
    added: false,
    tools: []
  },
  {
    id: 'ppt-mcp',
    name: 'PPT文档MCP服务器',
    description: 'PPT文档MCP服务器，可以创建、编辑、保存PPT文档',
    icon: 'https://media-cdn.microsoftstore.com.cn/media/category/office2019/icon-PowerPoint.png',
    url: mcpHost + '/servers/ppt-mcp/sse',
    type: 'SSE',
    enabled: false,
    added: false,
    tools: []
  },
  {
    id: 'doc-tools-mcp',
    name: '文档工具MCP服务器',
    description: '文档工具MCP服务器，可以创建、编辑、保存文档',
    icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991110.png',
    url: mcpHost + '/servers/doc-tools-mcp/sse',
    type: 'SSE',
    enabled: false,
    added: false,
    tools: []
  },
  {
    id: 'markdown2pdf-mcp',
    name: 'Markdown转PDF MCP服务器',
    description: 'Markdown转PDF MCP服务器，可以将Markdown文件转换为PDF文件',
    icon: 'https://www.science.co.il/internet/browsers/PDF-doc-256.png',
    url: mcpHost + '/servers/markdown2pdf-mcp/sse',
    type: 'SSE',
    enabled: false,
    added: false,
    tools: []
  }
]
