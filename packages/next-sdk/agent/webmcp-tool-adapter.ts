/**
 * 把浏览器 WebMCP（document.modelContext）适配成主流工具调用面：
 * - MCP 的 tools/list + tools/call
 * - TinyRobot Chat 的 useChatRuntime({ mcp })
 *
 * Chat 的响应式由调用方注入，本模块不依赖 Vue 或 tiny-robot-chat。
 */

export interface WebMcpToolDescriptor {
  name: string
  description?: string
  inputSchema?: unknown
}

export interface WebMcpModelContext {
  listTools?: () => Promise<WebMcpToolDescriptor[]>
  getTools?: () => Promise<WebMcpToolDescriptor[]>
  executeTool?: (tool: WebMcpToolDescriptor, input: string) => Promise<unknown>
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

export interface WebMcpListedTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
}

export interface WebMcpChatServerState {
  id: string
  name: string
  description?: string
  installed: boolean
  enabled: boolean
  loading?: boolean
  error?: unknown
}

export interface WebMcpChatToolState {
  id: string
  name: string
  description?: string
  enabled: boolean
}

export interface WebMcpChatToolDefinition {
  serverId: string
  id: string
  name: string
  originalName: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface WebMcpStateBox<T> {
  readonly value: T
  set: (next: T) => void
}

export interface WebMcpChatAdapterBridge {
  onScope: (start: () => void, stop: () => void) => void
  box: <T>(initial: T) => WebMcpStateBox<T>
}

export interface WebMcpChatMcpAdapter {
  runtime: {
    servers: { readonly value: readonly WebMcpChatServerState[] }
    tools: { readonly value: Readonly<Record<string, readonly WebMcpChatToolState[]>> }
    addServer: (id: string) => Promise<void> | void
    removeServer: (id: string) => Promise<void> | void
    setServerEnabled: (id: string, enabled: boolean) => Promise<void> | void
    setToolEnabled: (serverId: string, toolId: string, enabled: boolean) => Promise<void> | void
  }
  listTools: (
    serverIds: readonly string[],
    toolIds: Readonly<Record<string, readonly string[]>>
  ) => Promise<readonly WebMcpChatToolDefinition[]>
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<string>
}

export interface CreateWebMcpToolAdapterOptions {
  serverId?: string
  serverName?: string
  description?: string
  getContext?: () => WebMcpModelContext | undefined
}

export interface WebMcpToolAdapter {
  readonly serverId: string
  listTools: () => Promise<WebMcpListedTool[]>
  callTool: (name: string, args?: Record<string, unknown>) => Promise<string>
  subscribe: (listener: () => void) => () => void
  createChatMcpAdapter: (bridge: WebMcpChatAdapterBridge) => WebMcpChatMcpAdapter
}

function readDefaultContext(): WebMcpModelContext | undefined {
  if (typeof document === 'undefined') return undefined
  return (document as Document & { modelContext?: WebMcpModelContext }).modelContext
}

export function normalizeWebMcpInputSchema(raw: unknown): Record<string, unknown> {
  let schema: Record<string, unknown> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) schema = { ...(raw as Record<string, unknown>) }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) schema = parsed as Record<string, unknown>
    } catch {
      schema = {}
    }
  }
  return {
    ...schema,
    type: typeof schema.type === 'string' ? schema.type : 'object',
    properties: schema.properties && typeof schema.properties === 'object' ? schema.properties : {}
  }
}

export function readWebMcpToolText(result: unknown): string {
  if (typeof result === 'string') return result
  const content = (result as { content?: unknown } | null)?.content
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : String((part as { text?: unknown })?.text ?? '')))
      .filter(Boolean)
      .join('\n')
    if (text.trim()) return text
  }
  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

