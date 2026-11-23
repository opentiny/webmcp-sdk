import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../page-tools/page-agent-mask/SimulatorMask', () => ({
  SimulatorMask: class SimulatorMask {
    shown = false
    show() {
      this.shown = true
    }
    hide() {
      this.shown = false
    }
    dispose() {}
    removeBorderElement() {}
    borderElement() {}
    setCursorPosition() {}
  },
}))

import { registerPageAgentTool, type PageAgentToolHandle } from '../../page-tools/page-agent-tool'
import { initializeBuiltinWebMCP } from '../../page-tools/initialize-builtin-WebMCP'
import {
  PAGE_AGENT_CHAT_END_EVENT,
  PAGE_AGENT_TOOL_CALL_EVENT,
  PAGE_AGENT_TOOL_RESULT_EVENT,
  type PageAgentToolResultEventDetail,
} from '../../page-tools/page-agent-tool-event'
import { REF_NOT_PRESENTED_ERROR_CODE } from '../../page-tools/context'
import type { PageAgentToolInput } from '../../page-tools/schema'

type ToolExecResult = {
  isError?: boolean
  error?: string
  errorCode?: string
  content: Array<{ type: string; text: string }>
}

function captureTool(): {
  execute: (args: Partial<PageAgentToolInput> & { action: PageAgentToolInput['action'] }) => Promise<ToolExecResult>
  handle: PageAgentToolHandle
} {
  initializeBuiltinWebMCP()
  const mcp = (document as any).modelContext
  let capturedExecute: ((args: any) => Promise<ToolExecResult>) | null = null
  const originalRegister = mcp.registerTool.bind(mcp)

  mcp.registerTool = (tool: any, options?: any) => {
    if (tool?.name === 'page-agent-tool') {
      capturedExecute = tool.execute.bind(tool)
    }
    return originalRegister(tool, options)
  }

  let handle: PageAgentToolHandle
  try {
    handle = registerPageAgentTool()
  } finally {
    mcp.registerTool = originalRegister
  }

  if (!capturedExecute) {
    throw new Error('Failed to capture page-agent-tool execute')
  }
  const fn = capturedExecute
  return {
    execute: (args) =>
      fn({
        contextLines: 2,
        maxMatches: 20,
        responseMode: 'diff',
        ...args,
      }),
    handle,
  }
}

