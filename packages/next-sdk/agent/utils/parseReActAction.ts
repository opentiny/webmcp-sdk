import type { ToolSet } from 'ai'

/**
 * 解析 ReAct 格式的工具调用
 * 从模型输出文本中提取工具名称和参数
 * @param text - 模型输出的文本
 * @param availableTools - 可用的工具集合，用于验证工具名称
 * @returns 解析出的工具调用信息，如果未找到则返回 null
 */
export function parseReActAction(text: string, availableTools: ToolSet): { toolName: string; arguments: any } | null {
  if (!text || typeof text !== 'string') {
    return null
  }

  // 方法1: 解析标准 ReAct 格式 "Action: tool_name\nAction Input: {...}"
  const actionMatch = text.match(/Action:\s*([^\n]+)/i)
  const actionInputMatch = text.match(/Action Input:\s*([^\n]+)/i)

  if (actionMatch && actionInputMatch) {
    const toolName = actionMatch[1].trim()
    const actionInput = actionInputMatch[1].trim()

    // 验证工具名称是否存在
    if (!availableTools[toolName]) {
      return null
    }

    // 尝试解析 JSON 格式的参数
    let args: any = {}
    try {
      // 尝试直接解析 JSON
      args = JSON.parse(actionInput)
    } catch {
      // 如果不是 JSON，尝试提取 JSON 对象
      const jsonMatch = actionInput.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          args = JSON.parse(jsonMatch[0])
        } catch {
          // 如果还是解析失败，尝试作为字符串参数
          args = { input: actionInput }
        }
      } else {
        // 如果没有找到 JSON，将整个字符串作为参数
        args = { input: actionInput }
      }
    }

    return { toolName, arguments: args }
  }

  // 方法2: 解析 JSON 格式的工具调用
  // 格式: {"action": "tool_name", "action_input": {...}}
  try {
    const jsonMatch = text.match(/\{[\s\S]*"action"[\s\S]*\}/i)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const toolName = parsed.action || parsed.tool_name || parsed.tool
      const args = parsed.action_input || parsed.arguments || parsed.args || parsed.input || {}

      if (toolName && availableTools[toolName]) {
        return { toolName, arguments: args }
      }
    }
  } catch {
    // JSON 解析失败，继续尝试其他方法
  }

  // 方法3: 查找代码块中的工具调用
  // 格式: ```json\n{"action": "tool_name", ...}\n```
  const codeBlockMatch = text.match(/```(?:json)?\s*\{[\s\S]*"action"[\s\S]*\}\s*```/i)
  if (codeBlockMatch) {
    try {
      const jsonContent = codeBlockMatch[0]
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim()
      const parsed = JSON.parse(jsonContent)
      const toolName = parsed.action || parsed.tool_name || parsed.tool
      const args = parsed.action_input || parsed.arguments || parsed.args || parsed.input || {}

      if (toolName && availableTools[toolName]) {
        return { toolName, arguments: args }
      }
    } catch {
      // 解析失败，返回 null
    }
  }

  return null
}
