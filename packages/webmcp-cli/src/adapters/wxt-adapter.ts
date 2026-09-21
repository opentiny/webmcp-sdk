/**
 * WxtBrowserAdapter
 *
 * 基于 WebSocket + Chrome 扩展桥接实现的 BrowserAdapter，
 * 通过 ExtensionBridgeClient 与浏览器扩展通信，复用用户已有的 Chrome 数据与账号。
 */

import { ExtensionBridgeClient } from '../bridge/bridge-client.js'
import { BRIDGE_METHODS } from '../bridge/protocol.js'
import type { BrowserAdapter, BrowserStateResult, TabsOptions } from './interface.js'

const AUTO_WAIT_MS = 6000

export class WxtBrowserAdapter implements BrowserAdapter {
  private client: ExtensionBridgeClient

  constructor(token?: string, port?: number) {
    this.client = new ExtensionBridgeClient(port, token)
    // 防止未捕获的 error 事件导致进程崩溃
    this.client.on('error', () => {})
  }

  /** 确保 WS 桥接服务已启动并连接 */
  async ensureConnected(): Promise<void> {
    await this.client.startAuto()
  }

  async getState(tabId?: string | number): Promise<BrowserStateResult> {
    const numTabId = typeof tabId === 'string' ? parseInt(tabId, 10) || undefined : tabId
    const result = await this.client.call(
      BRIDGE_METHODS.BROWSER_STATE,
      { tabId: numTabId },
      undefined,
      undefined,
      AUTO_WAIT_MS
    ) as BrowserStateResult
    return result
  }

  async callTool(toolName: string, args: Record<string, unknown>, tabId?: string | number): Promise<unknown> {
    const numTabId = typeof tabId === 'string' ? parseInt(tabId, 10) || undefined : tabId
    return this.client.call(
      BRIDGE_METHODS.TOOL_CALL,
      { toolName, toolArgs: args, tabId: numTabId },
      undefined,
      undefined,
      AUTO_WAIT_MS
    )
  }

  async tabs(action: 'open' | 'close' | 'switch' | 'back' | 'forward', options: TabsOptions): Promise<unknown> {
    const numTabId = typeof options.tabId === 'string' ? parseInt(options.tabId, 10) || undefined : options.tabId
    return this.client.call(
      BRIDGE_METHODS.BROWSER_TABS,
      { tabAction: action, ...options, tabId: numTabId },
      undefined,
      undefined,
      AUTO_WAIT_MS
    )
  }

  /** 委托扩展内 Tiny Robot 子代理闭环执行高层任务 */
  async runSubAgent(
    instruction: string,
    options: { tabId?: number; maxSteps?: number; progressToken?: string | number } = {},
    timeoutMs?: number
  ): Promise<unknown> {
    const params = { instruction, tabId: options.tabId, maxSteps: options.maxSteps }
    return this.client.call(
      BRIDGE_METHODS.SUB_AGENT_RUN,
      params,
      timeoutMs,
      options.progressToken,
      AUTO_WAIT_MS
    )
  }

  /** 获取已注册的 Skills 列表（L1 索引） */
  async listSkills(): Promise<unknown> {
    return this.client.call(BRIDGE_METHODS.SKILLS_LIST, {}, undefined, undefined, AUTO_WAIT_MS)
  }

  /** 读取指定 Skill 的详细指令（L2 详情） */
  async getSkill(name: string): Promise<unknown> {
    return this.client.call(BRIDGE_METHODS.SKILLS_GET, { name }, undefined, undefined, AUTO_WAIT_MS)
  }

  /** 读取 Skill 关联资源（L3 资源） */
  async readSkillResource(name: string, resourcePath: string): Promise<unknown> {
    return this.client.call(
      BRIDGE_METHODS.SKILLS_READ_RESOURCE,
      { name, resourcePath },
      undefined,
      undefined,
      AUTO_WAIT_MS
    )
  }

  /** 获取底层 ExtensionBridgeClient（供 MCP Server 绑定事件） */
  get bridgeClient(): ExtensionBridgeClient {
    return this.client
  }

  async dispose(): Promise<void> {
    this.client.destroy()
  }
}
