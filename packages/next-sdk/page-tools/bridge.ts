/**
 * page-tools/bridge - Web MCP 页面工具桥接模块（框架无关）
 *
 * 解决 Web-MCP 工具动态加载问题：工具定义（mcp-servers/）不直接写业务逻辑，
 * 而是通过 window.postMessage 将调用转发给目标页面，页面处理后返回结果。
 *
 * 核心 API：
 *   - setNavigator(fn)    在应用入口注册导航函数
 *   - withPageTools(server)
 *                         包装 WebMcpServer，让 registerTool 第三个参数
 *                         同时支持原始回调函数和路由配置对象（RouteConfig），
 *                         并提供 server.unregisterTool / 工具状态查询能力
 *   - registerPageTool()  在目标页面激活工具处理器，返回 cleanup 函数
 */

import type { ZodRawShape, ZodTypeAny } from 'zod'
import { z } from 'zod'
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { WebMcpServer } from '../WebMcpServer'
import { randomUUID } from '../utils/uuid'
import type { ToolInvokeEffectConfig } from './effects'
import { hideToolInvokeEffect, resolveRuntimeEffectConfig, showToolInvokeEffect } from './effects'

// 消息类型常量，使用命名空间前缀避免冲突
const MSG_TOOL_CALL = 'next-sdk:tool-call'
const MSG_TOOL_RESPONSE = 'next-sdk:tool-response'
const MSG_PAGE_READY = 'next-sdk:page-ready'
/** 页面卸载广播消息 */
export const MSG_PAGE_LEAVE = 'next-sdk:page-leave'
/** iframe 内 Remoter 就绪后向父窗口发送，父窗口回传 route-state-initial */
export const MSG_REMOTER_READY = 'next-sdk:remoter-ready'
/** 历史兼容消息类型（当前简化方案不再使用） */
export const MSG_ROUTE_STATE_INITIAL = 'next-sdk:route-state-initial'
/** 工具目录发生变更（新增/删除/路由重绑定） */
export const MSG_TOOL_CATALOG_CHANGED = 'next-sdk:tool-catalog-changed'

// 已激活页面注册表：路由路径 → 当前页面已挂载的工具名集合
const activePages = new Map<string, Set<string>>()

// 路由路径规范化：去除尾部斜杠，空路径兜底为 '/'
const normalizeRoute = (value: string) => value.replace(/\/+$/, '') || '/'

type BroadcastTarget = { win: Window; origin: string }

// 跨窗口广播目标：同窗口默认 [window]，iframe 场景下会加入 remoter 的 contentWindow
const broadcastTargets = new Set<BroadcastTarget>()

function initBroadcastTargets() {
  if (typeof window !== 'undefined') {
    broadcastTargets.add({ win: window, origin: window.location.origin || '*' })
  }
}
initBroadcastTargets()

/** 向所有广播目标发送路由变更消息（同窗口 + iframe 均能收到） */
function broadcastRouteChange(type: string, route: string, extra: Record<string, unknown> = {}) {
  const msg = { type, route, ...extra }
  broadcastTargets.forEach(({ win, origin }) => {
    try {
      win.postMessage(msg, origin)
    } catch {
      // 跨域 iframe 可能抛错，忽略
    }
  })
}

/** 监听 iframe 内 Remoter 的 remoter-ready，并加入广播目标 */
function setupIframeRemoterBridge() {
  if (typeof window === 'undefined') return
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== MSG_REMOTER_READY || !event.source) return
    // 仅接受与当前页面同源的 remoter，避免潜在的 XSS 风险
    if (event.origin !== window.location.origin) return
    const target = event.source as Window
    broadcastTargets.add({ win: target, origin: event.origin || '*' })
  })
}
setupIframeRemoterBridge()

// runtime 一体化注册的工具（用于引用计数管理）
const runtimeRegisteredTools = new Map<string, { tool: RegisteredTool; route: string; refCount: number }>()

function broadcastToolCatalogChanged() {
  if (typeof window === 'undefined') return
  const payload = {
    type: MSG_TOOL_CATALOG_CHANGED
  }
  broadcastTargets.forEach(({ win, origin }) => {
    try {
      win.postMessage(payload, origin)
    } catch {
      // ignore
    }
  })
}

function notifyServerToolListChanged(server: unknown) {
  const maybeServer = server as { sendToolListChanged?: () => void }
  try {
    maybeServer.sendToolListChanged?.()
  } catch {
    // ignore
  }
}

/**
 * 获取通过 withPageTools + RouteConfig 注册的全部工具路由映射。
 * 为保持向后兼容，仍保留该 API；简化模式下不再维护此映射，始终返回空 Map。
 */
export function getToolRouteMap(): ReadonlyMap<string, string> {
  return new Map()
}

/**
 * 获取当前已激活（已挂载）的路由集合。
 * 即调用了 registerPageTool 且尚未执行 cleanup 的页面路由。
 * @returns 当前激活路由的 Set 快照
 */
export function getActiveRoutes(): Set<string> {
  return new Set(activePages.keys())
}

/**
 * 获取当前已激活页面上的工具清单快照。
 * key 为 route，value 为该页面当前可执行的工具名数组。
 */
export function getActivePageTools(): ReadonlyMap<string, string[]> {
  const snapshot = new Map<string, string[]>()
  activePages.forEach((toolNames, route) => {
    snapshot.set(route, Array.from(toolNames))
  })
  return snapshot
}

function isToolReadyOnRoute(route: string, toolName: string): boolean {
  const toolNames = activePages.get(route)
  return !!toolNames && toolNames.has(toolName)
}

type JsonSchema = {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'
  description?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: Array<string | number | boolean | null>
  const?: string | number | boolean | null
  anyOf?: JsonSchema[]
  additionalProperties?: boolean
}

type BrowserBuiltinModelContextTool = {
  name: string
  description?: string
  inputSchema?: JsonSchema
  execute: (params: Record<string, unknown>) => unknown | Promise<unknown>
}

