import { jsonSchema, tool, type ToolExecutionOptions, type ToolSet } from "ai";
import type { PageServer } from "./servers";
import type { ModelContextTesting } from "@mcp-b/webmcp-types";

/** 构建本window页面的工具集 */
export function buildPageTools(server: PageServer) {
  try {
    if (!server.client) {
      // 1. 缓存 client
      server.client = navigator.modelContextTesting!;

      // 2. 监听工具变化
      server.client.registerToolsChangedCallback(async () => {
        console.log("page 的client监听到了工具变化");
        buildPageTools(server);
      });
    }

    // 3. 获取工具集
    const client: ModelContextTesting = server.client!;
    const tools: ToolSet = {};
    client.listTools().forEach((currTool) => {
      tools[currTool.name] = tool({
        description: currTool.description,
        inputSchema: jsonSchema(JSON.parse(currTool.inputSchema as string)),
        // params是入参， aiContext 包含了 {toolCallId, messages,abortSignal}
        execute: async (params: any, aiContext: ToolExecutionOptions) => {
          return client.executeTool(currTool.name, JSON.stringify(params)); // webmcp规范， 参数要字符串化。
        },
      });
    });
    server.tools = tools;
  } catch (error) {
    console.error("buildPageTools error", error);
  }
}
