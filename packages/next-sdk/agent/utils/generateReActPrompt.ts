import type { ToolSet } from 'ai'

/**
 * 生成 ReAct 模式的工具描述提示词
 * 将工具集合转换为 ReAct 格式的文本描述，用于添加到系统提示词中
 * @param tools - 工具集合对象
 * @returns 格式化的工具描述字符串
 */
export function generateReActToolsPrompt(tools: ToolSet): string {
  const toolEntries = Object.entries(tools)

  if (toolEntries.length === 0) {
    return ''
  }

  let prompt = '\n\n## 可用工具列表\n\n'
  prompt += '你可以通过以下格式调用工具来完成任务：\n'
  prompt += '```\n'
  prompt += 'Action: <工具名称>\n'
  prompt += 'Action Input: <JSON格式的参数>\n'
  prompt += '```\n\n'
  prompt += '工具调用后，你将收到工具的执行结果（Observation），然后可以继续思考或调用其他工具。\n\n'
  prompt += '### 工具详情\n\n'

  toolEntries.forEach(([toolName, tool], index) => {
    const toolInfo = tool as any
    const description = toolInfo.description || '无描述'
    const schema = toolInfo.parameters || toolInfo.inputSchema || {}
    const properties = schema.properties || {}

    prompt += `${index + 1}. **${toolName}**\n`
    prompt += `   - 描述: ${description}\n`

    if (properties && Object.keys(properties).length > 0) {
      prompt += `   - 参数说明:\n`
      Object.entries(properties).forEach(([paramName, paramSchema]: [string, any]) => {
        const paramType = paramSchema.type || 'unknown'
        const paramDesc = paramSchema.description || ''
        const required = schema.required?.includes(paramName) ? ' (必填)' : ' (可选)'
        prompt += `     - ${paramName}: ${paramType}${required}${paramDesc ? ` - ${paramDesc}` : ''}\n`
      })
    }
    prompt += '\n'
  })

  prompt += '### 使用示例\n\n'
  prompt += '如果用户要求"获取今天的日期"，你可以这样调用工具：\n'
  prompt += '```\n'
  prompt += 'Action: get-today\n'
  prompt += 'Action Input: {}\n'
  prompt += '```\n\n'
  prompt += '然后等待工具返回结果（Observation），再根据结果给出最终答案。\n\n'
  prompt += '**重要提示**：\n'
  prompt += '- 必须严格按照格式调用工具，Action 和 Action Input 必须在一行\n'
  prompt += '- Action Input 必须是有效的 JSON 格式\n'
  prompt += '- 如果不需要调用工具，直接给出最终答案即可\n'

  return prompt
}

/**
 * 生成 Fara-7B / Qwen 模式的工具描述提示词（XML 格式）
 * @param tools - 工具集合对象
 * @returns 格式化的工具描述字符串
 */
export function generateFaraReActToolsPrompt(tools: ToolSet): string {
  const toolEntries = Object.entries(tools)

  if (toolEntries.length === 0) {
    return ''
  }

  let prompt = '\n\n# 工具调用\n\n'
  prompt += '你可以根据需要调用以下工具：\n\n'
  prompt += '<tools>\n'

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
  prompt += '<call>{"name": "toolName", "arguments": {"arg1": "value1"}}</call>\n\n'
  prompt += '工具执行后，你将收到 <tool_response> 格式的结果。你可以继续思考或完成任务。\n\n'
  prompt += '## 任务完成\n\n'
  prompt += '当任务完成或无法继续时，对于 computer 工具，请调用 `terminate` 操作：\n'
  prompt += '<call>{"name": "computer", "arguments": {"action": "terminate"}}</call>\n\n'
  prompt += '或者直接给出最终答案。\n'

  return prompt
}