type BrowserBuiltinModelContext = {
  registerTool: (tool: BrowserBuiltinModelContextTool) => unknown | Promise<unknown>
  unregisterTool?: (arg: unknown) => unknown | Promise<unknown>
}

type BrowserBuiltinModelContextTesting = {
  listTools?: () => unknown[] | Promise<unknown[]>
  getTools?: () => unknown[] | Promise<unknown[]>
  provideContext?: (init: unknown) => unknown | Promise<unknown>
  clearContext?: () => unknown | Promise<unknown>
  executeTool?: (name: string, input: string) => unknown | Promise<unknown>
}

type NavigatorWithBuiltinMcp = Navigator & {
  modelContext?: BrowserBuiltinModelContext
  modelContextTesting?: BrowserBuiltinModelContextTesting
}

const nativeRegisteredTools = new Set<string>()
const nativeToolDisposers = new Map<string, () => unknown | Promise<unknown>>()
const nativeRegisteredToolDefs = new Map<string, BrowserBuiltinModelContextTool>()
const nativeRegisterTasks = new Map<string, Promise<void>>()
const BUILTIN_REMOVE_PATCH_SYMBOL = Symbol('builtin-remove-patched')

function attachBuiltinUnregisterOnRemove(name: string, tool: RegisteredTool): RegisteredTool {
  const mutableTool = tool as RegisteredTool & {
    remove?: () => void
    [BUILTIN_REMOVE_PATCH_SYMBOL]?: boolean
  }
  if (mutableTool[BUILTIN_REMOVE_PATCH_SYMBOL]) return tool
  if (typeof mutableTool.remove !== 'function') return tool

  const originalRemove = mutableTool.remove.bind(mutableTool)
  mutableTool.remove = () => {
    try {
      originalRemove()
    } finally {
      void unregisterBuiltinWebMcpTool(name)
    }
  }
  mutableTool[BUILTIN_REMOVE_PATCH_SYMBOL] = true
  return mutableTool
}

function getBuiltinModelContext(): BrowserBuiltinModelContext | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as NavigatorWithBuiltinMcp
  if (!nav.modelContext?.registerTool) return null
  return nav.modelContext
}

function getBuiltinModelContextTesting(): BrowserBuiltinModelContextTesting | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as NavigatorWithBuiltinMcp
  return nav.modelContextTesting ?? null
}

function isWebMcpDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & { __NEXT_SDK_WEBMCP_DEBUG__?: boolean }
  if (w.__NEXT_SDK_WEBMCP_DEBUG__ === true) return true
  try {
    return window.localStorage?.getItem('next-sdk:webmcp-debug') === '1'
  } catch {
    return false
  }
}

function debugWebMcpLog(event: string, payload: Record<string, unknown> = {}) {
  if (!isWebMcpDebugEnabled()) return
  try {
    console.info('[next-sdk/webmcp]', event, payload)
  } catch {
    // ignore
  }
}

async function debugBuiltinToolSnapshot(event: string) {
  if (!isWebMcpDebugEnabled()) return
  const testingApi = getBuiltinModelContextTesting()
  if (!testingApi) {
    debugWebMcpLog(`${event}:snapshot`, { available: false })
    return
  }
  try {
    const list = testingApi.listTools ?? testingApi.getTools
    if (!list) {
      debugWebMcpLog(`${event}:snapshot`, { available: false, reason: 'no-list-method' })
      return
    }
    const result = await list()
    const tools = Array.isArray(result) ? result : []
    const names = tools
      .map((item) => {
        if (!item || typeof item !== 'object') return ''
        return String((item as { name?: unknown }).name ?? '')
      })
      .filter(Boolean)
    debugWebMcpLog(`${event}:snapshot`, { count: names.length, names })
  } catch (error) {
    debugWebMcpLog(`${event}:snapshot-error`, { error: error instanceof Error ? error.message : String(error) })
  }
}

function tryDirectBuiltinUnregisterByName(name: string) {
  const modelContext = getBuiltinModelContext()
  if (!modelContext?.unregisterTool) {
    debugWebMcpLog('direct-unregister-skip', { name, reason: 'missing-unregister' })
    return
  }
  debugWebMcpLog('direct-unregister-start', { name })
  try {
    const result = modelContext.unregisterTool.call(modelContext, name)
    if (result && typeof result === 'object' && 'then' in result) {
      void (result as Promise<unknown>)
        .then(() => {
          debugWebMcpLog('direct-unregister-done', { name, async: true })
          void debugBuiltinToolSnapshot(`direct-unregister-done:${name}`)
        })
        .catch((error) => {
          debugWebMcpLog('direct-unregister-error', { name, async: true, error: error instanceof Error ? error.message : String(error) })
        })
      return
    }
    debugWebMcpLog('direct-unregister-done', { name, async: false })
    void debugBuiltinToolSnapshot(`direct-unregister-done:${name}`)
  } catch {
    debugWebMcpLog('direct-unregister-error', { name, async: false })
  }
}

function resolveBuiltinToolDisposer(result: unknown): (() => unknown | Promise<unknown>) | null {
  if (typeof result === 'function') {
    return result as () => unknown | Promise<unknown>
  }
  if (!result || typeof result !== 'object') {
    return null
  }
  const value = result as {
    unregister?: () => unknown | Promise<unknown>
    remove?: () => unknown | Promise<unknown>
    dispose?: () => unknown | Promise<unknown>
    close?: () => unknown | Promise<unknown>
  }
  if (typeof value.unregister === 'function') return value.unregister.bind(value)
  if (typeof value.remove === 'function') return value.remove.bind(value)
  if (typeof value.dispose === 'function') return value.dispose.bind(value)
  if (typeof value.close === 'function') return value.close.bind(value)
  return null
}

export function isBuiltinWebMcpSupported(): boolean {
  return !!getBuiltinModelContext()
}

