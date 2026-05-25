import { getRunCommandNames } from './commands/run-registry.js'
/**
 * 打印使用说明
 */
export function printUsage(): void {
    console.log(`
  WebMCP CLI - Chrome 远程调试工具
  
  用法:
    webmcp <command> [args]
  
  命令:
    list              查询浏览器当前情况（标签页、版本信息等）
    run <cmd> [args]  让浏览器执行命令
  
  run 子命令:
    ${getRunCommandNames().map((c) => `  ${c}`).join('\n  ')}
  
  示例:
    webmcp list
    webmcp run navigate https://example.com
    webmcp run screenshot output.png
    webmcp run evaluate document.title
    `)
  }