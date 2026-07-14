import { dynamicTool, jsonSchema, Tool, ToolSet } from 'ai'

/**
 * 浏览器内置 WebMCP 测试 API 的工具描述格式（Chrome document.modelContext）
 */
type BuiltinToolDescriptor = {
  name: string
  description?: string
  inputSchema?: {
    type?: string
    properties?: Record<string, unknown>
    required?: string[]
    [key: string]: unknown
  }
}

type BuiltinModelContextTesting = {
  listTools?: () => Promise<BuiltinToolDescriptor[]>
  getTools?: () => Promise<BuiltinToolDescriptor[]>
  executeTool?: (tool: { name: string }, input: string) => Promise<unknown>
}

/**
 * 将浏览器内置 WebMCP 的 `document.modelContext` 适配为 ai-sdk 的 ToolSet。
 *
 * 类似 getAISDKTools，但数据源是浏览器原生 API 而非 MCP client。
 * 工具执行时通过 `executeTool(toolObj, JSON.stringify(args))` 代理给浏览器。
 *
 * @param client - `document.modelContext` 对象
 * @returns ai-sdk 格式的 ToolSet，可直接传入 streamText/generateText 的 tools 参数
 */
export const getBuiltinMcpTools = async (client: object | undefined | null): Promise<ToolSet> => {
  const tools: Record<string, Tool> = {}
  if (!client) {
    return tools
  }

  const testing = client as BuiltinModelContextTesting

  // 优先使用 listTools，降级到 getTools
  const listFn = testing.listTools ?? testing.getTools
  if (!listFn) {
    return tools
  }

  const rawList = await listFn.call(testing)
  const list = Array.isArray(rawList) ? (rawList as BuiltinToolDescriptor[]) : []

  for (const descriptor of list) {
    const { name, description } = descriptor
    const rawInputSchema = descriptor.inputSchema
    let schemaObj: Record<string, any> = {}

    if (typeof rawInputSchema === 'string') {
      try {
        schemaObj = JSON.parse(rawInputSchema)
      } catch (e) {
        console.error('Failed to parse inputSchema in getBuiltinMcpTools:', e)
      }
    } else if (typeof rawInputSchema === 'object' && rawInputSchema !== null) {
      schemaObj = rawInputSchema as Record<string, any>
    }

    // 规范化 inputSchema：补全 properties/additionalProperties 字段
    const normalizedSchema = {
      type: 'object' as const,
      properties: (schemaObj.properties ?? {}) as Record<string, unknown>,
      ...(schemaObj.required ? { required: schemaObj.required } : {}),
      additionalProperties: false,
      ...schemaObj
    }

    tools[name] = dynamicTool({
      description: description ?? '',
      inputSchema: jsonSchema(normalizedSchema as Parameters<typeof jsonSchema>[0]),
      async execute(args) {
        if (!testing.executeTool) {
          throw new Error(`document.modelContext.executeTool is not available`)
        }
        return testing.executeTool(descriptor, JSON.stringify(args ?? {}))
      }
    })
  }

  return tools
}
