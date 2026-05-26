declare module 'chrome-remote-interface' {
  import { EventEmitter } from 'events'

  namespace CDP {
    interface TargetDescriptor {
      id: string
      title: string
      url: string
      type: string
    }

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
        createTarget(options: { url: string }): Promise<{ targetId: string }>
        activateTarget(options: { targetId: string }): Promise<void>
        closeTarget(options: { targetId: string }): Promise<void>
      }
      Page: {
        enable(): Promise<void>
        navigate(options: { url: string }): Promise<void>
        loadEventFired(): Promise<void>
        captureScreenshot(options?: { format?: string }): Promise<{ data: string }>
      }
      Runtime: {
        enable(): Promise<void>
        evaluate(options: {
          expression: string
          awaitPromise?: boolean
          returnByValue?: boolean
        }): Promise<{
          result: { value: unknown }
          exceptionDetails?: {
            text?: string
            exception?: { description?: string }
          }
        }>
      }
      close(): Promise<void>
    }

    interface Options {
      port?: number
      host?: string
      target?: TargetDescriptor | string
    }

    function List(options?: { port?: number; host?: string }): Promise<TargetDescriptor[]>
  }

  function CDP(options?: CDP.Options): Promise<CDP.Client>

  export = CDP
}
