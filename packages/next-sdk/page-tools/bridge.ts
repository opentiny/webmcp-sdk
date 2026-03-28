/**
 * page-tools/bridge - Web MCP 页面工具桥接模块（框架无关）
 *
 * 核心 API：
 *   - setNavigator(fn)    在应用入口注册导航函数
 *   - withPageTools(server) 包装 WebMcpServer，支持路由跳转能力
 *   - registerPageTool()  在目标页面激活工具处理器
 */

import { z, ZodRawShape } from 'zod'
import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import type { WebMcpServer } from '../WebMcpServer'
import { randomUUID } from '../utils/uuid'
import type { ToolInvokeEffectConfig } from './effects'
import { hideToolInvokeEffect, resolveRuntimeEffectConfig, showToolInvokeEffect } from './effects'
import {
  attachBuiltinUnregisterOnRemove,
  notifyServerToolListChanged,
  registerBuiltinWebMcpTool,
  tryDirectBuiltinUnregisterByName,
  unregisterBuiltinWebMcpTool
} from './builtin-mcp'

// 消息类型常量
const MSG_TOOL_CALL = 'next-sdk:tool-call'
const MSG_TOOL_RESPONSE = 'next-sdk:tool-response'
const MSG_PAGE_READY = 'next-sdk:page-ready'
export const MSG_PAGE_LEAVE = 'next-sdk:page-leave'
export const MSG_REMOTER_READY = 'next-sdk:remoter-ready'
export const MSG_TOOL_CATALOG_CHANGED = 'next-sdk:tool-catalog-changed'

// 状态管理
const activePages = new Map<string, Set<string>>()
const broadcastTargets = new Set<{ win: Window; origin: string }>()

const normalizeRoute = (value: string) => value.replace(/\/+$/, '') || '/'

function initBroadcastTargets() {
  if (typeof window !== 'undefined') {
    broadcastTargets.add({ win: window, origin: window.location.origin || '*' })
  }
}
initBroadcastTargets()

function broadcastToolCatalogChanged() {
  if (typeof window === 'undefined') return
  const payload = { type: MSG_TOOL_CATALOG_CHANGED }
  broadcastTargets.forEach(({ win, origin }) => {
    try {
      win.postMessage(payload, origin)
    } catch {
      /* ignore */
    }
  })
}

function broadcastRouteChange(type: string, route: string, extra: Record<string, unknown> = {}) {
  const msg = { type, route, ...extra }
  broadcastTargets.forEach(({ win, origin }) => {
    try {
      win.postMessage(msg, origin)
    } catch {
      /* ignore */
    }
  })
}

// 初始化 iframe 桥接
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== MSG_REMOTER_READY || !event.source) return
    if (event.origin !== window.location.origin) return
    broadcastTargets.add({ win: event.source as Window, origin: event.origin || '*' })
  })
}

/** 导出 API：获取已激活路由 */
export function getActiveRoutes(): Set<string> {
  return new Set(activePages.keys())
}

/**
 * 导出 API：获取活跃工具快照
 */
export function getActivePageTools(): ReadonlyMap<string, string[]> {
  const snapshot = new Map<string, string[]>()
  activePages.forEach((toolNames, route) => {
    snapshot.set(route, Array.from(toolNames))
  })
  return snapshot
}

function isToolReadyOnRoute(route: string, toolName: string): boolean {
  return activePages.get(route)?.has(toolName) ?? false
}

let _navigator: ((route: string) => void | Promise<void>) | null = null
export function setNavigator(fn: (route: string) => void | Promise<void>) {
  _navigator = fn
}

function isCurrentPathMatched(path: string): boolean {
  if (typeof window === 'undefined') return false
  const target = normalizeRoute(path)
  const current = normalizeRoute(window.location.pathname)
  return (
    current === target ||
    (current.endsWith(target) && (current.length === target.length || current[current.lastIndexOf(target) - 1] === '/'))
  )
}

function waitForNavigationReady(path: string, timeoutMs = 1500): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
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
      if (event.data?.type === MSG_PAGE_READY && normalizeRoute(String(event.data.route ?? '')) === target) {
        cleanup()
      } else if (event.data?.type === MSG_TOOL_CATALOG_CHANGED && isCurrentPathMatched(target)) {
        cleanup()
      }
    }
    window.addEventListener('message', handleMessage)
    setTimeout(cleanup, timeoutMs)
  })
}