function getSchemaTypeName(schema: ZodTypeAny): string | undefined {
  return (schema as { _def?: { typeName?: string } })._def?.typeName
}

function getSchemaDescription(schema: ZodTypeAny): string | undefined {
  return (schema as { description?: string }).description
}

function withSchemaDescription(schema: ZodTypeAny, base: JsonSchema): JsonSchema {
  const description = getSchemaDescription(schema)
  return description ? { ...base, description } : base
}

function isOptionalSchema(schema: ZodTypeAny): boolean {
  const typeName = getSchemaTypeName(schema)
  if (typeName === z.ZodFirstPartyTypeKind.ZodOptional || typeName === z.ZodFirstPartyTypeKind.ZodDefault) {
    return true
  }
  if (typeName === z.ZodFirstPartyTypeKind.ZodEffects) {
    const inner = (schema as { _def: { schema: ZodTypeAny } })._def.schema
    return isOptionalSchema(inner)
  }
  return false
}

function toPrimitiveJsonType(value: unknown): JsonSchema['type'] {
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value === null) return 'null'
  return undefined
}

function zodTypeToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const typeName = getSchemaTypeName(schema)

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return withSchemaDescription(schema, { type: 'string' })
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return withSchemaDescription(schema, { type: 'number' })
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return withSchemaDescription(schema, { type: 'boolean' })
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const itemSchema = (schema as { _def: { type: ZodTypeAny } })._def.type
      return withSchemaDescription(schema, { type: 'array', items: zodTypeToJsonSchema(itemSchema) })
    }
    case z.ZodFirstPartyTypeKind.ZodEnum: {
      const values = (schema as unknown as { options: string[] }).options ?? []
      return withSchemaDescription(schema, { type: 'string', enum: values })
    }
    case z.ZodFirstPartyTypeKind.ZodNativeEnum: {
      const rawValues = Object.values((schema as { _def: { values: Record<string, unknown> } })._def.values)
      const enumValues = rawValues.filter(
        (value): value is string | number => typeof value === 'string' || typeof value === 'number'
      )
      return withSchemaDescription(schema, { enum: enumValues })
    }
    case z.ZodFirstPartyTypeKind.ZodLiteral: {
      const literalValue = (schema as { _def: { value: unknown } })._def.value
      const primitiveType = toPrimitiveJsonType(literalValue)
      return withSchemaDescription(schema, {
        ...(primitiveType ? { type: primitiveType } : {}),
        const: (literalValue as string | number | boolean | null) ?? null
      })
    }
    case z.ZodFirstPartyTypeKind.ZodUnion: {
      const options = (schema as { _def: { options: ZodTypeAny[] } })._def.options ?? []
      return withSchemaDescription(schema, { anyOf: options.map((item) => zodTypeToJsonSchema(item)) })
    }
    case z.ZodFirstPartyTypeKind.ZodNullable: {
      const inner = (schema as { _def: { innerType: ZodTypeAny } })._def.innerType
      return withSchemaDescription(schema, { anyOf: [zodTypeToJsonSchema(inner), { type: 'null' }] })
    }
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const schemaDef = schema as { shape?: ZodRawShape; _def?: { shape?: ZodRawShape | (() => ZodRawShape) } }
      const shape =
        schemaDef.shape ??
        (typeof schemaDef._def?.shape === 'function' ? schemaDef._def.shape() : schemaDef._def?.shape) ??
        {}
      return withSchemaDescription(schema, zodShapeToJsonSchema(shape))
    }
    case z.ZodFirstPartyTypeKind.ZodEffects: {
      const inner = (schema as { _def: { schema: ZodTypeAny } })._def.schema
      return withSchemaDescription(schema, zodTypeToJsonSchema(inner))
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      const inner = (schema as { _def: { innerType: ZodTypeAny } })._def.innerType
      return withSchemaDescription(schema, zodTypeToJsonSchema(inner))
    }
    default:
      return withSchemaDescription(schema, {})
  }
}

function zodShapeToJsonSchema(shape: ZodRawShape = {}): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  const required: string[] = []

  Object.entries(shape).forEach(([key, schema]) => {
    properties[key] = zodTypeToJsonSchema(schema as ZodTypeAny)
    if (!isOptionalSchema(schema as ZodTypeAny)) {
      required.push(key)
    }
  })

  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false
  }
}

