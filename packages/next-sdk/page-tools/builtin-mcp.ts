/**
 * page-tools/builtin-mcp - 浏览器内置 WebMCP 兼容模块
 */
import { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ZodRawShape } from 'zod'
import { zodShapeToJsonSchema, JsonSchema } from '../utils/zod-to-json'

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

/**
 * 助手：为原生 RegisteredTool 注入 unregister 勾子
 */
export function attachBuiltinUnregisterOnRemove(name: string, tool: RegisteredTool): RegisteredTool {
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

export function getBuiltinModelContext(): BrowserBuiltinModelContext | null {
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

export function isWebMcpDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & { __NEXT_SDK_WEBMCP_DEBUG__?: boolean }
  if (w.__NEXT_SDK_WEBMCP_DEBUG__ === true) return true
  try {
    return window.localStorage?.getItem('next-sdk:webmcp-debug') === '1'
  } catch {
    return false
  }
}

export function debugWebMcpLog(event: string, payload: Record<string, unknown> = {}) {
  if (!isWebMcpDebugEnabled()) return
  try {
    console.info('[next-sdk/webmcp]', event, payload)
  } catch {
    // ignore
  }
}

export function notifyServerToolListChanged(server: unknown) {
  const maybeServer = server as { sendToolListChanged?: () => void }
  try {
    maybeServer.sendToolListChanged?.()
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

export function tryDirectBuiltinUnregisterByName(name: string) {
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

  const cleanupLocalRegisterState = () => {
    nativeToolDisposers.delete(options.name)
    nativeRegisteredToolDefs.delete(options.name)
    nativeRegisteredTools.delete(options.name)
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
    cleanupLocalRegisterState()
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
