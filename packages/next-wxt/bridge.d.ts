import { ProtocolWithReturn } from 'webext-bridge'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    //  content-script ===> background
    initWebMCP: ProtocolWithReturn<{ originUrl: string }, { success: boolean; msg: string }>

    // content ========> sidePanel 网页注册mcp工具完成发出通知
    'mcp-server-register': ProtocolWithReturn<{ sessionId: string; serverInfo: any }, { success: boolean; msg: string }>

    // content ========> sidePanel 网页注销mcp工具发出通知
    'unregister-mcp-session': ProtocolWithReturn<{ sessionId: string }, { success: boolean; msg: string }>
  }
}
