/**
 * next-wxt 应用使用的 Skill 模块
 * - 使用 import.meta.glob 自动收集当前应用下的 .md 文档为 skillMdModules
 * - 导出 skillMdModules 供 TinyRemoter 使用
 */

// 全量 .md 文档（Vite 构建时注入），key 为相对 skills 的路径，value 为文件原始内容
export const skillMdModules: Record<string, string> = import.meta.glob('./**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>
