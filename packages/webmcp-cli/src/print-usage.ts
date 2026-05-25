/**
 * 打印使用说明（与 readme.md 对齐）
 */
export function printUsage(): void {
  console.error(`
WebMCP CLI - Chrome 远程调试工具

用法:
  webmcp-cli <command> [args]

命令:
  list                          注入页面脚本并返回当前页面状态 JSON
  run <子命令> [args...]        在浏览器中执行命令

run 子命令类型:
  1. modelContext 工具
     webmcp-cli run <toolName> [args...]
     示例: webmcp-cli run change-color #110000

  2. page-agent 页面操作
     webmcp-cli run page-agent browserState
     webmcp-cli run page-agent click <index>
     webmcp-cli run page-agent fill <index> <text>
     webmcp-cli run page-agent select <index> <text>

  3. tabs 标签页管理
     webmcp-cli run tabs open <url>
     webmcp-cli run tabs close <tabId>
     webmcp-cli run tabs switch <tabId>

示例:
  webmcp-cli list
  webmcp-cli run page-agent browserState
  webmcp-cli run tabs open https://example.com
`)
}
