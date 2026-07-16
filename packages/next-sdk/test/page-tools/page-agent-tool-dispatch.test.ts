import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'

/**
 * 保障 page-agent-tool 的 switch(action) 不会 fall-through：
 * 每个 action 只能调用对应 handler 一次，且不得落入后续分支 / default。
 */

const { handlerMocks } = vi.hoisted(() => {
  const marker = (name: string) => ({
    content: [{ type: 'text' as const, text: `ok:${name}` }],
  })
  return {
    handlerMocks: {
      handleBrowserState: vi.fn(async () => marker('browserState')),
      handleClick: vi.fn(async () => marker('click')),
      handleFill: vi.fn(async () => marker('fill')),
      handleSelect: vi.fn(async () => marker('select')),
      handleScroll: vi.fn(async () => marker('scroll')),
      handleExecuteJavascript: vi.fn(async () => marker('executeJavascript')),
      handleSearchTree: vi.fn(async () => marker('searchTree')),
    },
  }
})

vi.mock('../../page-tools/page-agent-mask/SimulatorMask', () => ({
  SimulatorMask: class SimulatorMask {
    show() {}
    hide() {}
    dispose() {}
    borderElement() {}
    removeBorderElement() {}
  },
}))

vi.mock('@page-agent/page-controller', () => ({
  PageController: class PageController {
    mask = {
      borderElement() {},
      removeBorderElement() {},
    }
    maskReady = Promise.resolve()
    async showMask() {}
    async hideMask() {}
  },
}))

vi.mock('../../page-tools/handlers/browserState', () => ({
  handleBrowserState: handlerMocks.handleBrowserState,
}))
vi.mock('../../page-tools/handlers/click', () => ({
  handleClick: handlerMocks.handleClick,
}))
vi.mock('../../page-tools/handlers/fill', () => ({
  handleFill: handlerMocks.handleFill,
}))
vi.mock('../../page-tools/handlers/select', () => ({
  handleSelect: handlerMocks.handleSelect,
}))
vi.mock('../../page-tools/handlers/scroll', () => ({
  handleScroll: handlerMocks.handleScroll,
}))
vi.mock('../../page-tools/handlers/executeJavascript', () => ({
  handleExecuteJavascript: handlerMocks.handleExecuteJavascript,
}))
vi.mock('../../page-tools/handlers/searchTree', () => ({
  handleSearchTree: handlerMocks.handleSearchTree,
}))

import { registerPageAgentTool } from '../../page-tools/page-agent-tool'
import type { PageAgentToolInput } from '../../page-tools/schema'

interface ToolTextContent {
  type: string
  text: string
}

interface ToolExecuteResult {
  content: ToolTextContent[]
}

type PageAgentExecute = (args: PageAgentToolInput) => Promise<ToolExecuteResult>

interface RegisterablePageAgentTool {
  name?: string
  execute?: PageAgentExecute
}

interface ModelContextWithRegisterTool {
  registerTool: (
    tool: RegisterablePageAgentTool,
    options?: unknown
  ) => unknown
}

interface DocumentWithModelContext {
  modelContext?: ModelContextWithRegisterTool
}

const ACTIONS = [
  'browserState',
  'click',
  'fill',
  'select',
  'scroll',
  'executeJavascript',
  'searchTree',
] as const

type ActionName = (typeof ACTIONS)[number]

const handlerByAction: Record<ActionName, keyof typeof handlerMocks> = {
  browserState: 'handleBrowserState',
  click: 'handleClick',
  fill: 'handleFill',
  select: 'handleSelect',
  scroll: 'handleScroll',
  executeJavascript: 'handleExecuteJavascript',
  searchTree: 'handleSearchTree',
}

function resetWindowGlobals() {
  delete window.__webmcpcli_toolConfig
  delete window.__webmcpcli_beforeGetBrowserState
}

function captureExecute(): PageAgentExecute {
  const mcp = (document as DocumentWithModelContext).modelContext
  if (!mcp?.registerTool) {
    throw new Error('document.modelContext.registerTool unavailable')
  }

  let execute: PageAgentExecute | null = null
  const original = mcp.registerTool.bind(mcp)
  mcp.registerTool = (tool: RegisterablePageAgentTool, options?: unknown) => {
    if (tool?.name === 'page-agent-tool' && typeof tool.execute === 'function') {
      execute = tool.execute.bind(tool)
    }
    return original(tool, options)
  }

  try {
    registerPageAgentTool()
  } finally {
    mcp.registerTool = original
  }

  if (!execute) {
    throw new Error('failed to capture page-agent-tool execute')
  }
  return execute
}

function argsFor(action: ActionName): PageAgentToolInput {
  switch (action) {
    case 'browserState':
      return { action, responseMode: 'full', contextLines: 2, maxMatches: 20 }
    case 'click':
      return { action, index: 0, contextLines: 2, maxMatches: 20 }
    case 'fill':
      return { action, index: 0, text: 'hello', contextLines: 2, maxMatches: 20 }
    case 'select':
      return { action, index: 0, text: 'opt', contextLines: 2, maxMatches: 20 }
    case 'scroll':
      return { action, down: true, numPages: 1, contextLines: 2, maxMatches: 20 }
    case 'executeJavascript':
      return { action, script: '1+1', contextLines: 2, maxMatches: 20 }
    case 'searchTree':
      return { action, query: 'button', contextLines: 2, maxMatches: 20 }
  }
}

describe('page-agent-tool action dispatch（防 switch fall-through）', () => {
  let execute: PageAgentExecute

  beforeAll(async () => {
    resetWindowGlobals()
    execute = captureExecute()
    // 等待 pageController.maskReady 把 SimulatorMask 挂上
    await Promise.resolve()
    await Promise.resolve()
  })

  beforeEach(() => {
    for (const mock of Object.values(handlerMocks)) {
      mock.mockClear()
    }
  })

  afterAll(() => {
    resetWindowGlobals()
  })

  it.each(ACTIONS)('action=%s 只调用对应 handler，且不落入 default', async (action) => {
    const result = await execute(argsFor(action))

    expect(result.content[0]?.text).toBe(`ok:${action}`)
    expect(result.content[0]?.text).not.toMatch(/^未知操作:/)

    const expectedKey = handlerByAction[action]
    for (const [key, mock] of Object.entries(handlerMocks)) {
      if (key === expectedKey) {
        expect(mock, `${key} should be called once`).toHaveBeenCalledTimes(1)
      } else {
        expect(mock, `${key} must not be called for action=${action}`).not.toHaveBeenCalled()
      }
    }
  })
})
