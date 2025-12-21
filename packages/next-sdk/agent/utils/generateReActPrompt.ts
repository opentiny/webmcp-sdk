import type { ToolSet } from 'ai'

/**
 * 生成 ReAct 模式的工具描述提示词（统一使用 XML 格式）
 * 将工具集合转换为 ReAct 格式的文本描述，用于添加到系统提示词中
 * @param tools - 工具集合对象
 * @returns 格式化的工具描述字符串
 */
export function generateReActToolsPrompt(tools: ToolSet): string {
  const toolEntries = Object.entries(tools)

  // 如果没有工具，返回空字符串
  if (toolEntries.length === 0) {
    return ''
  }

  let prompt = '\n\n# 工具调用\n\n'
  prompt += '你可以根据需要调用以下工具：\n\n'
  prompt += '<tools>\n'

  // 遍历所有工具，生成工具描述
  toolEntries.forEach(([toolName, tool]) => {
    const toolInfo = tool as any
    const description = toolInfo.description || '无描述'
    const schema = toolInfo.parameters || toolInfo.inputSchema || {}

    // 构造类似 OpenAI function 的格式但放在 XML 中
    const toolJson = {
      name: toolName,
      description: description,
      parameters: schema
    }
    prompt += `${JSON.stringify(toolJson, null, 2)}\n`
  })

  prompt += '</tools>\n\n'
  prompt += '## 工具调用格式\n\n'
  prompt += '要调用工具，请使用以下 XML 格式：\n'
  prompt += 'Thought: [你的思考过程]\n'
  prompt += '<tool_call>{"name": "toolName", "arguments": {"arg1": "value1"}}</tool_call>\n\n'
  prompt += '工具执行后，你将收到 <tool_response> 格式的结果。你可以继续思考或调用其他工具。\n\n'
  prompt += '## 使用示例\n\n'
  prompt += '如果用户要求"获取今天的日期"，你可以这样调用工具：\n'
  prompt += 'Thought: 用户想要获取今天的日期，我需要调用日期相关的工具。\n'
  prompt += '<tool_call>{"name": "get-today", "arguments": {}}</tool_call>\n\n'
  prompt += '然后等待工具返回结果（Observation），再根据结果给出最终答案。\n\n'
  prompt += '## 任务完成\n\n'
  prompt += '当任务完成或无法继续时，直接给出最终答案即可。\n\n'
  prompt += '**重要提示**：\n'
  prompt += '- 必须严格按照 XML 格式调用工具\n'
  prompt += '- arguments 必须是有效的 JSON 格式\n'
  prompt += '- 如果不需要调用工具，直接给出最终答案即可\n'

  return prompt
}