describe('page-agent-tool 稳定编号、结构化版本字段、REF_NOT_PRESENTED 与每轮重置集成测试', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    delete window.__webmcpcli_toolConfig
    delete window.__webmcpcli_beforeGetBrowserState
  })

  afterEach(() => {
    window.__nextSdkPageAgentToolEventCleanup?.()
    document.body.innerHTML = ''
  })

  it('复现：在第一个节点前插入节点导致全量重编号与巨大 diff —— 工具端到端保持既有 #ref 稳定并输出 kind/url/rev/baseRev', async () => {
    const list = document.createElement('div')
    for (let i = 0; i < 20; i++) {
      const btn = document.createElement('button')
      btn.textContent = `商品-${i}`
      list.appendChild(btn)
    }
    document.body.appendChild(list)

    const { execute } = captureTool()

    // 1. 首次调用（即使默认 responseMode='diff'）返回 kind='full', rev=1
    const firstRes = await execute({ action: 'browserState' })
    const s1 = JSON.parse(firstRes.content[0].text)
    expect(s1.kind).toBe('full')
    expect(s1.rev).toBe(1)
    expect(s1.baseRev).toBeUndefined()
    expect(s1.url).toBe(window.location.href)
    expect(s1.content).toContain('- button #0 "商品-0"')
    expect(s1.content).toContain('- button #19 "商品-19"')

    // 2. 在第一个节点前插入新按钮，再次调用 browserState(diff)
    const topBtn = document.createElement('button')
    topBtn.textContent = '顶部筛选标签'
    list.insertBefore(topBtn, list.firstChild)

    const secondRes = await execute({ action: 'browserState' })
    const s2 = JSON.parse(secondRes.content[0].text)
    expect(s2.kind).toBe('diff')
    expect(s2.rev).toBe(2)
    expect(s2.baseRev).toBe(1)
    expect(s2.content).toBe('+ - button #20 "顶部筛选标签"')

    // 3. 页面过半节点重绘时，自动退化返回整页树且 kind='full'
    list.innerHTML = ''
    for (let i = 0; i < 20; i++) {
      const nextBtn = document.createElement('button')
      nextBtn.textContent = `第二页商品-${i}`
      list.appendChild(nextBtn)
    }
    const thirdRes = await execute({ action: 'browserState' })
    const s3 = JSON.parse(thirdRes.content[0].text)
    expect(s3.kind).toBe('full')
    expect(s3.rev).toBe(3)
    expect(s3.baseRev).toBeUndefined()
    expect(s3.content).toContain('```yaml')
    expect(s3.content).toContain('- button #21 "第二页商品-0"')
  })

  it('收到不在最新页面快照中的 #ref 时，click/fill/select/hover/scroll 统一返回 REF_NOT_PRESENTED 错误且不附带整页树', async () => {
    document.body.innerHTML = `
      <button id="temp-btn">临时按钮</button>
      <button id="keep-btn">常驻按钮</button>
    `
    const { execute } = captureTool()

    // 获取初始快照：#0 为 temp-btn，#1 为 keep-btn
    await execute({ action: 'browserState', responseMode: 'full' })

    // 移除 #0 并刷新快照，此时最新快照中仅剩 #1
    document.getElementById('temp-btn')!.remove()
    await execute({ action: 'browserState' })

    const staleActions = [
      { action: 'click' as const, index: 0 },
      { action: 'fill' as const, index: 0, text: 'abc' },
      { action: 'select' as const, index: 0, text: 'opt' },
      { action: 'hover' as const, index: 0 },
      { action: 'scroll' as const, index: 0, down: true, pixels: 100 },
    ]

    for (const callArgs of staleActions) {
      const res = await execute(callArgs)
      expect(res.isError).toBe(true)
      expect(res.errorCode).toBe(REF_NOT_PRESENTED_ERROR_CODE)
      const payload = JSON.parse(res.content[0].text)
      expect(payload).toMatchObject({
        errorCode: REF_NOT_PRESENTED_ERROR_CODE,
        index: 0,
        rev: 2,
      })
      // 确保未把整页 YAML 树塞入错误响应
      expect(res.content[0].text).not.toContain('```yaml')
      expect(res.content[0].text).not.toContain('常驻按钮')
    }

    // 验证事件桥同样透传 errorCode = REF_NOT_PRESENTED
    const eventDetailPromise = new Promise<PageAgentToolResultEventDetail>((resolve) => {
      window.addEventListener(
        PAGE_AGENT_TOOL_RESULT_EVENT,
        (ev) => resolve((ev as CustomEvent<PageAgentToolResultEventDetail>).detail),
        { once: true },
      )
    })
    window.dispatchEvent(
      new CustomEvent(PAGE_AGENT_TOOL_CALL_EVENT, {
        detail: {
          requestId: 'req-stale-1',
          data: { action: 'hover', index: 999 },
        },
      }),
    )
    const eventDetail = await eventDetailPromise
    expect(eventDetail.data.success).toBe(false)
    expect(eventDetail.data.errorCode).toBe(REF_NOT_PRESENTED_ERROR_CODE)
  })

  it('快照采集后异步脱离 DOM（!el.isConnected）的元素同样被拦截并返回 REF_NOT_PRESENTED', async () => {
    document.body.innerHTML = `<button id="async-gone">即将消失</button>`
    const { execute } = captureTool()

    await execute({ action: 'browserState', responseMode: 'full' })
    // 未重新调用 browserState，但元素已被前端框架异步卸载
    document.getElementById('async-gone')!.remove()

    const res = await execute({ action: 'click', index: 0 })
    expect(res.isError).toBe(true)
    expect(res.errorCode).toBe(REF_NOT_PRESENTED_ERROR_CODE)
  })

  it('searchTree 共享稳定 #ref 分配器，且不会覆盖 stateCache 导致后续 diff 的 baseRev 断链', async () => {
    document.body.innerHTML = `
      <button id="b0">第一项</button>
      <button id="b1">第二项</button>
      <button id="b2">提交订单</button>
    `
    const { execute } = captureTool()

    const r1 = JSON.parse((await execute({ action: 'browserState' })).content[0].text)
    expect(r1).toMatchObject({ kind: 'full', rev: 1 })

    // 中途执行 searchTree：编号保持 #2，且不推进快照 rev
    const searchRes = await execute({ action: 'searchTree', query: '提交订单' })
    expect(searchRes.content[0].text).toContain('#2')

    // 修改按钮文案后再调 browserState(diff)：baseRev 仍连续指向 rev=1
    document.getElementById('b2')!.textContent = '提交订单（处理中）'
    const r2 = JSON.parse((await execute({ action: 'browserState' })).content[0].text)
    expect(r2).toMatchObject({ kind: 'diff', rev: 2, baseRev: 1 })
    expect(r2.content).toContain('#2')
  })

  it('handle.resetSession() 与 PAGE_AGENT_CHAT_END_EVENT 均能重置会话编号与快照版本链', async () => {
    document.body.innerHTML = `
      <button id="first">按钮A</button>
      <button id="second">按钮B</button>
    `
    const { execute, handle } = captureTool()

    await execute({ action: 'browserState' })
    // 移除 #0 后再新增按钮，使计数器推进到 #2、rev 推进到 2
    document.getElementById('first')!.remove()
    const extra = document.createElement('button')
    extra.textContent = '按钮C'
    document.body.appendChild(extra)

    const beforeReset = JSON.parse((await execute({ action: 'browserState' })).content[0].text)
    expect(beforeReset).toMatchObject({ kind: 'diff', rev: 2, baseRev: 1 })
    expect(beforeReset.content).toContain('#2')

    // 1. 显式调用 handle.resetSession()
    handle.resetSession()
    // 重置后尚未获取新快照时，旧 #1 立即报 REF_NOT_PRESENTED
    const staleAfterReset = await execute({ action: 'hover', index: 1 })
    expect(staleAfterReset.isError).toBe(true)
    expect(staleAfterReset.errorCode).toBe(REF_NOT_PRESENTED_ERROR_CODE)

    // 新一轮首次 browserState 重新从 #0、rev=1、kind='full' 开始
    const afterHandleReset = JSON.parse((await execute({ action: 'browserState' })).content[0].text)
    expect(afterHandleReset).toMatchObject({ kind: 'full', rev: 1 })
    expect(afterHandleReset.content).toContain('- button #0')
    expect(afterHandleReset.content).toContain('- button #1 "按钮C"')

    // 2. 派发 PAGE_AGENT_CHAT_END_EVENT 同样自动重置会话
    window.dispatchEvent(new CustomEvent(PAGE_AGENT_CHAT_END_EVENT))
    const afterEventReset = JSON.parse((await execute({ action: 'browserState' })).content[0].text)
    expect(afterEventReset).toMatchObject({ kind: 'full', rev: 1 })
    expect(afterEventReset.content).toContain('- button #0')
  })
})
