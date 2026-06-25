import { ref } from "vue";
import type { NextMcpServer, RemoteServer } from "../servers/servers";
import type { NextAgent } from "../next-agent";
import type { ToolSet } from "ai";
import {
  beforeRemoveServer,
  buildRemoteTools,
  isRemoteServer,
} from "../servers/remoteServer";
import { buildPageTools } from "../servers/pageServer";
/** 管理自定义的MCP服务 */
export function useMcpServers(agent: NextAgent) {
  /** 所有MCP服务， 尽量不要直接操作mcpServers, 而是调用 addMcpServer(server)*/
  const mcpServers = ref<NextMcpServer[]>([]);
  const ignoreToolNames = ref<string[]>([]);
  // 最终传递给 ToolLoopAgent 的工具，不要修改引用地址
  const tools: ToolSet = {};
  /** 生成服务ID */
  let _guid = 0;

  /** 添加MCP服务， iframe，page的服务只允许添加一次 */
  async function addMcpServer(server: NextMcpServer) {
    const onceServerTypes = ["iframe", "page"];
    if (
      onceServerTypes.includes(server.type) &&
      mcpServers.value.find((s) => onceServerTypes.includes(s.type))
    ) {
      console.warn(`MCP服务 ${server.type} 已存在， 请重复添加`);
      return;
    }
    server.id = `${server.type}-${_guid++}`;
    mcpServers.value.push(server);
    // 添加后就立即刷新工具
    await getToolsFromServer(server);
  }
  /** 添加MCP服务 */
  async function removeMcpServer(serverOrId: NextMcpServer | string) {
    const server: NextMcpServer | undefined =
      typeof serverOrId === "string"
        ? mcpServers.value.find((s) => s.id === serverOrId)
        : serverOrId;
    if (!server) return;

    if (isRemoteServer(server)) {
      await beforeRemoveServer(server as RemoteServer);
    }

    mcpServers.value = mcpServers.value.filter((s) => s !== server);
  }
  /** 获取MCP服务的工具 */
  async function getToolsFromServer(server: NextMcpServer) {
    if (server.type === "page") {
      buildPageTools(server);
    }
    if (isRemoteServer(server)) {
      await buildRemoteTools(server as RemoteServer);
    }
  }

  // 每次对话前，刷新工具。 tools三个来源： settings.tools, extraTools, mcpServers.tools， 一个删除。
  agent.on("chatStart", async () => {
    // 清空工具
    Object.keys(tools).forEach((key) => {
      delete tools[key];
    });
    // 合并初始工具
    Object.assign(tools, agent.settings.tools || {}, agent.extraTools);
    // 合并 mcpServers 中的工具
    for (const server of mcpServers.value) {
      await getToolsFromServer(server);
      Object.assign(tools, server.tools || {});
    }
    // 移除忽略的工具
    ignoreToolNames.value.forEach((name) => {
      delete tools[name];
    });
  });

  return {
    mcpServers,
    ignoreToolNames,
    tools,
    addMcpServer,
    removeMcpServer,
  };
}
