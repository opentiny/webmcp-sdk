// *********** user 开发 ***********
export { registerPageAgentTool } from './tools/page-agent-tool/page-agent-tool.ts'
export { registerOnPage, type RegisterInfo } from './user/index.ts'

// *********** remoter 开发 ***********
export { NextAgent } from './next-agent.ts'

export type { PageServer, IframeServer, StreamableHttpServer, SSEServer, NextMcpServer } from './servers/servers.d.ts'
