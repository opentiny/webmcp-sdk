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
