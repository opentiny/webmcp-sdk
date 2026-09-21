/**
 * BrowserAdapter 统一接口
 *
 * 定义 CDP 模式与 WXT 模式的公共操作契约，供 bin.ts、MCP Server 等上层使用，
 * 屏蔽底层连接实现细节。
 */

export interface TabItem {
  /** CDP 模式为 target UUID 字符串；WXT 模式为 chrome.tabs.id 数值 */
  tabId: string | number
  title?: string
  url?: string
  active?: boolean
}

export interface WebmcpToolSummary {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface BrowserStateResult {
  url?: string
  title?: string
  activeTabId?: string | number
  tabs: TabItem[]
  webmcpTools: WebmcpToolSummary[]
}

export interface TabsOptions {
  url?: string
  tabId?: string | number
  activateVisible?: boolean
}

export interface BrowserAdapter {
  /** 获取当前浏览器状态（URL、title、tabs 列表、已注册工具列表） */
  getState(tabId?: string | number): Promise<BrowserStateResult>

  /** 调用页面 WebMCP 工具 */
  callTool(toolName: string, args: Record<string, unknown>, tabId?: string | number): Promise<unknown>

  /** 标签页操作 */
  tabs(action: 'open' | 'close' | 'switch' | 'back' | 'forward', options: TabsOptions): Promise<unknown>

  /** 释放资源，断开连接 */
  dispose(): Promise<void>
}
