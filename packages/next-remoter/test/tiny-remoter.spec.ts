import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { TinyRemoter, useModel } from '../src/index'
import { useTinyRobotChat } from '../src/composable/useTinyRobotChat'
import type { UnifiedModelConfig } from '../src/types/model-config'
import type { PluginInfo } from '@opentiny/tiny-robot'

describe('TinyRemoter 组件与 API 契约测试', () => {
  describe('模块导出契约', () => {
    it('TinyRemoter 导出有效且支持 Vue 插件 install', () => {
      expect(TinyRemoter).toBeDefined()
      expect(typeof TinyRemoter === 'object' || typeof TinyRemoter === 'function').toBe(true)
      expect(typeof TinyRemoter.install).toBe('function')
    })

    it('导出 useModel 组合式函数', () => {
      expect(useModel).toBeDefined()
      expect(typeof useModel).toBe('function')
    })
  })

  describe('TinyRemoter Props 定义契约完整性', () => {
    const comp = (TinyRemoter as any).__vccOpts || TinyRemoter
    const props = comp.props || {}

    it('必须完整保留所有业务声明的 Props 属性', () => {
      const requiredProps = [
        'agentRoot',
        'sessionId',
        'menuItems',
        'remoteUrl',
        'qrCodeUrl',
        'systemPrompt',
        'title',
        'locale',
        'AILogoUrl',
        'roleAvatar',
        'mode',
        'llmConfig',
        'inBrowserExt',
        'genUiComponents',
        'customMarketMcpServers',
        'mcpServers',
        'llmConfigs',
        'skills',
        'layoutMode',
        'debugStream',
        'promptItems',
        'pillItems',
        'allowSpeech'
      ]

      for (const propName of requiredProps) {
        expect(props, `Props 应包含 ${propName}`).toHaveProperty(propName)
      }
    })

    it('关键 Props 的默认值须与规范保持一致', () => {
      expect(props.title?.default).toBe('OpenTiny NEXT')
      expect(props.systemPrompt?.default).toBe('你是一个智能助手，擅长通过工具调用帮助用户解决问题和满足用户需求')
      expect(props.agentRoot?.default).toBe('https://agent.opentiny.design/api/v1/webmcp-trial/')
      expect(props.locale?.default).toBe('zh-CN')
      expect(props.mode?.default).toBe('remoter')
      expect(props.inBrowserExt?.default).toBe(false)
      expect(props.layoutMode?.default).toBe('fixed')
      expect(props.debugStream?.default).toBe(false)
      expect(props.allowSpeech?.default).toBe(false)
    })
  })

  describe('TinyRemoter Emits 与 defineModel 定义契约', () => {
    it('必须保留全部业务 Emits 及 v-model 映射更新事件', () => {
      const comp = (TinyRemoter as any).__vccOpts || TinyRemoter
      const emits = comp.emits || []

      // 业务事件
      expect(emits).toContain('before-ai-render')
      expect(emits).toContain('chat-stream-finish')

      // defineModel 自动生成的 update:* 事件
      expect(emits).toContain('update:fullscreen')
      expect(emits).toContain('update:show')
      expect(emits).toContain('update:selectedModelId')
      expect(emits).toContain('update:genUiAble')
      expect(emits).toContain('update:enabledTools')
    })
  })

  describe('useTinyRobotChat 底层 Runtime 结构契约（适配 tiny-robot-chat 协议）', () => {
    const mockLlmConfigs = ref<UnifiedModelConfig[]>([
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        baseURL: 'https://api.deepseek.com',
        apiKey: 'test-key'
      }
    ])
    const mockSelectedModelId = ref<string | undefined>('deepseek-chat')

    const mockPlugins = ref<PluginInfo[]>([
      {
        name: 'test-tool',
        description: 'Test WebMCP Tool',
        enabled: true,
        type: 'in-browser',
        tools: [
          {
            name: 'mockFunction',
            description: 'Mock function description',
            parameters: {},
            enabled: true
          }
        ]
      }
    ])
    const mockEnabledTools = ref<Record<string, boolean>>({
      mockFunction: true
    })

    it('应生成标准的 ChatModelRuntime（对接 TrChat composer.model）', () => {
      const { chatRuntime } = useTinyRobotChat({
        systemPrompt: 'test prompt',
        emit: () => {},
        modelOptions: {
          llmConfigs: mockLlmConfigs,
          selectedModelId: mockSelectedModelId
        }
      })

      expect(chatRuntime.value).toBeDefined()
      expect(chatRuntime.value.composer).toBeDefined()
      expect(chatRuntime.value.composer.model).toBeDefined()

      const modelRuntime = chatRuntime.value.composer.model!
      expect(modelRuntime.selectedId.value).toBe('deepseek-chat')
      expect(modelRuntime.options.value).toHaveLength(1)
      expect(modelRuntime.options.value[0].id).toBe('deepseek-chat')
      expect(modelRuntime.options.value[0].label).toBe('DeepSeek Chat')

      // 测试模型切换
      modelRuntime.select('another-model')
      expect(mockSelectedModelId.value).toBe('another-model')
      expect(modelRuntime.selectedId.value).toBe('another-model')
    })

    it('应生成标准的 ChatMcpRuntime（对接 TrChat composer.mcp）', () => {
      let toggledData: any = null
      const { chatRuntime } = useTinyRobotChat({
        systemPrompt: 'test prompt',
        emit: () => {},
        mcpOptions: {
          installedPlugins: mockPlugins,
          enabledTools: mockEnabledTools,
          onToggleTool: (data) => {
            toggledData = data
          }
        }
      })

      expect(chatRuntime.value.composer.mcp).toBeDefined()
      const mcpRuntime = chatRuntime.value.composer.mcp!
      const servers = mcpRuntime.servers.value
      expect(servers).toHaveLength(1)
      expect(servers[0].id).toBe('test-tool')
      expect(servers[0].enabled).toBe(true)

      const tools = mcpRuntime.tools.value
      expect(tools['test-tool']).toBeDefined()
      expect(tools['test-tool'][0].id).toBe('mockFunction')
      expect(tools['test-tool'][0].enabled).toBe(true)

      // 测试禁用服务与工具
      mcpRuntime.setServerEnabled('test-tool', false)
      expect(mockPlugins.value[0].enabled).toBe(false)

      mcpRuntime.setToolEnabled('test-tool', 'mockFunction', false)
      expect(mockEnabledTools.value['mockFunction']).toBe(false)
      expect(toggledData).toEqual({
        serverName: 'test-tool',
        toolName: 'mockFunction',
        enabled: false
      })
    })

    it('应提供 actions 核心能力与操作接口', () => {
      const { chatRuntime } = useTinyRobotChat({
        systemPrompt: 'test prompt',
        emit: () => {}
      })

      expect(chatRuntime.value.actions).toBeDefined()
      expect(typeof chatRuntime.value.actions.send).toBe('function')
      expect(typeof chatRuntime.value.actions.abort).toBe('function')
      expect(typeof chatRuntime.value.actions.createConversation).toBe('function')
      expect(typeof chatRuntime.value.actions.switchConversation).toBe('function')
      expect(typeof chatRuntime.value.actions.renameConversation).toBe('function')
      expect(typeof chatRuntime.value.actions.deleteConversation).toBe('function')
    })
  })
})
