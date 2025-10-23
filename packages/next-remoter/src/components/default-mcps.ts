import { PluginInfo } from '@opentiny/tiny-robot'

const mcpHost = 'https://agent.opentiny.design'

export const DEFAULT_SERVERS: PluginInfo[] = [
  {
    id: '12306-mcp',
    name: '12306服务器',
    description: '12306购票搜索服务器',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-12306.webp',
    enabled: false,
    addState: 'idle',
    tools: [],
    url: mcpHost + '/api/v1/mcp-server/12306/mcp',
    type: 'StreamableHTTP'
  },
  {
    id: 'markdown2pdf-mcp',
    name: 'Markdown转PDF MCP服务器',
    description: 'Markdown转PDF MCP服务器，可以将Markdown文件转换为PDF文件',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-pdf.png',
    url: mcpHost + '/servers/markdown2pdf-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  },
  {
    id: 'docx-mcp',
    name: 'Word文档MCP服务器',
    description: 'Word文档MCP服务器，可以创建、编辑、保存Word文档',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-word.png',
    url: mcpHost + '/servers/excel-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  },
  {
    id: 'excel-mcp',
    name: 'Excel文档MCP服务器',
    description: 'Excel文档MCP服务器，可以创建、编辑、保存Excel文档',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-excel.png',
    url: mcpHost + '/servers/excel-mcp/mcp',
    type: 'StreamableHTTP',
    enabled: false,
    addState: 'idle',
    tools: []
  },
  {
    id: 'ppt-mcp',
    name: 'PPT文档MCP服务器',
    description: 'PPT文档MCP服务器，可以创建、编辑、保存PPT文档',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-ppt.png',
    url: mcpHost + '/servers/ppt-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  },
  {
    id: 'doc-tools-mcp',
    name: '文档工具MCP服务器',
    description: '文档工具MCP服务器，可以创建、编辑、保存文档',
    icon: 'https://agent.opentiny.design/public-assets/icons/icon-doc.png',
    url: mcpHost + '/servers/doc-tools-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  }
]