export type RouteConfig = {
  route: string
  timeout?: number
  invokeEffect?: boolean | ToolInvokeEffectConfig
}

export type WithPageToolsOptions = {
  nativeWebMcp?: { mode?: 'auto' | 'disabled' }
}

type RegisterToolConfig<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape> = {
  title?: string
  description?: string
  inputSchema?: InputArgs
  outputSchema?: OutputArgs
  annotations?: ToolAnnotations
}

export type PageAwareServer = Omit<WebMcpServer, 'registerTool'> & {
  registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    config: RegisterToolConfig<InputArgs, OutputArgs>,
    handlerOrRoute: ((...args: any[]) => any) | RouteConfig
  ): RegisteredTool
  unregisterTool(name: string): boolean
}

export function registerNavigateTool(
  server: WebMcpServer,
  options?: { name?: string; title?: string; description?: string; timeoutMs?: number }
): RegisteredTool {
  const name = options?.name ?? 'navigate_to_page'
  const title = options?.title ?? '页面跳转'
  const description = options?.description ?? '当需要的工具在当前页面不可用时，使用此工具跳转到特定页面。'
  const timeoutMs = options?.timeoutMs ?? 1500

  const handler = async ({ path }: { path: string }) => {
    if (typeof window === 'undefined') return { content: [{ type: 'text', text: '当前环境不支持页面跳转。' }] }
    if (!_navigator) return { content: [{ type: 'text', text: '页面跳转失败：尚未注册导航函数。' }] }
    try {
      if (isCurrentPathMatched(path)) return { content: [{ type: 'text', text: `当前已在页面：${path}。` }] }
      const readyPromise = waitForNavigationReady(path, timeoutMs)
      await _navigator(path)
      await readyPromise
      return { content: [{ type: 'text', text: `已成功跳转至页面：${path}。` }] }
    } catch (err) {
      return { content: [{ type: 'text', text: `页面跳转失败：${err instanceof Error ? err.message : String(err)}` }] }
    }
  }

  const registeredTool = server.registerTool(name, { title, description, inputSchema: { path: z.string() } }, handler)
  if (typeof (server as any).unregisterTool !== 'function') {
    void registerBuiltinWebMcpTool({ name, description, inputSchema: { path: z.string() } as any, execute: handler })
    return attachBuiltinUnregisterOnRemove(name, registeredTool)
  }
  return registeredTool
}

function buildPageHandler(
  name: string,
  route: string,
  timeout = 30000,
  effectConfig?: ReturnType<typeof resolveRuntimeEffectConfig>
) {
  return (input: any): Promise<any> => {
    const callId = randomUUID()
    return new Promise<any>((resolve, reject) => {
      let timer: any
      const cleanup = () => {
        clearTimeout(timer)
        window.removeEventListener('message', responseHandler)
        if (readyHandler) window.removeEventListener('message', readyHandler)
        if (effectConfig) hideToolInvokeEffect()
      }
      timer = setTimeout(() => {
        cleanup()
        reject(new Error(`工具 [${name}] 调用超时 (${timeout}ms)`))
      }, timeout)

      const responseHandler = (event: MessageEvent) => {
        if (event.source === window && event.data?.type === MSG_TOOL_RESPONSE && event.data.callId === callId) {
          cleanup()
          event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result)
        }
      }
      window.addEventListener('message', responseHandler)

      let callSent = false
      const sendCallOnce = () => {
        if (!callSent) {
          callSent = true
          window.postMessage(
            { type: MSG_TOOL_CALL, callId, toolName: name, route, input },
            window.location.origin || '*'
          )
        }
      }

      let readyHandler: any
      const run = async () => {
        try {
          if (effectConfig) showToolInvokeEffect(effectConfig)
          if (isToolReadyOnRoute(route, name)) {
            sendCallOnce()
            return
          }
          readyHandler = (event: MessageEvent) => {
            if (event.source !== window || event.data?.type !== MSG_PAGE_READY) return
            if (normalizeRoute(String(event.data.route ?? '')) !== route) return
            sendCallOnce()
          }
          window.addEventListener('message', readyHandler)
          if (_navigator) await _navigator(route)
          if (isToolReadyOnRoute(route, name)) sendCallOnce()
        } catch (err) {
          cleanup()
          reject(err)
        }
      }
      void run()
    })
  }
}

