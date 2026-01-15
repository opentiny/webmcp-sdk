import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js'
import { z, ZodObject, ZodLiteral, ZodType } from 'zod'
import {
  ElicitRequestSchema,
  CallToolResultSchema,
  ListRootsRequestSchema,
  CreateMessageRequestSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema
} from '@modelcontextprotocol/sdk/types.js'
import {
  MessageChannelClientTransport,
  sseOptions,
  streamOptions,
  createSseProxy,
  createStreamProxy,
  createSocketProxy
} from '@opentiny/next'
import type {
  Result,
  Request,
  Notification,
  Implementation,
  ServerCapabilities,
  ClientCapabilities,
  LoggingLevel,
  CompleteRequest,
  CallToolRequest,
  ListToolsRequest,
  GetPromptRequest,
  SubscribeRequest,
  UnsubscribeRequest,
  ListPromptsRequest,
  ReadResourceRequest,
  ListResourcesRequest,
  ListResourceTemplatesRequest,
  ElicitRequest,
  CreateMessageRequest,
  ListRootsRequest,
  ToolListChangedNotification,
  PromptListChangedNotification,
  ResourceListChangedNotification,
  ResourceUpdatedNotification,
  LoggingMessageNotification
} from '@modelcontextprotocol/sdk/types.js'
import type { ProxyOptions } from '@opentiny/next'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { ClientOptions } from '@modelcontextprotocol/sdk/client/index.js'
import type { SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse.js'
import type { StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type {
  RequestOptions,
  NotificationOptions,
  RequestHandlerExtra
} from '@modelcontextprotocol/sdk/shared/protocol.js'

/**
 * Options for configuring the server transport.
 */
export interface ClientConnectOptions {
  url: string
  token?: string
  sessionId?: string
  type?: 'channel' | 'sse' | 'stream' | 'socket'
  agent?: boolean
  onError?: (error: Error) => void
}

type SendRequestT = Request
type SendNotificationT = Notification
type SendResultT = Result

/**
 * An MCP client on top of a pluggable transport.
 * The client will automatically begin the initialization flow with the server when connect() is called.
 */
export class WebMcpClient {
  public readonly client: Client
  public transport: Transport | undefined

  constructor(clientInfo?: Implementation, options?: ClientOptions) {
    const info: Implementation = {
      name: 'web-mcp-client',
      version: '1.0.0'
    }

    const capabilities: ClientCapabilities = {
      roots: { listChanged: true },
      sampling: {},
      elicitation: {}
    }

    this.client = new Client(clientInfo || info, options || { capabilities })

    this.client.onclose = () => {
      this.onclose?.()
    }

    this.client.onerror = (error: Error) => {
      this.onerror?.(error)
    }
  }

  /**
   * Connects the client to a transport via the specified option.
   */
  async connect(options: Transport | ClientConnectOptions): Promise<{ transport: Transport; sessionId: string }> {
    if (typeof (options as Transport)['start'] === 'function') {
      this.transport = options as Transport
      this.transport.onclose = undefined
      this.transport.onerror = undefined
      this.transport.onmessage = undefined
      await this.client.connect(this.transport)
      return { transport: this.transport, sessionId: this.transport.sessionId as string }
    }

    const { url, token, sessionId, type, agent, onError } = options as ClientConnectOptions

    if (agent === true) {
      const proxyOptions: ProxyOptions = { client: this.client, url, token, sessionId }

      let response

      const connectProxy = async () => {
        const { transport, sessionId } =
          type === 'sse'
            ? await createSseProxy(proxyOptions)
            : type === 'socket'
              ? await createSocketProxy(proxyOptions)
              : await createStreamProxy(proxyOptions)

        transport.onerror = async (error: Error) => {
          onError?.(error)
        }

        response = { transport, sessionId }
      }

      await connectProxy()
      return response as unknown as { transport: Transport; sessionId: string }
    }

    const endpoint = new URL(url)
    let transport: Transport | undefined

    if (type === 'channel') {
      transport = new MessageChannelClientTransport(url)
      await this.client.connect(transport)
    }

    if (type === 'sse') {
      const opts = sseOptions(token, sessionId) as SSEClientTransportOptions
      transport = new SSEClientTransport(endpoint, opts)
      await this.client.connect(transport)
    }

    if (type === 'socket') {
      transport = new WebSocketClientTransport(new URL(`${url}?sessionId=${sessionId}&token=${token}`))
      transport.sessionId = sessionId
      await this.client.connect(transport)
    }

    if (typeof transport === 'undefined') {
      const opts = streamOptions(token, sessionId) as StreamableHTTPClientTransportOptions
      transport = new StreamableHTTPClientTransport(endpoint, opts)
      await this.client.connect(transport)
    }

    this.transport = transport
    return { transport: this.transport, sessionId: this.transport.sessionId as string }
  }

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
    await this.client.close()
  }

  /**
   * After initialization has completed, this will be populated with the server's reported capabilities.
   */
  getServerCapabilities(): ServerCapabilities | undefined {
    return this.client.getServerCapabilities()
  }

  /**
   * After initialization has completed, this will be populated with information about the server's name and version.
   */
  getServerVersion(): Implementation | undefined {
    return this.client.getServerVersion()
  }

  /**
   * After initialization has completed, this may be populated with information about the server's instructions.
   */
  getInstructions(): string | undefined {
    return this.client.getInstructions()
  }

  /**
   * Sends a ping to the server to check if it is still connected.
   */
  async ping(options?: RequestOptions) {
    return await this.client.ping(options)
  }

  /**
   * Sends a completion request to the server.
   */
  async complete(params: CompleteRequest['params'], options?: RequestOptions) {
    return await this.client.complete(params, options)
  }

  /**
   * Sends a request for setting the logging level to the server.
   */
  async setLoggingLevel(level: LoggingLevel, options?: RequestOptions) {
    return await this.client.setLoggingLevel(level, options)
  }

  /**
   * Gets the prompt with the given params from the server.
   */
  async getPrompt(params: GetPromptRequest['params'], options?: RequestOptions) {
    return await this.client.getPrompt(params, options)
  }

  /**
   * Lists all prompts available on the server.
   */
  async listPrompts(params?: ListPromptsRequest['params'], options?: RequestOptions) {
    return await this.client.listPrompts(params, options)
  }

  /**
   * Lists all resources available on the server.
   */
  async listResources(params?: ListResourcesRequest['params'], options?: RequestOptions) {
    return await this.client.listResources(params, options)
  }

  /**
   * Lists all resource templates available on the server.
   */
  async listResourceTemplates(params?: ListResourceTemplatesRequest['params'], options?: RequestOptions) {
    return await this.client.listResourceTemplates(params, options)
  }

  /**
   * Reads the resource with the given params from the server.
   */
  async readResource(params: ReadResourceRequest['params'], options?: RequestOptions) {
    return await this.client.readResource(params, options)
  }

  /**
   * Subscribes to a resource on the server.
   */
  async subscribeResource(params: SubscribeRequest['params'], options?: RequestOptions) {
    return await this.client.subscribeResource(params, options)
  }

  /**
   * Unsubscribes from a resource on the server.
   */
  async unsubscribeResource(params: UnsubscribeRequest['params'], options?: RequestOptions) {
    return await this.client.unsubscribeResource(params, options)
  }

  /**
   * Calls a tool on the server with the given parameters.
   */
  async callTool(params: CallToolRequest['params'], options?: RequestOptions) {
    return await this.client.callTool(params, CallToolResultSchema, options)
  }

  /**
   * Lists all tools available on the server.
   */
  async listTools(params?: ListToolsRequest['params'], options?: RequestOptions) {
    return await this.client.listTools(params, options)
  }

  /**
   * Sends a notification for the roots list changed event to the server.
   */
  async sendRootsListChanged() {
    return await this.client.sendRootsListChanged()
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
    return this.client.request(request, resultSchema, options)
  }

  /**
   * Emits a notification, which is a one-way message that does not expect a response.
   */
  async notification(notification: SendNotificationT, options?: NotificationOptions): Promise<void> {
    return await this.client.notification(notification, options)
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
    this.client.setRequestHandler(requestSchema, handler)
  }

  /**
   * Removes the request handler for the given method.
   */
  removeRequestHandler(method: string): void {
    this.client.removeRequestHandler(method)
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
    this.client.setNotificationHandler(notificationSchema, handler)
  }

  /**
   * Removes the notification handler for the given method.
   */
  removeNotificationHandler(method: string): void {
    this.client.removeNotificationHandler(method)
  }

  /**
   * Registers a handler for the elicitation request.
   */
  onElicit(
    handler: (
      request: ElicitRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.client.setRequestHandler(ElicitRequestSchema, handler)
  }

  /**
   * Registers a handler for the create LLM message request.
   */
  onCreateMessage(
    handler: (
      request: CreateMessageRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.client.setRequestHandler(CreateMessageRequestSchema, handler)
  }

  /**
   * Registers a handler for the list roots request.
   */
  onListRoots(
    handler: (
      request: ListRootsRequest,
      extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
    ) => SendResultT | Promise<SendResultT>
  ): void {
    this.client.setRequestHandler(ListRootsRequestSchema, handler)
  }

  /**
   * Registers a handler for the tool list changed notification.
   */
  onToolListChanged(handler: (notification: ToolListChangedNotification) => void | Promise<void>): void {
    this.client.setNotificationHandler(ToolListChangedNotificationSchema, handler)
  }

  /**
   * Registers a handler for the prompt list changed notification.
   */
  onPromptListChanged(handler: (notification: PromptListChangedNotification) => void | Promise<void>): void {
    this.client.setNotificationHandler(PromptListChangedNotificationSchema, handler)
  }

  /**
   * Registers a handler for the resource list changed notification.
   */
  onResourceListChanged(handler: (notification: ResourceListChangedNotification) => void | Promise<void>): void {
    this.client.setNotificationHandler(ResourceListChangedNotificationSchema, handler)
  }

  /**
   * Registers a handler for the resource updated notification.
   */
  onResourceUpdated(handler: (notification: ResourceUpdatedNotification) => void | Promise<void>): void {
    this.client.setNotificationHandler(ResourceUpdatedNotificationSchema, handler)
  }

  /**
   * Registers a handler for the logging message notification.
   */
  onLoggingMessage(handler: (notification: LoggingMessageNotification) => void | Promise<void>): void {
    this.client.setNotificationHandler(LoggingMessageNotificationSchema, handler)
  }

  /**
   * Close the transport for window.addEventListener('pagehide')
   */
  async onPagehide(event: PageTransitionEvent) {
    if (event.persisted) {
      return
    }

    if (isStreamableHTTPClientTransport(this.transport)) {
      await this.transport.terminateSession()
    } else if (this.transport && typeof this.transport['close'] === 'function') {
      await this.transport.close()
    }
  }
}

/**
 * Creates a new SSEClientTransport instance.
 */
export const createSSEClientTransport = (url: URL, opts?: SSEClientTransportOptions) =>
  new SSEClientTransport(url, opts)

/**
 * Creates a new StreamableHTTPClientTransport instance.
 */
export const createStreamableHTTPClientTransport = (url: URL, opts?: StreamableHTTPClientTransportOptions) =>
  new StreamableHTTPClientTransport(url, opts)

/**
 * Creates a new MessageChannelClientTransport instance.
 */
export const createMessageChannelClientTransport = (endpoint: string, globalObject?: object) =>
  new MessageChannelClientTransport(endpoint, globalObject)

/**
 * Checks if the transport is a SSEClientTransport.
 */
export const isSSEClientTransport = (transport: unknown): transport is SSEClientTransport =>
  transport instanceof SSEClientTransport

/**
 * Checks if the transport is a StreamableHTTPClientTransport.
 */
export const isStreamableHTTPClientTransport = (transport: unknown): transport is StreamableHTTPClientTransport =>
  transport instanceof StreamableHTTPClientTransport

/**
 * Checks if the transport is a MessageChannelClientTransport.
 */
export const isMessageChannelClientTransport = (transport: unknown): transport is MessageChannelClientTransport =>
  transport instanceof MessageChannelClientTransport

/**
 * Checks if the client is an instance of MCP Client.
 */
export const isMcpClient = (client: unknown): client is Client => client instanceof Client
