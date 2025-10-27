import { ProtocolWithReturn } from 'webext-bridge'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    //  content-script ===> background
    initWebMCP: ProtocolWithReturn<{ originUrl: string }, { success: boolean; msg: string }>

    // background ========> sidePanel
  }
}