export function withPageTools(server: WebMcpServer, options?: WithPageToolsOptions): PageAwareServer {
  const shouldRegisterBuiltin = (options?.nativeWebMcp?.mode ?? 'auto') !== 'disabled'
  const proxyRegisteredTools = new Map<string, RegisteredTool>()

  const unregisterByName = (target: WebMcpServer, name: string, silent = false): boolean => {
    const existing = proxyRegisteredTools.get(name)
    tryDirectBuiltinUnregisterByName(name)
    proxyRegisteredTools.delete(name)
    if (existing)
      try {
        existing.remove()
      } catch {
        /* ignore */
      }
    void unregisterBuiltinWebMcpTool(name)
    if (!silent && existing) {
      notifyServerToolListChanged(target)
      broadcastToolCatalogChanged()
    }
    return !!existing
  }

  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === 'unregisterTool') return (name: string) => unregisterByName(target, name, false)
      if (prop === 'registerTool') {
        return (name: string, config: any, handlerOrRoute: any) => {
          unregisterByName(target, name, true)
          const rawRegister = (target as any).registerTool.bind(target)
          if (typeof handlerOrRoute === 'function') {
            const tool = rawRegister(name, config, handlerOrRoute)
            const wrapped = shouldRegisterBuiltin ? attachBuiltinUnregisterOnRemove(name, tool) : tool
            proxyRegisteredTools.set(name, wrapped)
            notifyServerToolListChanged(target)
            broadcastToolCatalogChanged()
            if (shouldRegisterBuiltin)
              void registerBuiltinWebMcpTool({
                name,
                description: config?.description,
                inputSchema: config?.inputSchema,
                execute: handlerOrRoute
              })
            return wrapped
          }
          const { route, timeout, invokeEffect } = handlerOrRoute
          const effectConfig = resolveRuntimeEffectConfig(name, config?.title, invokeEffect)
          const handler = buildPageHandler(name, normalizeRoute(route), timeout, effectConfig)
          const tool = rawRegister(name, config, handler)
          const wrapped = shouldRegisterBuiltin ? attachBuiltinUnregisterOnRemove(name, tool) : tool
          proxyRegisteredTools.set(name, wrapped)
          notifyServerToolListChanged(target)
          broadcastToolCatalogChanged()
          if (shouldRegisterBuiltin)
            void registerBuiltinWebMcpTool({
              name,
              description: config?.description,
              inputSchema: config?.inputSchema,
              execute: handler
            })
          return wrapped
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as unknown as PageAwareServer
}

export type PageToolHandlers = { [toolName: string]: (input: any) => Promise<any> | any }

export function registerPageTool(options: { route?: string; handlers: PageToolHandlers }): () => void {
  const route = normalizeRoute(options.route ?? (typeof window !== 'undefined' ? window.location.pathname : '/'))
  const handlers = options.handlers
  const handleMessage = async (event: MessageEvent) => {
    if (
      event.source !== window ||
      event.data?.type !== MSG_TOOL_CALL ||
      normalizeRoute(String(event.data?.route ?? '')) !== route ||
      !(event.data.toolName in handlers)
    )
      return
    const { callId, toolName, input } = event.data
    try {
      const result = await handlers[toolName](input)
      window.postMessage({ type: MSG_TOOL_RESPONSE, callId, result }, window.location.origin || '*')
    } catch (err) {
      window.postMessage(
        { type: MSG_TOOL_RESPONSE, callId, error: err instanceof Error ? err.message : String(err) },
        window.location.origin || '*'
      )
    }
  }
  activePages.set(route, new Set(Object.keys(handlers)))
  window.addEventListener('message', handleMessage)
  broadcastRouteChange(MSG_PAGE_READY, route, { toolNames: Object.keys(handlers) })
  return () => {
    activePages.delete(route)
    window.removeEventListener('message', handleMessage)
    broadcastRouteChange(MSG_PAGE_LEAVE, route)
  }
}
