import { MessageChannelServerTransport, createTransportPair } from '@opentiny/next'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodObject, ZodLiteral, ZodType, ZodOptional } from 'zod'
import {
  SetLevelRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  ListResourcesRequestSchema,
  RootsListChangedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js'
import type {
  ToolCallback,
  RegisteredTool,
  PromptCallback,
  RegisteredPrompt,
  ResourceMetadata,
  ResourceTemplate,
  RegisteredResource,
  ReadResourceCallback,
  RegisteredResourceTemplate,
  ReadResourceTemplateCallback
} from '@modelcontextprotocol/sdk/server/mcp.js'
import type {
  Result,
  Request,
  Notification,
  Implementation,
  ToolAnnotations,
  ServerCapabilities,
  ClientCapabilities,
  ElicitResult,
  ElicitRequest,
  ListRootsRequest,
  CreateMessageRequest,
  LoggingMessageNotification,
  ResourceUpdatedNotification,
  SubscribeRequest,
  UnsubscribeRequest,
  SetLevelRequest,
  ListResourcesRequest,
  RootsListChangedNotification
} from '@modelcontextprotocol/sdk/types.js'
import type { ZodRawShape, ZodTypeDef } from 'zod'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js'
import type {
  RequestOptions,
  NotificationOptions,
  RequestHandlerExtra
} from '@modelcontextprotocol/sdk/shared/protocol.js'

type PromptArgsRawShape = {
  [k: string]: ZodType<string, ZodTypeDef, string> | ZodOptional<ZodType<string, ZodTypeDef, string>>
}

type SendRequestT = Request
type SendNotificationT = Notification
type SendResultT = Result

/**
 * High-level Web MCP server that provides a simpler API for working with resources, tools, and prompts.
 * For advanced usage (like sending notifications or setting custom request handlers), use the underlying
 * Server instance available via the `server` property.
 */
export class WebMcpServer {
  public readonly server: McpServer
  public transport: Transport | undefined

  constructor(serverInfo?: Implementation, options?: ServerOptions) {
    const info: Implementation = {
      name: 'web-mcp-server',
      version: '1.0.0'
    }

    const capabilities: ServerCapabilities = {
      prompts: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      tools: { listChanged: true },
      completions: {},
      logging: {}
    }

    this.server = new McpServer(serverInfo || info, options || { capabilities })

    this.server.server.oninitialized = () => {
      this.oninitialized?.()
    }

    this.server.server.onclose = () => {
      this.onclose?.()
    }

    this.server.server.onerror = (error: Error) => {
      this.onerror?.(error)
    }

    this.server.server.setRequestHandler(SetLevelRequestSchema, async () => {
      return {}
    })
  }

  /**
   * Connects the server to a transport via the specified option.
   */
  async connect(options: Transport | string): Promise<Transport> {
    if (typeof (options as Transport)['start'] === 'function') {
      this.transport = options as Transport
      this.transport.onclose = undefined
      this.transport.onerror = undefined
      this.transport.onmessage = undefined
    } else {
      this.transport = new MessageChannelServerTransport(options as string)
      await (this.transport as MessageChannelServerTransport).listen()
    }

    await this.server.connect(this.transport)
    return this.transport
  }

  /**
   * Callback for when initialization has fully completed (i.e., the client has sent an `initialized` notification).
   */
  oninitialized?: () => void

  /**
   * Callback for when the connection is closed for any reason.
   *
   * This is invoked when close() is called as well.
   */
  onclose?: () => void

  /**
   * Callback for when an error occurs.
   *
   * Note that errors are not necessarily fatal; they are used for reporting any kind of exceptional condition out of band.
   */
  onerror?: (error: Error) => void

  /**
   * Closes the connection.
   */
  async close(): Promise<void> {
    await this.server.close()
  }

  /**
   * Registers a tool with a config object and callback.
   */
  registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    config: {
      title?: string
      description?: string
      inputSchema?: InputArgs
      outputSchema?: OutputArgs
      annotations?: ToolAnnotations
    },
    cb: ToolCallback<InputArgs>
  ): RegisteredTool {
    return this.server.registerTool(name, config, cb)
  }

  /**
   * Registers a prompt with a config object and callback.
   */
  registerPrompt<Args extends PromptArgsRawShape>(
    name: string,
    config: {
      title?: string
      description?: string
      argsSchema?: Args
    },
    cb: PromptCallback<Args>
  ): RegisteredPrompt {
    return this.server.registerPrompt(name, config, cb)
  }

  /**
   * Registers a resource with a config object and callback.
   * For static resources, use a URI string. For dynamic resources, use a ResourceTemplate.
   */
  registerResource(
    name: string,
    uriOrTemplate: string,
    config: ResourceMetadata,
    readCallback: ReadResourceCallback
  ): RegisteredResource
  registerResource(
    name: string,
    uriOrTemplate: ResourceTemplate,
    config: ResourceMetadata,
    readCallback: ReadResourceTemplateCallback
  ): RegisteredResourceTemplate
  registerResource(
    name: string,
    uriOrTemplate: string | ResourceTemplate,
    config: ResourceMetadata,
    readCallback: ReadResourceCallback | ReadResourceTemplateCallback
  ): RegisteredResource | RegisteredResourceTemplate {
    if (typeof uriOrTemplate === 'string') {
      return this.server.registerResource(name, uriOrTemplate, config, readCallback as ReadResourceCallback)
    } else {
      return this.server.registerResource(name, uriOrTemplate, config, readCallback as ReadResourceTemplateCallback)
    }
  }

  /**
   * Checks if the server is connected to a transport.
   * @returns True if the server is connected
   */
  isConnected() {
    return this.server.isConnected()
  }

  /**
   * Sends a resource list changed event to the client, if connected.
   */
  sendResourceListChanged() {
    this.server.sendResourceListChanged()
  }

  /**
   * Sends a tool list changed event to the client, if connected.
   */
  sendToolListChanged() {
    this.server.sendToolListChanged()
  }

  /**
   * Sends a prompt list changed event to the client, if connected.
   */
  sendPromptListChanged() {
    this.server.sendPromptListChanged()
  }

  /**
   * After initialization has completed, this will be populated with the client's reported capabilities.
   */
  getClientCapabilities(): ClientCapabilities | undefined {
    return this.server.server.getClientCapabilities()
  }

  /**
   * After initialization has completed, this will be populated with information about the client's name and version.
   */
  getClientVersion(): Implementation | undefined {
    return this.server.server.getClientVersion()
  }

  /**
   * Sends a ping to the client to check if it is still connected.
   */
  async ping() {
    return await this.server.server.ping()
  }

  /**
   * Creates a LLM message to be sent to the client.
   */
  async createMessage(params: CreateMessageRequest['params'], options?: RequestOptions) {
    return await this.server.server.createMessage(params, options)
  }

  /**
   * Elicits input from the client, such as a prompt or resource.
   */
  async elicitInput(params: ElicitRequest['params'], options?: RequestOptions): Promise<ElicitResult> {
    return await this.server.server.elicitInput(params, options)
  }

  /**
   * Lists the root resources available to the client.
   */
  async listRoots(params?: ListRootsRequest['params'], options?: RequestOptions) {
    return await this.server.server.listRoots(params, options)
  }

  /**
   * Sends a logging message to the client.
   */
  async sendLoggingMessage(params: LoggingMessageNotification['params']) {
    return await this.server.server.sendLoggingMessage(params)
  }

  /**
   * Sends a resource updated notification to the client.
   */
  async sendResourceUpdated(params: ResourceUpdatedNotification['params']) {
    return await this.server.server.sendResourceUpdated(params)
  }

  /**
   * Sends a request and wait for a response.
   *
   * Do not use this method to emit notifications! Use notification() instead.
   */
  request<T extends ZodType<object>>(
    request: SendRequestT,
    resultSchema: T,
    options?: RequestOptions
  ): Promise<z.infer<T>> {
    return this.server.server.request(request, resultSchema, options)
  }

  /**
   * Emits a notification, which is a one-way message that does not expect a response.
   */
  async notification(notification: SendNotificationT, options?: NotificationOptions): Promise<void> {
    return await this.server.server.notification(notification, options)
  }

  /**
   * Registers a handler to invoke when this protocol object receives a request with the given method.
   *
   * Note that this will replace any previous request handler for the same method.
   */
  setRequestHandler<
    T extends ZodObject<{
      method: ZodLiteral<string>
    }>
  >(
    requestSchema: T,
    handler: (
      request: z.infer<T>,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.server.server.setRequestHandler(requestSchema, handler)
  }

  /**
   * Removes the request handler for the given method.
   */
  removeRequestHandler(method: string): void {
    this.server.server.removeRequestHandler(method)
  }

  /**
   * Registers a handler to invoke when this protocol object receives a notification with the given method.
   *
   * Note that this will replace any previous notification handler for the same method.
   */
  setNotificationHandler<
    T extends ZodObject<{
      method: ZodLiteral<string>
    }>
  >(notificationSchema: T, handler: (notification: z.infer<T>) => void | Promise<void>): void {
    this.server.server.setNotificationHandler(notificationSchema, handler)
  }

  /**
   * Removes the notification handler for the given method.
   */
  removeNotificationHandler(method: string): void {
    this.server.server.removeNotificationHandler(method)
  }

  /**
   * Registers a handler for the subscribe request.
   */
  onSubscribe(
    handler: (
      request: SubscribeRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.server.server.setRequestHandler(SubscribeRequestSchema, handler)
  }

  /**
   * Registers a handler for the unsubscribe request.
   */
  onUnsubscribe(
    handler: (
      request: UnsubscribeRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.server.server.setRequestHandler(UnsubscribeRequestSchema, handler)
  }

  /**
   * Registers a handler for the set log level request.
   */
  onSetLogLevel(
    handler: (
      request: SetLevelRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.server.server.setRequestHandler(SetLevelRequestSchema, handler)
  }

  /**
   * Registers a handler for the list tools request.
   */
  onListResources(
    handler: (
      request: ListResourcesRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.server.server.setRequestHandler(ListResourcesRequestSchema, handler)
  }

  /**
   * Registers a handler for the roots list changed notification.
   */
  onRootsListChanged(handler: (notification: RootsListChangedNotification) => void | Promise<void>): void {
    this.server.server.setNotificationHandler(RootsListChangedNotificationSchema, handler)
  }

  /**
   * Close the transport for window.addEventListener('pagehide')
   */
  async onPagehide(event: PageTransitionEvent) {
    if (event.persisted) {
      return
    }

    if (this.transport && typeof this.transport['close'] === 'function') {
      await this.transport.close()
    }
  }
}

/**
 * Creates a new MessageChannelServerTransport instance.
 */
export const createMessageChannelServerTransport = (endpoint: string, globalObject?: object) =>
  new MessageChannelServerTransport(endpoint, globalObject)

/**
 * Creates a pair of transports for communication between a server and client using MessageChannel.
 */
export const createMessageChannelPairTransport = () => createTransportPair()

/**
 * Checks if the transport is a MessageChannelServerTransport.
 */
export const isMessageChannelServerTransport = (transport: unknown): transport is MessageChannelServerTransport =>
  transport instanceof MessageChannelServerTransport

/**
 * Checks if the server is an instance of MCP Server.
 */
export const isMcpServer = (server: unknown): server is McpServer => server instanceof McpServer
