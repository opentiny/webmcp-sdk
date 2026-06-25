import { Client } from "@modelcontextprotocol/sdk/client";
import { getAISDKTools } from "./getAISDKTools.ts";
import type { NextMcpServer, RemoteServer } from "./servers";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { MessageChannelClientTransport } from "@opentiny/next";
import { ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types";

export const isRemoteServer = (server: NextMcpServer) => ["iframe", "streamable-http", "sse"].includes(server.type);

/** 构建远程服务的工具 */
export async function buildRemoteTools(server: RemoteServer) {
  try {
    if (!server.client) {
      // 1. 缓存 client
      const client = new Client({ name: "web-mcp-client", version: "1.0.0" });
      let transport;
      if (server.type === "streamable-http") {
        transport = new StreamableHTTPClientTransport(new URL(server.url!));
      } else if (server.type === "sse") {
        transport = new SSEClientTransport(new URL(server.url!));
      } else if (server.type === "iframe") {
        transport = new MessageChannelClientTransport(server.endpoint || "endpoint", window.parent);
      }

      await client.connect(transport!);
      server.client = client;

      // 2. 监听工具变化
      client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
        console.log("remoter 的client监听到了工具变化");
        const aiSdkTools = await getAISDKTools(server.client!);
        server.tools = aiSdkTools;
      });
    }

    // 3. 获取工具
    server.tools = await getAISDKTools(server.client!);
  } catch (error) {
    console.error("buildRemoteTools error", error);
  }
}

/** 移除远程服务的工具 */
export async function beforeRemoveServer(server: RemoteServer) {
  if (server.client) {
    await server.client.close();
    server.client = undefined;
    server.tools = undefined;
  }
}
