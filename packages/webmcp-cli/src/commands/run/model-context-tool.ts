import type CDP from 'chrome-remote-interface'
import { evaluateOnPage } from '../../cdp/page-session.js'

interface ToolDescriptor {
  name: string
  inputSchema?: string | { properties?: Record<string, unknown>; required?: string[] }
}

function parseInputSchema(schema: ToolDescriptor['inputSchema']): {
  properties: Record<string, unknown>
  required: string[]
} {
  if (!schema) {
    return { properties: {}, required: [] }
  }
  if (typeof schema === 'string') {
    try {
      const parsed = JSON.parse(schema) as { properties?: Record<string, unknown>; required?: string[] }
      return {
        properties: parsed.properties ?? {},
        required: parsed.required ?? []
      }
    } catch {
      return { properties: {}, required: [] }
    }
  }
  return {
    properties: schema.properties ?? {},
    required: schema.required ?? []
  }
}

function buildToolArgs(tool: ToolDescriptor, cliArgs: string[]): Record<string, string> {
  const { properties, required } = parseInputSchema(tool.inputSchema)
  const propNames = Object.keys(properties)

  if (propNames.length === 0 && cliArgs.length === 0) {
    return {}
  }

  const result: Record<string, string> = {}

  if (propNames.length === 1 && cliArgs.length >= 1) {
    result[propNames[0]] = cliArgs.join(' ')
    return result
  }

  for (let i = 0; i < cliArgs.length; i++) {
    const key = propNames[i] ?? required[i]
    if (key) {
      result[key] = cliArgs[i]
    }
  }

  for (const key of required) {
    if (!(key in result)) {
      console.error(`命令有误: 缺少工具参数 "${key}"`)
      process.exit(1)
    }
  }

  return result
}

/**
 * webmcp run <toolName> [toolArgs...] — 执行 navigator.modelContext 注册的工具
 */
export async function runModelContextToolCommand(
  client: CDP.Client,
  toolName: string,
  cliArgs: string[]
): Promise<void> {
  const tools = await evaluateOnPage<ToolDescriptor[]>(
    client,
    `(async () => {
      const ctx = navigator.modelContextTesting
      if (!ctx || !ctx.listTools) return []
      return await ctx.listTools()
    })()`,
    true
  )

  const tool = tools.find((t) => t.name === toolName)
  if (!tool) {
    console.error(`命令有误: 未找到工具 "${toolName}"`)
    process.exit(1)
  }

  const toolArgs = buildToolArgs(tool, cliArgs)
  const argsJson = JSON.stringify(toolArgs)

  const expression = `(async () => {
    const ctx = navigator.modelContextTesting
    if (!ctx || !ctx.executeTool) throw new Error('modelContextTesting.executeTool 不可用')
    return await ctx.executeTool(${JSON.stringify(toolName)}, ${JSON.stringify(argsJson)})
  })()`

  const result = await evaluateOnPage(client, expression, true)
  console.log(JSON.stringify(result, null, 2))
}
