import { dynamicTool, jsonSchema, Tool, ToolExecutionOptions, ToolSet } from 'ai'

/**
 * 浏览器内置 WebMCP 测试 API 的工具描述格式（Chrome navigator.modelContextTesting）
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
  executeTool?: (name: string, input: string) => Promise<unknown>
}

/**
 * 将浏览器内置 WebMCP 的 `navigator.modelContext` 适配为 ai-sdk 的 ToolSet。
 *
 * 类似 getAISDKTools，但数据源是浏览器原生 API 而非 MCP client。
 * 工具执行时通过 `executeTool(name, JSON.stringify(args))` 代理给浏览器。
 *
 * @param client - `navigator.modelContext` 对象
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
    const { name, description, inputSchema = {} } = descriptor

    // 规范化 inputSchema：补全 properties/additionalProperties 字段
    const normalizedSchema = {
      type: 'object' as const,
      properties: (inputSchema.properties ?? {}) as Record<string, unknown>,
      ...(inputSchema.required ? { required: inputSchema.required } : {}),
      additionalProperties: false,
      ...inputSchema
    }

    tools[name] = dynamicTool({
      description: description ?? '',
      inputSchema: jsonSchema(normalizedSchema as Parameters<typeof jsonSchema>[0]),
      async execute(args) {
        if (!testing.executeTool) {
          throw new Error(`navigator.modelContextTesting.executeTool is not available`)
        }
        return testing.executeTool(name, JSON.stringify(args ?? {}))
      }
    })
  }

  return tools
}
