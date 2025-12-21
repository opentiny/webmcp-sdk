import type { ToolSet } from 'ai'

/**
 * 解析 ReAct 格式的工具调用
 * 从模型输出文本中提取工具名称和参数
 * 现在统一使用 XML 格式（<call> 标签），同时保留对其他格式的兼容性支持
 * @param text - 模型输出的文本
 * @param availableTools - 可用的工具集合，用于验证工具名称
 * @returns 解析出的工具调用信息，如果未找到则返回 null
 */
export function parseReActAction(text: string, availableTools: ToolSet): { toolName: string; arguments: any } | null {
  if (!text || typeof text !== 'string') {
    return null
  }

  // XML 格式 <tool_call>
  const toolCallMatchLegacy = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/i)
  if (toolCallMatchLegacy) {
    try {
      const jsonContent = toolCallMatchLegacy[1].trim()
      const parsed = JSON.parse(jsonContent)
      const toolName = parsed.name || parsed.action || parsed.tool
      const args = parsed.arguments || parsed.args || parsed.input || {}

      if (toolName && availableTools[toolName]) {
        return { toolName, arguments: args }
      }
    } catch {
      // 解析失败，继续尝试其他方法
    }
  }

  return null
}
