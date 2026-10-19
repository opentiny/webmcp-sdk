import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useRemoterRuntime } from '../src/composable/useRemoterRuntime'

describe('MCP 运行时与插件工具契约', () => {
  it('复现：验证 toggleTool 能够正确切换工具启用状态并同步到 enabledTools 与 agent.ignoreToolnames', () => {
    const emit = vi.fn()
    const enabledTools = ref<Record<string, boolean>>({
      'tool-a': true
    })

    const { toggleTool, agent } = useRemoterRuntime({
      props: {},
      emit,
      enabledTools
    })

    // 模拟本地 MCP 服务器配置
    agent.mcpServers['local-server'] = { type: 'local' } as any
    const localPlugin: any = {
      id: 'local-server',
      tools: [{ id: 'tool-a', enabled: true }]
    }

    // 禁用工具
    toggleTool(localPlugin, 'tool-a', false)
    expect(localPlugin.tools[0].enabled).toBe(false)
    expect(enabledTools.value['tool-a']).toBe(false)
    expect(agent.ignoreToolnames).toContain('tool-a')

    // 启用工具
    toggleTool(localPlugin, 'tool-a', true)
    expect(localPlugin.tools[0].enabled).toBe(true)
    expect(enabledTools.value['tool-a']).toBe(true)
    expect(agent.ignoreToolnames).not.toContain('tool-a')
  })

  it('复现：验证 deletePlugin 能够从 installedPlugins 中移除指定插件', async () => {
    const emit = vi.fn()
    const { deletePlugin, installedPlugins } = useRemoterRuntime({
      props: {},
      emit
    })

    const pluginItem: any = {
      id: 'custom-mcp-server',
      name: 'Custom Server',
      tools: []
    }
    installedPlugins.value.push(pluginItem)
    expect(installedPlugins.value.some((p) => p.id === 'custom-mcp-server')).toBe(true)

    await deletePlugin(pluginItem)
    expect(installedPlugins.value.some((p) => p.id === 'custom-mcp-server')).toBe(false)
  })
})
