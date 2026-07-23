/**
 * mcp-servers 目录索引
 *
 * 工具脚本由 vite-plugin-mcp-servers.ts 编译为独立 IIFE JS 文件，
 * 由 content.ts 通过 <script src="chrome-extension://..."> 注入到目标页面 MAIN world。
 *
 * 此文件只负责：根据域名查询是否有对应的工具配置（meta.ts）。
 */
export const metaModules = import.meta.glob('./*/meta.ts', { eager: true })

/**
 * 根据域名获取对应的 meta 配置
 * @param hostname - 当前页面的域名（如 'excalidraw.com'）
 * @returns meta 配置对象，如果没有匹配则返回 null
 */
export const getMcpMetaInfo = (hostname: string) => {
  for (const [path, module] of Object.entries(metaModules)) {
    const domainMatch = path.match(/^\.\/(.+)\/meta\.ts$/)
    if (domainMatch && domainMatch[1] === hostname) {
      return (module as any).default || module
    }
  }
  return null
}
