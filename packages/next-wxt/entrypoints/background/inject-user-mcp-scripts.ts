/**
 * Background 侧：将用户 MCP 脚本注入目标 tab 的 MAIN world
 * 业务匹配逻辑全部来自 user-mcp-scripts，本文件仅做 chrome.scripting 适配
 *
 * 注意：不可在 executeScript 回调内直接 new Function(源码)——会受页面 CSP 拦截
 * （复现：京东等站只剩 page-agent-tool）。须调用 chrome-extension 桥。
 *
 * 能力令牌：先 bind(token) 再 exec(code, token)；token 仅存于 background（及桥闭包）。
 */

import {
  getUserMcpScriptsStore,
  resolveMatchingScripts,
  shouldSkipBuiltIn,
  matchAny,
  USER_MCP_BIND_BRIDGE_NAME,
  USER_MCP_EXEC_BRIDGE_NAME,
  createUserMcpBridgeToken,
  type UserMcpScript,
  type BridgeExecResult
} from '@/user-mcp-scripts'

export type InjectUserMcpResult = {
  success: boolean
  shouldSkipBuiltIn: boolean
  injectedCount: number
  error?: string
}

/** tabId → capability token（页面刷新 / tab 关闭后失效） */
const tabBridgeTokens = new Map<number, string>()

export function clearUserMcpBridgeToken(tabId: number): void {
  tabBridgeTokens.delete(tabId)
}

/**
 * 绑定（或复用）当前 tab 的执行桥 capability
 */
async function ensureBridgeCapability(tabId: number): Promise<
  | { ok: true; token: string }
  | { ok: false; error: string }
> {
  const cached = tabBridgeTokens.get(tabId)
  if (cached) return { ok: true, token: cached }

  const token = createUserMcpBridgeToken()
  const bindName = USER_MCP_BIND_BRIDGE_NAME
  const results = await browser.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [bindName, token],
    func: (installName: string, capability: string) => {
      const install = (window as any)[installName]
      if (typeof install !== 'function') {
        return { ok: false, error: 'bind entry missing: ' + installName }
      }
      return install(capability)
    }
  })
  const value = results?.[0]?.result as BridgeExecResult | undefined
  if (!value) return { ok: false, error: 'empty bind result' }
  if (!value.ok) {
    if (value.locked) {
      return {
        ok: false,
        error: '执行桥已被锁定且无本地 token（请刷新页面后重试）'
      }
    }
    return { ok: false, error: value.error || 'bind failed' }
  }
  tabBridgeTokens.set(tabId, token)
  return { ok: true, token }
}

/**
 * 通过扩展脚本桥在 MAIN world 执行用户源码（绕过页面 CSP 对 eval 的限制）
 */
async function executeUserSourceInMainWorld(
  tabId: number,
  source: string,
  token: string
): Promise<BridgeExecResult> {
  const bridgeName = USER_MCP_EXEC_BRIDGE_NAME
  const results = await browser.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [source, bridgeName, token],
    func: (code: string, name: string, capability: string) => {
      const run = (window as any)[name]
      if (typeof run !== 'function') {
        console.warn('[user-mcp-scripts] 执行桥未就绪:', name)
        return { ok: false, error: 'bridge missing: ' + name }
      }
      return run(code, capability)
    }
  })
  const value = results?.[0]?.result as BridgeExecResult | undefined
  if (!value) return { ok: false, error: 'empty executeScript result' }
  return value
}

/**
 * 按 URL 解析并注入匹配的启用脚本
 */
export async function injectUserMcpScriptsForTab(
  tabId: number,
  url: string
): Promise<InjectUserMcpResult> {
  try {
    const store = await getUserMcpScriptsStore()
    const skip = shouldSkipBuiltIn(store, url)
    const scripts = resolveMatchingScripts(store, url)
    if (!scripts.length) {
      return { success: true, shouldSkipBuiltIn: skip, injectedCount: 0 }
    }

    const bound = await ensureBridgeCapability(tabId)
    if (!bound.ok) {
      return {
        success: false,
        shouldSkipBuiltIn: skip,
        injectedCount: 0,
        error: bound.error
      }
    }

    let injectedCount = 0
    const errors: string[] = []
    for (const script of scripts) {
      const result = await executeUserSourceInMainWorld(tabId, script.source, bound.token)
      if (result.ok) {
        injectedCount++
      } else {
        errors.push(`${script.name}: ${result.error}`)
        console.warn(`[user-mcp-scripts] 脚本「${script.name}」执行失败:`, result.error)
      }
    }
    return {
      success: errors.length === 0,
      shouldSkipBuiltIn: skip,
      injectedCount,
      error: errors.length ? errors.join('; ') : undefined
    }
  } catch (error: any) {
    console.warn('[user-mcp-scripts] 注入失败:', error)
    return {
      success: false,
      shouldSkipBuiltIn: false,
      injectedCount: 0,
      error: error?.message || String(error)
    }
  }
}

/**
 * 按 matches 列表刷新匹配的 http(s) 标签页（删除脚本时由 Options 传入快照）
 */
export async function reloadTabsByMatchesSnapshot(matchesList: string[][]): Promise<number> {
  const flatPatterns = matchesList.flat().filter(Boolean)
  if (!flatPatterns.length) return 0
  const tabs = await browser.tabs.query({})
  let count = 0
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue
    if (!/^https?:/i.test(tab.url)) continue
    if (!matchAny(flatPatterns, tab.url)) continue
    try {
      clearUserMcpBridgeToken(tab.id)
      await browser.tabs.reload(tab.id)
      count++
    } catch {
      // 忽略无法刷新的 tab
    }
  }
  return count
}

async function reloadTabsByMatchList(scripts: UserMcpScript[]): Promise<number> {
  return reloadTabsByMatchesSnapshot(scripts.map((s) => s.matches || []))
}

/**
 * 保存后：对匹配指定脚本的 http(s) 标签页重新加载，确保工具列表干净
 */
export async function reloadTabsMatchingScripts(scripts: UserMcpScript[]): Promise<number> {
  return reloadTabsByMatchList(scripts)
}

/**
 * Options 保存后：按 scriptId 刷新匹配页（脚本仍在 store 中）
 */
export async function reinjectAfterUserMcpScriptsChange(scriptId?: string): Promise<number> {
  const store = await getUserMcpScriptsStore()
  if (scriptId) {
    const one = store[scriptId]
    if (!one) return 0
    return reloadTabsMatchingScripts([one])
  }
  return reloadTabsMatchingScripts(Object.values(store))
}
