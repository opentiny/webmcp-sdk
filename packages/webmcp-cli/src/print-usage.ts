/**
 * 打印使用说明（与 readme.md 对齐）
 */
export function printUsage(): void {
  console.log(`
WebMCP CLI - Chrome 远程调试工具

用法:
  webmcp <command> [args]

命令:
  list                          注入页面脚本并返回当前页面状态 JSON
  run <子命令> [args...]        在浏览器中执行命令

run 子命令类型:
  1. modelContext 工具
     webmcp run <toolName> [args...]
     示例: webmcp run change-color #110000

  2. page-agent 页面操作
     webmcp run page-agent browserState
     webmcp run page-agent click <index>
     webmcp run page-agent fill <index> <text>
     webmcp run page-agent select <index> <text>

  3. tabs 标签页管理
     webmcp run tabs open <url>
     webmcp run tabs close <tabId>
     webmcp run tabs switch <tabId>

示例:
  webmcp list
  webmcp run page-agent browserState
  webmcp run tabs open https://example.com
`)
}
