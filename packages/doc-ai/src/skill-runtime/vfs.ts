import type { WebMcpClient } from '@opentiny/next-sdk'

// 虚拟文件系统接口
export interface IWebVirtualFileSystem {
  readFile(path: string): Promise<string>
}

// 基于 Vite glob 导入的虚拟文件映射
// 匹配 public 目录下或 docs 目录下的文件，根据实际情况调整
const localMetaFiles = import.meta.glob(['/public/**/*', '/src/assets/**/*'], { as: 'raw', eager: false })

export class WebVirtualFileSystem implements IWebVirtualFileSystem {
  private mcpClient?: WebMcpClient

  constructor(mcpClient?: WebMcpClient) {
    this.mcpClient = mcpClient
  }

  async readFile(path: string): Promise<string> {
    // 1. 处理网络资源
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${path}, status: ${response.status}`)
      }
      return response.text()
    }

    // 2. 处理本地打包资源 (Virtual)
    // 假设 path 是相对于根目录的路径，或者特定的 virtual 协议
    // 尝试匹配 import.meta.glob 加载的资源
    let loader = localMetaFiles[path]
    if (loader) {
      const module = await loader()
      return module as unknown as string
    }

    // 尝试加一个 / 前缀再匹配
    loader = localMetaFiles['/' + path]
    if (loader) {
      const module = await loader()
      return module as unknown as string
    }

    // 3. 回退到 MCP 读取 (需要 Server 端支持 read_file 工具)
    if (this.mcpClient) {
      try {
        // 调用标准文件读取工具，这里假设工具名为 'read_file' 或者类似的
        // 注意：这取决于 MCP Server 暴露了什么工具
        // 这里只是一个示例，如果 server 端有 'filesystem' 或者是 'read_file'
        const result = await this.mcpClient.callTool({
          name: 'read_file',
          arguments: { path }
        })
        // 假设 result 是 { content: [{ type: 'text', text: '...' }] } 结构
        // @ts-ignore
        if (result && result.content && result.content.length > 0 && result.content[0].text) {
          // @ts-ignore
          return result.content[0].text
        }
      } catch (error) {
        console.warn(`MCP read_file failed for ${path}:`, error)
      }
    }

    throw new Error(`File not found in VFS: ${path}`)
  }
}
