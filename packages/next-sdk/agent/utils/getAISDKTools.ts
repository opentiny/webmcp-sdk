import { dynamicTool, jsonSchema, Tool, ToolCallOptions, ToolSet } from 'ai'
import { WebMcpClient } from '../../WebMcpClient'

/**
 * 快速从官方 mcp 或 WebMcpClient 这2种client中读取 tools 数组，并转换成 ai-sdk 的tool的对象格式。
 * @params client  一个已连接好的 WebMcpClient
 * @returns ai-sdk的dynamicTool对象。
 */
export const getAISDKTools = async (client: WebMcpClient): Promise<ToolSet> => {
  const tools: Record<string, Tool> = {}

  try {
    const listToolsResult = await client.listTools()

    for (const { name, description, inputSchema } of listToolsResult.tools) {
      const execute = async (args: any, options: ToolCallOptions): Promise<any> => {
        return client.callTool({ name, arguments: args }, { signal: options?.abortSignal })
      }

      tools[name] = dynamicTool({
        description,
        inputSchema: jsonSchema({
          ...inputSchema,
          properties: (inputSchema.properties as Record<string, any>) ?? {},
          additionalProperties: false
        }),
        execute
      })
    }

    return tools
  } catch (error) {
    throw error
  }
}
