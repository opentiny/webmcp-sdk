// *********** user 开发 ***********
export { registerPageAgentTool } from './tools/page-agent-tool/page-agent-tool.ts'
export { registerOnPage, type RegisterInfo } from './user/index.ts'

// *********** agent 开发 ***********
export { NextAgent } from './next-agent.ts'

export type { PageServer, StreamableHttpServer, SSEServer, NextMcpServer, RemoteServer } from './servers/servers.d.ts'