export async function registerBuiltinWebMcpTool(options: {
  name: string
  description?: string
  inputSchema?: ZodRawShape
  execute: (params: Record<string, unknown>) => unknown | Promise<unknown>
}): Promise<boolean> {
  const modelContext = getBuiltinModelContext()
  if (!modelContext) {
    debugWebMcpLog('register-builtin-skip', { name: options.name, reason: 'unsupported' })
    return false
  }

  if (nativeRegisteredTools.has(options.name)) {
    debugWebMcpLog('register-builtin-skip', { name: options.name, reason: 'already-registered' })
    return true
  }

  debugWebMcpLog('register-builtin-start', { name: options.name })
  const task = (async () => {
    const toolDefinition: BrowserBuiltinModelContextTool = {
      name: options.name,
      description: options.description,
      inputSchema: zodShapeToJsonSchema(options.inputSchema ?? {}),
      execute: options.execute
    }
    const result = await modelContext.registerTool(toolDefinition)
    const disposer = resolveBuiltinToolDisposer(result)
    if (disposer) {
      nativeToolDisposers.set(options.name, disposer)
    }
    nativeRegisteredToolDefs.set(options.name, toolDefinition)
    nativeRegisteredTools.add(options.name)
    debugWebMcpLog('register-builtin-success', { name: options.name, hasDisposer: !!disposer })
    void debugBuiltinToolSnapshot(`register-success:${options.name}`)
  })()
  nativeRegisterTasks.set(options.name, task)

  try {
    await task
    return true
  } catch (error) {
    debugWebMcpLog('register-builtin-error', {
      name: options.name,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  } finally {
    nativeRegisterTasks.delete(options.name)
  }
}

export async function unregisterBuiltinWebMcpTool(name: string): Promise<boolean> {
  debugWebMcpLog('unregister-builtin-start', { name })
  const cleanup = () => {
    nativeToolDisposers.delete(name)
    nativeRegisteredToolDefs.delete(name)
    nativeRegisteredTools.delete(name)
  }

  const pendingRegister = nativeRegisterTasks.get(name)
  if (pendingRegister) {
    try {
      await pendingRegister
    } catch {
      // ignore
    }
  }

  const disposer = nativeToolDisposers.get(name)
  if (disposer) {
    try {
      await disposer()
      cleanup()
      debugWebMcpLog('unregister-builtin-success', { name, method: 'disposer' })
      void debugBuiltinToolSnapshot(`unregister-success:${name}`)
      return true
    } catch (error) {
      debugWebMcpLog('unregister-builtin-disposer-error', {
        name,
        error: error instanceof Error ? error.message : String(error)
      })
      // 继续尝试 modelContext.unregisterTool 的多签名兜底
    }
  }

  const modelContext = getBuiltinModelContext()
  if (!modelContext) {
    cleanup()
    debugWebMcpLog('unregister-builtin-skip', { name, reason: 'unsupported' })
    return false
  }
  if (!modelContext.unregisterTool) {
    cleanup()
    debugWebMcpLog('unregister-builtin-skip', { name, reason: 'missing-unregister' })
    return false
  }

  const definition = nativeRegisteredToolDefs.get(name)
  const candidates: unknown[] = [name, { name }, { toolName: name }, { tool: { name } }, definition].filter(Boolean)
  for (const candidate of candidates) {
    try {
      debugWebMcpLog('unregister-builtin-try', { name, candidate })
      const result = await modelContext.unregisterTool.call(modelContext, candidate)
      if (result === false) continue
      cleanup()
      debugWebMcpLog('unregister-builtin-success', { name, method: 'unregisterTool', candidate })
      void debugBuiltinToolSnapshot(`unregister-success:${name}`)
      return true
    } catch (error) {
      debugWebMcpLog('unregister-builtin-try-error', {
        name,
        candidate,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  cleanup()
  debugWebMcpLog('unregister-builtin-failed', { name })
  void debugBuiltinToolSnapshot(`unregister-failed:${name}`)
  return false
}

export function hasBuiltinWebMcpTool(name: string): boolean {
  return nativeRegisteredTools.has(name)
}

export async function forceResetBuiltinWebMcpTools(): Promise<void> {
  const names = Array.from(nativeRegisteredTools)
  for (const name of names) {
    try {
      await unregisterBuiltinWebMcpTool(name)
    } catch {
      // ignore
    }
  }
}

export async function listBuiltinWebMcpTools(): Promise<unknown[]> {
  const testingApi = getBuiltinModelContextTesting()
  if (!testingApi?.listTools) return []
  try {
    const result = await testingApi.listTools()
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

export async function executeBuiltinWebMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const testingApi = getBuiltinModelContextTesting()
  if (!testingApi?.executeTool) {
    throw new Error('当前浏览器不支持 navigator.modelContextTesting.executeTool。')
  }
  return await testingApi.executeTool(name, JSON.stringify(input ?? {}))
}

// 应用注册的导航函数，由 setNavigator 设置
let _navigator: ((route: string) => void | Promise<void>) | null = null

/**
 * 注册应用的导航函数，通常在应用入口（如 main.ts）调用一次。
 * @param fn 导航函数，接收路由路径并执行跳转（如 router.push）
 */
export function setNavigator(fn: (route: string) => void | Promise<void>) {
  _navigator = fn
}

/**
 * 当前 pathname 是否已匹配目标路由。
 * 兼容子路径部署（例如 current=/ai/orders, target=/orders）。
 */
function isCurrentPathMatched(path: string): boolean {
  if (typeof window === 'undefined') return false
  const target = normalizeRoute(path)
  const current = normalizeRoute(window.location.pathname)
  return (
    current === target ||
    (current.endsWith(target) && (current.length === target.length || current[current.lastIndexOf(target) - 1] === '/'))
  )
}

/**
 * 跳转握手等待：
 * - 分离式路由工具：等待目标路由 page-ready
 * - 一体化动态注册：等待 tool-catalog-changed（且当前已在目标路由）
 * - 兜底超时，防止 Promise 永远不 resolve
 */
function waitForNavigationReady(path: string, timeoutMs = 1500): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  const target = normalizeRoute(path)

  return new Promise<void>((resolve) => {
    let done = false

    const cleanup = () => {
      if (done) return
      done = true
      window.removeEventListener('message', handleMessage)
      resolve()
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return

      if (event.data?.type === MSG_PAGE_READY) {
        const route = normalizeRoute(String(event.data.route ?? ''))
        if (route === target) {
          cleanup()
        }
        return
      }

      if (event.data?.type === MSG_TOOL_CATALOG_CHANGED && isCurrentPathMatched(target)) {
        cleanup()
      }
    }

    window.addEventListener('message', handleMessage)
    setTimeout(cleanup, timeoutMs)
  })
}

/**
 * registerTool 第三个参数的路由配置对象类型。
 * 当传入此类型时，工具调用会自动跳转到 route 对应的页面并通过消息通信执行。
 */
export type RouteConfig = {
  /** 目标路由路径，如 '/comprehensive' */
  route: string
  /** 等待页面响应的超时时间（ms），默认 30000 */
  timeout?: number
  /**
   * 是否在调用该工具时启用页面级调用提示效果。
   *
   * - false / 未配置：不启用任何额外效果（保持现有行为）
   * - true：使用默认提示文案（优先取工具标题，其次为工具名）
   * - 对象：可自定义提示文案
   */
  invokeEffect?: boolean | ToolInvokeEffectConfig
}

export type WithPageToolsOptions = {
  /**
   * Chrome 内置 WebMCP 兼容模式。
   * - auto（默认）：检测到 navigator.modelContext 时，同步注册内置工具（同时保留 next-sdk 现有链路）
   * - disabled：关闭内置兼容，仅使用 next-sdk 现有链路
   */
  nativeWebMcp?: {
    mode?: 'auto' | 'disabled'
  }
}

// 对外暴露调用提示配置类型，便于业务方在 RouteConfig 外单独复用
export type { ToolInvokeEffectConfig }

/**
 * PageAwareServer 的 registerTool 配置对象类型，与 WebMcpServer.registerTool 保持一致。
 */
type RegisterToolConfig<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape> = {
  title?: string
  description?: string
  inputSchema?: InputArgs
  outputSchema?: OutputArgs
  annotations?: ToolAnnotations
}

/**
 * 包装 WebMcpServer 后的类型：registerTool 第三个参数额外支持 RouteConfig。
 * 泛型签名与 WebMcpServer.registerTool 对齐，保持完整的类型推导能力。
 * 原有的回调函数写法完全兼容，无需改动。
 */
export type PageAwareServer = Omit<WebMcpServer, 'registerTool'> & {
  registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    config: RegisterToolConfig<InputArgs, OutputArgs>,
    // handler 不引入 ToolCallback<InputArgs>：该类型含 MCP SDK 深层泛型，
    // 叠加 ZodRawShape 推断链后会触发"类型实例化过深"。
    // 实际类型安全由 Proxy 内部透传给 WebMcpServer.registerTool 保证。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlerOrRoute: ((...args: any[]) => any) | RouteConfig
  ): RegisteredTool
  unregisterTool(name: string): boolean
}

export type PageToolDefinition<
  InputArgs extends ZodRawShape = ZodRawShape,
  OutputArgs extends ZodRawShape = ZodRawShape
> = {
  /** 工具名称 */
  name: string
  /** 工具声明配置（title/description/schema/annotations） */
  config: RegisterToolConfig<InputArgs, OutputArgs>
  /** 工具绑定路由 */
  route: string
  /** 页面响应超时（ms） */
  timeout?: number
  /** 页面调用特效 */
  invokeEffect?: boolean | ToolInvokeEffectConfig
  /** 工具执行回调（可选 context，便于页面注入运行时依赖） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any, context?: unknown) => any | Promise<any>
}

export function definePageTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
  definition: PageToolDefinition<InputArgs, OutputArgs>
): PageToolDefinition<InputArgs, OutputArgs> {
  return definition
}

/**
 * 批量注册页面工具声明（schema/route）到 MCP Server。
 * 可与 mountPageTools 配套使用，实现“声明与执行回调在同一工具定义对象内”。
 */
export function registerPageTools(server: PageAwareServer, definitions: PageToolDefinition[]): RegisteredTool[] {
  return definitions.map((definition) =>
    server.registerTool(definition.name, definition.config, {
      route: definition.route,
      timeout: definition.timeout,
      invokeEffect: definition.invokeEffect
    })
  )
}

/**
 * 使用 PageToolDefinition 快速在页面侧挂载 handlers（声明与执行同源）。
 * 等价于 registerPageTool({ tools, route?, context? })
 */
export function mountPageTools(options: MountPageToolsOptions): () => void {
  return registerPageTool(options)
}

export type RegisterRuntimePageToolsOptions = MountPageToolsOptions & {
  /**
   * 是否在页面卸载时自动移除工具声明。
   * - true（默认）：页面即工具，离开页面后从 MCP 工具目录移除
   * - false：只卸载 handler，工具声明保留（适合希望工具常驻目录的场景）
   */
  removeOnUnmount?: boolean
}

/**
 * 在业务页面内“一处定义 + 一处生效”：
 * 1) 注册工具声明（name/description/schema/route）
 * 2) 同时挂载工具 handler（页面生命周期内生效）
 *
 * 该能力与“分离式 mcp-servers + registerPageTool”并存，不会破坏原有写法。
 */
export function registerRuntimePageTools(server: PageAwareServer, options: RegisterRuntimePageToolsOptions): () => void {
  const allTools = options.tools ?? []
  if (!allTools.length) {
    throw new Error('registerRuntimePageTools: tools 不能为空。')
  }

  const explicitRoute = options.route ? normalizeRoute(options.route) : null
  const routes = new Set(allTools.map((tool) => normalizeRoute(tool.route)))
  if (!explicitRoute && routes.size > 1) {
    throw new Error('registerRuntimePageTools: tools 包含多个 route，请显式传入 route。')
  }

  const mountRoute = explicitRoute ?? Array.from(routes)[0]
  const routeTools = allTools.filter((tool) => normalizeRoute(tool.route) === mountRoute)
  if (!routeTools.length) {
    throw new Error(`registerRuntimePageTools: route "${mountRoute}" 下未找到工具定义。`)
  }

  routeTools.forEach((definition) => {
    const route = normalizeRoute(definition.route)
    const existing = runtimeRegisteredTools.get(definition.name)
    if (existing) {
      if (existing.route !== route) {
        throw new Error(
          `registerRuntimePageTools: 工具 "${definition.name}" 已绑定路由 "${existing.route}"，不能重复绑定到 "${route}"。`
        )
      }
      existing.refCount += 1
      return
    }

    const tool = server.registerTool(definition.name, definition.config, {
      route,
      timeout: definition.timeout,
      invokeEffect: definition.invokeEffect
    })
    runtimeRegisteredTools.set(definition.name, { tool, route, refCount: 1 })
  })

  const cleanupHandlers = registerPageTool({
    route: mountRoute,
    tools: routeTools,
    context: options.context
  })

  return () => {
    cleanupHandlers()

    if (options.removeOnUnmount === false) return

    routeTools.forEach((definition) => {
      const existing = runtimeRegisteredTools.get(definition.name)
      if (!existing) return
      existing.refCount -= 1
      if (existing.refCount > 0) return

      runtimeRegisteredTools.delete(definition.name)
      server.unregisterTool(definition.name)
    })
  }
}

/**
 * 注册一个通用的页面跳转工具（navigate_to_page），供大模型在需要时主动跳转到指定路由。
 *
 * 要求：
 * - 业务侧在应用入口通过 setNavigator 注册导航函数（如 router.push 或 navigateByUrl）
 * - 前端页面在目标路由下调用 registerPageTool，确保 page-ready 能正确广播
 *
 * 工具行为：
 * - 输入 path（如 "/orders"、"/price-protection"），调用 setNavigator 注册的函数执行跳转
 * - 等待目标页面完成挂载并广播 page-ready（或在超时时间到达时兜底返回）
 * - 返回简单的文本说明，提示跳转结果
 */
export type NavigateToolOptions = {
  /** 工具名称，默认 'navigate_to_page' */
  name?: string
  /** 工具标题，默认 '页面跳转' */
  title?: string
  /** 工具描述 */
  description?: string
  /** 等待 page-ready 的超时时间（ms），默认 1500 */
  timeoutMs?: number
}

export function registerNavigateTool(server: WebMcpServer, options?: NavigateToolOptions): RegisteredTool {
  const name = options?.name ?? 'navigate_to_page'
  const title = options?.title ?? '页面跳转'
  const description =
    options?.description ??
    '当需要的工具在当前页面不可用时，使用此工具跳转到特定页面。例如：要查询订单时跳转到 "/orders"，要创建价保时跳转到 "/price-protection"。'
  const timeoutMs = options?.timeoutMs ?? 1500

  const inputSchema = {
    path: z.string().describe('目标页面的路由地址，例如 "/orders"、"/inventory"、"/price-protection" 等。')
  }

  const handler: ({ path }: { path: string }) => Promise<{ content: Array<{ type: 'text'; text: string }> }> = async ({
    path
  }: {
    path: string
  }) => {
    if (typeof window === 'undefined') {
      return {
        content: [{ type: 'text', text: '当前环境不支持页面跳转（window 不存在）。' }]
      }
    }

    if (!_navigator) {
      return {
        content: [
          {
            type: 'text',
            text: '页面跳转失败：尚未在应用入口调用 setNavigator 注册导航函数，无法执行路由跳转。'
          }
        ]
      }
    }

    try {
      // 若当前已在目标路由上，直接返回成功，避免不必要的跳转。
      if (isCurrentPathMatched(path)) {
        return {
          content: [{ type: 'text', text: `当前已在页面：${path}。请继续你的下一步操作。` }]
        }
      }

      // 先注册握手监听再触发导航，避免极快导航下事件先于监听器触发而漏收。
      const readyPromise = waitForNavigationReady(path, timeoutMs)
      await _navigator(path)
      await readyPromise

      return {
        content: [{ type: 'text', text: `已成功跳转至页面：${path}。请继续你的下一步操作。` }]
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `页面跳转失败：${err instanceof Error ? err.message : String(err)}。`
          }
        ]
      }
    }
  }

  const registeredTool = server.registerTool(
    name,
    {
      title,
      description,
      inputSchema
    },
    handler
  )

  const managedByPageTools = typeof (server as Partial<PageAwareServer>).unregisterTool === 'function'
  if (!managedByPageTools) {
    void registerBuiltinWebMcpTool({
      name,
      description,
      inputSchema,
      execute: async (input) => {
        return await handler(input as { path: string })
      }
    })
    return attachBuiltinUnregisterOnRemove(name, registeredTool)
  }

  return registeredTool
}

/**
 * 内部：根据 name/route/timeout 生成转发给页面的 handler 函数。
 * 调用流程：
 * 1. 若目标路由已激活 → 直接 postMessage 发送工具调用
 * 2. 若未激活 → 调用导航函数跳转，等待 page-ready 信号后再发送
 * 3. 页面处理后回传结果，Promise resolve
 */
function buildPageHandler(
  name: string,
  route: string,
  timeout = 30000,
  effectConfig?: ReturnType<typeof resolveRuntimeEffectConfig>
) {
  return (input: any): Promise<any> => {
    const callId = randomUUID()

    return new Promise<any>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>
      // readyHandler 需在 cleanup 中一并移除，避免导航失败时泄漏监听器
      let readyHandler: ((event: MessageEvent) => void) | undefined

      const cleanup = () => {
        clearTimeout(timer)
        window.removeEventListener('message', responseHandler)
        if (readyHandler) {
          window.removeEventListener('message', readyHandler)
        }
        // 工具调用完成（成功 / 失败 / 超时 / 导航异常）后，无论结果如何都需要关闭调用提示效果
        if (effectConfig) {
          hideToolInvokeEffect()
        }
      }

      // 超时兜底，防止页面永远不响应
      timer = setTimeout(() => {
        cleanup()
        reject(new Error(`工具 [${name}] 调用超时 (${timeout}ms)，请检查目标页面是否正确调用了 registerPageTool`))
      }, timeout)

      // 通过 callId 精确匹配响应，避免并发调用互相串扰
      const responseHandler = (event: MessageEvent) => {
        if (event.source === window && event.data?.type === MSG_TOOL_RESPONSE && event.data.callId === callId) {
          cleanup()
          event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result)
        }
      }
      window.addEventListener('message', responseHandler)

      const sendCall = () => {
        window.postMessage({ type: MSG_TOOL_CALL, callId, toolName: name, route, input }, window.location.origin || '*')
      }

      // 单次发送守卫：readyHandler 与导航后 activePages 补充检查均可触发 sendCall，
      // 用此 flag 确保同一次工具调用只发送一条消息，防止工具被重复执行。
      let callSent = false
      const sendCallOnce = () => {
        if (callSent) return
        callSent = true
        sendCall()
      }

      // 将异步导航逻辑提取为独立 run 函数并用 void 调用，
      // 避免在 Promise executor 中直接使用 async（Biome noAsyncPromiseExecutor 规则）。
      // 导航失败时显式 reject，防止外层 Promise 永远挂起。
      const run = async () => {
        try {
          // 一旦真正发起工具调用（无论页面是否已激活），优先开启页面调用提示效果
          if (effectConfig) {
            showToolInvokeEffect(effectConfig)
          }

          if (isToolReadyOnRoute(route, name)) {
            // 页面已激活，直接发送
            sendCallOnce()
            return
          }

          // ⚠️ 必须先注册 readyHandler 再触发导航：
          // 若先导航再注册，极快的导航（同步或微任务）可能导致
          // 目标页面已广播 page-ready 而监听器尚未挂载，从而错过信号。
          readyHandler = (event: MessageEvent) => {
            if (event.source !== window || event.data?.type !== MSG_PAGE_READY) return
            const readyRoute = normalizeRoute(String(event.data.route ?? ''))
            if (readyRoute !== route) return
            const readyTools = Array.isArray(event.data.toolNames)
              ? new Set((event.data.toolNames as unknown[]).map((item) => String(item)))
              : null
            // 兼容旧版 page-ready（未携带 toolNames）：
            // 若 toolNames 缺失，则按“路由已就绪”处理；若存在则必须包含目标工具名。
            if (readyTools && !readyTools.has(name)) return

            window.removeEventListener('message', readyHandler!)
            sendCallOnce()
          }
          window.addEventListener('message', readyHandler)

          if (_navigator) {
            await _navigator(route)
          }

          // 导航 await 完成后，再次检查 activePages：
          // 若页面在注册监听器与导航之间极短间隙内已激活（极端竞态），
          // message 事件已被 handleMessage 消费但 readyHandler 未执行，
          // 此处补充检查确保不会永久等待。
          // sendCallOnce 保证即使两条路径都触发，消息也只发送一次。
          if (isToolReadyOnRoute(route, name)) {
            window.removeEventListener('message', readyHandler)
            sendCallOnce()
          }
        } catch (err) {
          // 导航本身抛出异常时，确保 Promise 被 reject 而非永远挂起
          cleanup()
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }
      void run()
    })
  }
}

/**
 * 包装 WebMcpServer，使 registerTool 第三个参数支持 RouteConfig。
 *
 * - 第三个参数为**回调函数**：与原始 registerTool 完全一致，直接透传
 * - 第三个参数为 **RouteConfig 对象**：自动生成转发 handler，工具调用时
 *   先导航到目标路由，再通过 postMessage 与页面通信
 */
export function withPageTools(server: WebMcpServer): PageAwareServer
export function withPageTools(server: WebMcpServer, options: WithPageToolsOptions): PageAwareServer
export function withPageTools(server: WebMcpServer, options?: WithPageToolsOptions): PageAwareServer {
  const nativeMode = options?.nativeWebMcp?.mode ?? 'auto'
  const shouldRegisterBuiltin = nativeMode !== 'disabled'
  const proxyRegisteredTools = new Map<string, RegisteredTool>()

  const unregisterByName = (target: WebMcpServer, name: string, silent = false): boolean => {
    const existing = proxyRegisteredTools.get(name)
    const hadTrackedState = !!existing

    debugWebMcpLog('proxy-unregister-start', { name, hasExisting: !!existing, silent })

    // 优先命中浏览器内置 WebMCP 的最常见签名：unregisterTool('tool_name')
    // 可覆盖部分实现差异场景下的反注册遗漏。
    tryDirectBuiltinUnregisterByName(name)

    proxyRegisteredTools.delete(name)
    runtimeRegisteredTools.delete(name)

    if (existing) {
      try {
        existing.remove()
      } catch {
        // ignore
      }
    }
    void unregisterBuiltinWebMcpTool(name)

    if (!silent && hadTrackedState) {
      notifyServerToolListChanged(target)
      broadcastToolCatalogChanged()
    }
    debugWebMcpLog('proxy-unregister-done', { name, removed: !!existing, silent })
    return !!existing
  }

  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === 'unregisterTool') {
        return (name: string) => unregisterByName(target, name, false)
      }
      if (prop === 'registerTool') {
        return (name: string, config: any, handlerOrRoute: ((...args: any[]) => any) | RouteConfig) => {
          debugWebMcpLog('proxy-register-start', {
            name,
            mode: typeof handlerOrRoute === 'function' ? 'callback' : 'route',
            shouldRegisterBuiltin
          })
          // 同名工具热更新：先移除旧工具，再注册新工具，保证 remoter 始终拿到最新定义
          unregisterByName(target, name, true)

          // 第三个参数是函数 → 直接透传，行为与原始 registerTool 完全相同
          // 通过 (target as any) 避免 WebMcpServer.registerTool 深层泛型触发"类型实例化过深"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawRegister = (target as any).registerTool.bind(target)
          if (typeof handlerOrRoute === 'function') {
            const registeredTool = rawRegister(name, config, handlerOrRoute)
            const wrapped = shouldRegisterBuiltin ? attachBuiltinUnregisterOnRemove(name, registeredTool) : registeredTool
            proxyRegisteredTools.set(name, wrapped)
            notifyServerToolListChanged(target)
            broadcastToolCatalogChanged()
            if (shouldRegisterBuiltin) {
              void registerBuiltinWebMcpTool({
                name,
                description: config?.description,
                inputSchema: config?.inputSchema,
                execute: async (input) => {
                  return await handlerOrRoute(input)
                }
              })
            }
            debugWebMcpLog('proxy-register-done', { name, mode: 'callback' })
            return wrapped
          }
          // 第三个参数是路由配置对象 → 自动生成转发 handler，并记录 tool → route 映射
          const { route, timeout, invokeEffect } = handlerOrRoute
          const normalizedRoute = normalizeRoute(route)
          const effectConfig = resolveRuntimeEffectConfig(name, config?.title, invokeEffect)
          const pageHandler = buildPageHandler(name, normalizedRoute, timeout, effectConfig)
          const registeredTool = rawRegister(name, config, pageHandler)
          const wrapped = shouldRegisterBuiltin ? attachBuiltinUnregisterOnRemove(name, registeredTool) : registeredTool
          proxyRegisteredTools.set(name, wrapped)
          notifyServerToolListChanged(target)
          broadcastToolCatalogChanged()
          if (shouldRegisterBuiltin) {
            void registerBuiltinWebMcpTool({
              name,
              description: config?.description,
              inputSchema: config?.inputSchema,
              execute: async (input) => {
                return await pageHandler(input)
              }
            })
          }
          debugWebMcpLog('proxy-register-done', { name, mode: 'route' })
          return wrapped
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as unknown as PageAwareServer
}

/**
 * 在目标页面激活工具处理器（框架无关的纯 JS 函数）。
 *
 * 调用后立即：
 * - 将路由注册到 activePages（标记页面已激活）
 * - 添加 message 监听，处理来自 buildPageHandler 的工具调用
 * - 广播 page-ready 信号，通知正在等待导航完成的工具
 *
 * 返回 cleanup 函数，页面销毁时调用。
 */
type PageToolHandlers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [toolName: string]: (input: any) => Promise<any> | any
}

export type RegisterPageToolByHandlersOptions = {
  /**
   * 目标路由路径，与 RouteConfig.route 保持一致。
   * 省略时自动读取 window.location.pathname。
   * 当页面路由与 pathname 不一致时（如 hash 路由、子路径前缀等），需手动传入。
   */
  route?: string
  /**
   * 工具名 → 处理函数的映射表。
   *
   * 此处 handler 的 input 参数类型保留 any：
   * 若改为 unknown，TypeScript 函数参数逆变规则会导致用户的具名解构写法
   *（如 `async ({ productId }: { productId: string }) => ...`）无法通过类型检查，
   * 破坏现有调用方代码的开发体验。运行时输入由 MCP inputSchema 保证类型安全。
   */
  handlers: PageToolHandlers
}

export type MountPageToolsOptions = {
  /**
   * 待激活的工具定义（定义中同时包含 schema + handler）。
   * 若 route 省略且 tools 包含多个路由，将抛出错误提示显式指定 route。
   */
  tools: PageToolDefinition[]
  /** 可选：覆盖 route（只激活该路由下的工具定义） */
  route?: string
  /** 运行时上下文，会作为第二参数透传给 definition.handler */
  context?: unknown
}

function resolveRouteAndHandlers(options: RegisterPageToolByHandlersOptions | MountPageToolsOptions): {
  route: string
  handlers: PageToolHandlers
} {
  if ('handlers' in options) {
    return {
      route: normalizeRoute(options.route ?? window.location.pathname),
      handlers: options.handlers
    }
  }

  const tools = options.tools ?? []
  if (!tools.length) {
    throw new Error('registerPageTool: tools 不能为空。')
  }

  const targetRoute = options.route ? normalizeRoute(options.route) : null
  const uniqueRoutes = new Set(tools.map((item) => normalizeRoute(item.route)))
  if (!targetRoute && uniqueRoutes.size > 1) {
    throw new Error('registerPageTool: tools 包含多个 route，请显式传入 route 参数。')
  }

  const route = targetRoute ?? Array.from(uniqueRoutes)[0]
  const handlers: PageToolHandlers = {}
  tools
    .filter((item) => normalizeRoute(item.route) === route)
    .forEach((item) => {
      if (handlers[item.name]) {
        throw new Error(`registerPageTool: 工具 "${item.name}" 在 route "${route}" 上重复定义。`)
      }
      handlers[item.name] = (input) => item.handler(input, options.context)
    })

  if (!Object.keys(handlers).length) {
    throw new Error(`registerPageTool: route "${route}" 下未找到可激活的工具定义。`)
  }

  return { route, handlers }
}

export function registerPageTool(options: RegisterPageToolByHandlersOptions): () => void
export function registerPageTool(options: MountPageToolsOptions): () => void
export function registerPageTool(options: RegisterPageToolByHandlersOptions | MountPageToolsOptions): () => void {
  const { route, handlers } = resolveRouteAndHandlers(options)
  const toolNames = Object.keys(handlers)

  const handleMessage = async (event: MessageEvent) => {
    // 同时校验 route 字段，防止多页面注册同名工具时发生跨路由串扰
    // 对消息携带的 route 同样规范化，避免因尾部斜杠等差异导致匹配失败
    if (
      event.source !== window ||
      event.data?.type !== MSG_TOOL_CALL ||
      normalizeRoute(String(event.data?.route ?? '')) !== route ||
      !(event.data.toolName in handlers)
    ) {
      return
    }
    const { callId, toolName, input } = event.data
    try {
      const result = await handlers[toolName](input)
      window.postMessage({ type: MSG_TOOL_RESPONSE, callId, result }, window.location.origin || '*')
    } catch (err) {
      window.postMessage(
        {
          type: MSG_TOOL_RESPONSE,
          callId,
          error: err instanceof Error ? err.message : String(err)
        },
        window.location.origin || '*'
      )
    }
  }

  // 注册页面为已激活状态并广播就绪信号（同窗口 + iframe Remoter 均能收到）
  activePages.set(route, new Set(toolNames))
  window.addEventListener('message', handleMessage)
  broadcastRouteChange(MSG_PAGE_READY, route, { toolNames })

  // 返回 cleanup，由各框架在页面销毁时调用
  return () => {
    activePages.delete(route)
    window.removeEventListener('message', handleMessage)
    broadcastRouteChange(MSG_PAGE_LEAVE, route)
  }
}
