/**
 * webmcp-tools 目录索引
 *
 * 此目录按域名组织 WebMCP 工具声明，由 scripts/build-inject.mjs 编译为独立的 IIFE 格式 JS bundle，
 * 在 browser.ts 中通过 page.evaluate() 注入到对应域名的页面上下文中执行。
 *
 * 目录结构：
 * webmcp-tools/
 *   ├── index.ts          <- 本文件，提供域名 → 工具文件的映射
 *   ├── types.d.ts        <- 全局类型声明
 *   └── {hostname}/
 *       ├── index.ts      <- 工具实现（注册到 document.modelContext）
 *       └── meta.ts       <- 元数据（name、description），供运行时按域名索引
 *
 * 使用方式：
 * - 在 browser.ts 中调用 getToolsBundlePath(hostname) 获取对应 bundle 路径
 * - bundle 由 `pnpm build:tools` 构建，输出到 dist/webmcp-tools/{hostname}.js
 */

/**
 * 根据域名获取对应工具 bundle 的相对输出路径（相对于 dist 目录）
 * 返回 null 表示该域名没有预置工具
 */
export function getToolsBundleName(hostname: string): string | null {
  // 规范化域名（去掉端口号，统一小写）
  const normalized = hostname.split(':')[0].toLowerCase()
  const supported = SUPPORTED_DOMAINS
  if (supported.includes(normalized)) {
    return `webmcp-tools/${normalized}.js`
  }
  // 尝试匹配子域名后缀（如 creator.xiaohongshu.com 匹配 xiaohongshu.com）
  for (const domain of supported) {
    if (normalized.endsWith('.' + domain)) {
      return `webmcp-tools/${domain}.js`
    }
  }
  return null
}

/**
 * 已支持的域名列表
 * 新增域名时，需要：
 * 1. 在 webmcp-tools/ 下创建对应的 {hostname}/ 目录
 * 2. 实现 index.ts（工具注册逻辑）和 meta.ts（元数据）
 * 3. 将域名添加到此列表
 * 4. 重新执行 pnpm build:tools
 */
export const SUPPORTED_DOMAINS: string[] = [
  'www.baidu.com',
  'excalidraw.com',
  'juejin.cn',
  'editor.csdn.net',
  'xiaohongshu.com',
  'creator.xiaohongshu.com',
  'segmentfault.com'
]
