import { describe, expect, it, vi } from 'vitest'
import { createWebMcpToolAdapter, type WebMcpModelContext, type WebMcpStateBox } from '../../agent/webmcp-tool-adapter'

function box<T>(initial: T): WebMcpStateBox<T> {
  let current = initial
  return {
    get value() {
      return current
    },
    set(next) {
      current = next
    }
  }
}

function context(tools: Array<{ name: string; description?: string; inputSchema?: unknown }>) {
  const listeners = new Set<() => void>()
  const executeTool = vi.fn(async (tool: { name: string }, input: string) => ({
    content: [{ type: 'text', text: `${tool.name}:${input}` }]
  }))
  const model: WebMcpModelContext & { emit: () => void } = {
    getTools: async () => tools,
    executeTool,
    addEventListener: (_type, listener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener)
    },
    emit: () => listeners.forEach((listener) => listener())
  }
  return { model, executeTool }
}

describe('createWebMcpToolAdapter', () => {
  it('按 MCP tools/list 与 tools/call 列出并执行页面工具', async () => {
    const { model, executeTool } = context([
      {
        name: 'echo',
        description: '回声',
        inputSchema: '{"type":"object","properties":{"q":{"type":"string"}}}'
      }
    ])
    const adapter = createWebMcpToolAdapter({ getContext: () => model })

    const listed = await adapter.listTools()
    expect(listed).toEqual([
      {
        name: 'echo',
        description: '回声',
        inputSchema: { type: 'object', properties: { q: { type: 'string' } } }
      }
    ])

    await expect(adapter.callTool('echo', { q: 'hi' })).resolves.toBe('echo:{"q":"hi"}')
    expect(executeTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'echo' }), '{"q":"hi"}')
  })

  it('toolchange 后通知订阅者，并反映新的工具集合', async () => {
    const tools = [{ name: 'echo', description: '回声' }]
    const { model } = context(tools)
    const adapter = createWebMcpToolAdapter({ getContext: () => model })
    const listener = vi.fn()
    adapter.subscribe(listener)

    tools.push({ name: 'navigate_to_page', description: '跳转' })
    model.emit()
    await vi.waitFor(() => expect(listener).toHaveBeenCalled())

    const names = (await adapter.listTools()).map((tool) => tool.name)
    expect(names).toEqual(['echo', 'navigate_to_page'])
  })

  it('投影成 Chat 套件 mcp 时使用 serverId__工具名', async () => {
    const { model } = context([{ name: 'echo', description: '回声' }])
    let start = () => {}
    const chat = createWebMcpToolAdapter({ getContext: () => model }).createChatMcpAdapter({
      onScope(run) {
        start = run
      },
      box
    })
    start()
    await vi.waitFor(() => expect(chat.runtime.tools.value.webmcp).toHaveLength(1))

    const definitions = await chat.listTools(['webmcp'], { webmcp: ['echo'] })
    expect(definitions[0]).toMatchObject({
      serverId: 'webmcp',
      name: 'webmcp__echo',
      originalName: 'echo'
    })
    await expect(chat.callTool('webmcp', 'echo', {})).resolves.toBe('echo:{}')
    await expect(chat.callTool('other', 'echo', {})).rejects.toThrow(/Unknown MCP server/)
  })
})
