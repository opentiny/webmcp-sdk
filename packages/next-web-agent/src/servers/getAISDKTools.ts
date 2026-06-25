import type { Client } from "@modelcontextprotocol/sdk/client";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types";
import { dynamicTool, jsonSchema, type Tool, type ToolExecutionOptions, type ToolSet } from "ai";

/**
 * 快速从官方 mcp 或 WebMcpClient 这2种client中读取 tools 数组，并转换成 ai-sdk 的tool的对象格式。
 * @params client  标准的 MCP Client
 * @returns 包含dynamicTool对象的对象键值对。
 */
export const getAISDKTools = async (client: Client): Promise<ToolSet> => {
  const tools: Record<string, Tool> = {};

  try {
    const listToolsResult = await client.listTools();

    for (const { name, description, inputSchema } of listToolsResult.tools) {
      tools[name] = dynamicTool({
        description,
        inputSchema: jsonSchema({
          ...inputSchema,
          properties: (inputSchema.properties as Record<string, any>) ?? {},
          additionalProperties: false,
        }),
        execute: async (args: any, options: ToolExecutionOptions): Promise<any> => {
          return client.callTool({ name, arguments: args }, CallToolResultSchema, {
            signal: options?.abortSignal,
          });
        },
      });
    }
  } catch (error) {
    console.error("getAISDKTools error", error);
  }
  return tools;
};
