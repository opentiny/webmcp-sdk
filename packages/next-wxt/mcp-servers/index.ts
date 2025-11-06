const modules = import.meta.glob('./*/index.ts', { eager: true })
const metaModules = import.meta.glob('./*/meta.ts', { eager: true })

/**
 * 根据域名获取对应的 MCP 工具配置
 * @param hostname - 当前页面的域名（如 'www.baidu.com'）
 * @returns 匹配的工具模块，如果没有匹配则返回 null
 */
export default function getMcpToolByHostname(hostname: string) {
  // 遍历所有模块，查找匹配的域名
  for (const [path, module] of Object.entries(modules)) {
    // 从路径中提取域名：'./www.baidu.com/index.js' -> 'www.baidu.com'
    const domainMatch = path.match(/^\.\/(.+)\/index\.ts$/)
    if (domainMatch && domainMatch[1] === hostname) {
      return (module as any).default || module
    }
  }

  // 如果没有找到匹配的域名配置，返回 null
  return null
}

export const getMcpMetaInfo = (hostname: string) => {
  for (const [path, module] of Object.entries(metaModules)) {
    const domainMatch = path.match(/^\.\/(.+)\/meta\.ts$/)
    if (domainMatch && domainMatch[1] === hostname) {
      return (module as any).default || module
    }
  }
  return null
}
