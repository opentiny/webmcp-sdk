/**
 * doc-ai 应用层 skills 薄封装
 * - 通过 Vite import.meta.glob 收集 skills 目录下所有文件（含 .md、.json、.xml 等）为 skillMdModules
 * - 将 skillMdModules 传给 TinyRemoter，由 remoter 调用 @opentiny/next-sdk 的 skill 公共能力处理
 */

// 全量技能文件（Vite 构建时注入），key 为相对 skills 的路径，value 为文件原始内容
export const skillMdModules: Record<string, string> = import.meta.glob('./**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>
