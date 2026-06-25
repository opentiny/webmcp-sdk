// modelContext注册工具返回永远是字符串格式：
// 1. 普通字符串  eg. "hello world"
// 2. 普通对象  eg. { name: "张三", age: 18 }
// 3. mcp标准的对象  eg. { content: [{ type: "text", text: "this is result" }] }

import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

// 将工具返回的字符串，转换为mcp标准的对象.
export function parseToolResult(strToolResult: string) {
  let toolResult: any
  // 1. 判断用户tool是否返回了普通字符串
  try {
    // 符合3. mcp标准的对象
    toolResult = JSON.parse(strToolResult)
    if (!CallToolResultSchema.parse(toolResult)) {
      // 符合2. 普通对象
      toolResult = { content: [{ type: 'text', text: strToolResult }] }
    }
  } catch (error) {
    // 符合1. 普通字符串
    toolResult = { content: [{ type: 'text', text: strToolResult }] }
  }

  return toolResult
}
