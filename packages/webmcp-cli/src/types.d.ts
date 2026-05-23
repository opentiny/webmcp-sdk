declare module 'chrome-remote-interface' {
  import { EventEmitter } from 'events'

  namespace CDP {
    interface Client extends EventEmitter {
      Browser: {
        getVersion(): Promise<{
          product: string
          protocolVersion: string
          userAgent: string
          jsVersion?: string
        }>
      }
      Target: {
        getTargets(): Promise<{
          targetInfos: Array<{
            title: string
            url: string
            type: string
            targetId: string
          }>
        }>
      }
      Page: {
        enable(): Promise<void>
        navigate(options: { url: string }): Promise<void>
        loadEventFired(): Promise<void>
        captureScreenshot(options?: { format?: string }): Promise<{ data: string }>
      }
      Runtime: {
        enable(): Promise<void>
        evaluate(options: { expression: string; returnByValue?: boolean }): Promise<{
          result: { value: any }
          exceptionDetails?: { text: string }
        }>
      }
      close(): Promise<void>
    }

    interface Options {
      port?: number
      host?: string
    }
  }

  function CDP(options?: CDP.Options): Promise<CDP.Client>

  export = CDP
}
