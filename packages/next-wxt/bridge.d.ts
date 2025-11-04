import { ProtocolWithReturn } from 'webext-bridge'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    //  ---------------------------content-script ===> background -------------------
    initWebMCP: ProtocolWithReturn<{ originUrl: string }, { success: boolean; msg: string }>
    'focus-tab': ProtocolWithReturn<{}, void>

    // -----------------------------content ========> sidePanel --------------------------------
    // 网页注册mcp工具完成发出通知
    'mcp-server-register': ProtocolWithReturn<{ sessionId: string; serverInfo: any }, void>
    'mcp-server-register-to-side': ProtocolWithReturn<
      { sessionId: string; serverInfo: any },
      { success: boolean; msg: string }
    >

    'mcp-server-to-client': ProtocolWithReturn<{ sessionId: string; mcpMessage: any }, void> // mcpMessage 实际是 JSONRPCMessage 对象。避免引包

    // -----------------------------sidePanel ========> content --------------------------------
    'mcp-client-to-server': ProtocolWithReturn<{ sessionId: string; mcpMessage: any }, void>
    'sidepanel-ready': ProtocolWithReturn<{ timestamp: number }, void>
    'sidepanel-ready-to-page': ProtocolWithReturn<{ timestamp: number }, void>

    // ---------------------------- 任意 ======> content-script --------------
    'page-app-message': ProtocolWithReturn<{ status: string; message: string }, void>

    // 转发 page 上的日志到 content
    'server-transport-log-event': ProtocolWithReturn<{ message: string; extra: any }, void>
    'client-transport-log-event': ProtocolWithReturn<{ message: string; extra: any }, void>
  }
}