export function createWebMcpToolAdapter(options: CreateWebMcpToolAdapterOptions = {}): WebMcpToolAdapter {
  const serverId = options.serverId ?? 'webmcp'
  const getContext = options.getContext ?? readDefaultContext
  const descriptors = new Map<string, WebMcpToolDescriptor>()
  const listeners = new Set<() => void>()
  let boundContext: WebMcpModelContext | undefined
  let refreshQueue: Promise<void> = Promise.resolve()
  let syncChat: (() => void) | undefined

  function context() {
    return getContext()
  }

  async function refresh() {
    const task = refreshQueue.then(async () => {
      const ctx = context()
      const listFn = ctx?.listTools ?? ctx?.getTools
      const raw = listFn ? await listFn.call(ctx) : []
      const listed = Array.isArray(raw) ? raw : []
      descriptors.clear()
      for (const tool of listed) {
        if (tool?.name && !descriptors.has(tool.name)) descriptors.set(tool.name, tool)
      }
      syncChat?.()
    })
    refreshQueue = task.catch(() => undefined)
    await task
  }

  function onToolChange() {
    void refresh().then(() => {
      listeners.forEach((listener) => listener())
    })
  }

  function bind() {
    const ctx = context()
    if (!ctx || ctx === boundContext) return
    boundContext?.removeEventListener?.('toolchange', onToolChange)
    ctx.addEventListener?.('toolchange', onToolChange)
    boundContext = ctx
  }

  function unbind() {
    boundContext?.removeEventListener?.('toolchange', onToolChange)
    boundContext = undefined
  }

  async function callTool(name: string, args?: Record<string, unknown>) {
    if (!descriptors.has(name)) await refresh()
    const ctx = context()
    const tool = descriptors.get(name)
    if (!ctx?.executeTool || !tool) throw new Error(`WebMCP 工具不可用：${name}`)
    return readWebMcpToolText(await ctx.executeTool(tool, JSON.stringify(args ?? {})))
  }

  return {
    serverId,
    async listTools() {
      await refresh()
      return [...descriptors.values()].map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: normalizeWebMcpInputSchema(tool.inputSchema)
      }))
    },
    callTool,
    subscribe(listener) {
      listeners.add(listener)
      bind()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && !syncChat) unbind()
      }
    },
    createChatMcpAdapter(bridge) {
      const server = bridge.box<WebMcpChatServerState>({
        id: serverId,
        name: options.serverName ?? '页面 WebMCP',
        description: options.description ?? 'document.modelContext 上的工具',
        installed: true,
        enabled: true
      })
      const tools = bridge.box<WebMcpChatToolState[]>([])

      const syncTools = () => {
        const enabled = new Map(tools.value.map((item) => [item.id, item.enabled]))
        tools.set(
          [...descriptors.values()].map((tool) => ({
            id: tool.name,
            name: tool.name,
            description: tool.description,
            enabled: enabled.get(tool.name) ?? true
          }))
        )
      }
      syncChat = syncTools

      const start = () => {
        bind()
        void refresh()
      }
      const stop = () => {
        syncChat = undefined
        if (listeners.size === 0) unbind()
      }
      bridge.onScope(start, stop)

      return {
        runtime: {
          servers: {
            get value() {
              return [{ ...server.value }]
            }
          },
          tools: {
            get value() {
              return { [serverId]: tools.value.map((item) => ({ ...item })) }
            }
          },
          async addServer(id) {
            if (id !== serverId) return
            server.set({ ...server.value, installed: true, enabled: true, error: undefined })
            await refresh()
            tools.set(tools.value.map((item) => ({ ...item, enabled: true })))
          },
          removeServer(id) {
            if (id !== serverId) return
            server.set({ ...server.value, installed: false, enabled: false, loading: undefined, error: undefined })
            tools.set([])
            descriptors.clear()
          },
          async setServerEnabled(id, enabled) {
            if (id !== serverId) return
            if (enabled && !server.value.installed) throw new Error(`MCP server is not installed: ${id}`)
            server.set({ ...server.value, enabled })
            if (enabled && tools.value.length === 0) await refresh()
            tools.set(tools.value.map((item) => ({ ...item, enabled })))
          },
          setToolEnabled(id, toolId, enabled) {
            if (id !== serverId) return
            if (!tools.value.some((item) => item.id === toolId)) {
              throw new Error(`Unknown MCP tool: ${id}/${toolId}`)
            }
            const next = tools.value.map((item) => (item.id === toolId ? { ...item, enabled } : item))
            tools.set(next)
            server.set({ ...server.value, enabled: next.some((item) => item.enabled) })
          }
        },
        async listTools(_serverIds, selected) {
          if (descriptors.size === 0) await refresh()
          return (selected[serverId] ?? []).flatMap((id) => {
            const tool = descriptors.get(id)
            return tool
              ? [
                  {
                    serverId,
                    id,
                    name: `${serverId}__${id}`,
                    originalName: id,
                    description: tool.description,
                    inputSchema: normalizeWebMcpInputSchema(tool.inputSchema)
                  }
                ]
              : []
          })
        },
        async callTool(id, name, args) {
          if (id !== serverId) throw new Error(`Unknown MCP server: ${id}`)
          return callTool(name, args)
        }
      }
    }
  }
}
