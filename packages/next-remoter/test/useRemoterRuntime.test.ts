import { describe, expect, it, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { useRemoterRuntime } from '../src/composable/useRemoterRuntime'

describe('useRemoterRuntime 对接 Chat 套件契约', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('复现：验证 useRemoterRuntime 初始化并暴露基于 tiny-robot-chat 的 runtime 与 conversation', () => {
    const emit = vi.fn()
    const { runtime, conversation, agent, promptManager } = useRemoterRuntime({
      props: {
        title: '测试遥控器',
        systemPrompt: 'You are a helpful assistant'
      },
      emit
    })

    expect(runtime).toBeDefined()
    expect(conversation).toBeDefined()
    expect(agent).toBeDefined()
    expect(promptManager).toBeDefined()

    // 验证 conversation 具备套件 1.0.0-rc.2 的基础 API
    expect(typeof conversation.createConversation).toBe('function')
    expect(typeof conversation.switchConversation).toBe('function')
    expect(typeof conversation.deleteConversation).toBe('function')
    expect(typeof conversation.clear).toBe('function')
    expect(typeof conversation.sendMessage).toBe('function')

    // 验证 runtime 具备 chat 套件标准接口
    expect(runtime.actions).toBeDefined()
    expect(typeof runtime.actions.send).toBe('function')
    expect(typeof runtime.actions.abort).toBe('function')
    expect(runtime.activeConversation).toBeDefined()
  })

  it('复现：验证 beforeSend 能正确拦截形如 /abc12345 的会话识别码', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { sessionId: 'mock-session-123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const emit = vi.fn()
    const { runtime } = useRemoterRuntime({
      props: {},
      emit
    })

    const shortCode = '/abcdefgh'
    const res = await runtime.actions.send({ text: shortCode })
    // beforeSend 返回 'handled'，runtime.actions.send 返回 true 代表已处理，不再发送给 LLM
    expect(res).toBe(true)
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('复现：切换大模型或更新配置时能同步生效', () => {
    const emit = vi.fn()
    const selectedModelId = ref('test-model-1')
    const { updateLLMConfig, selectedModel } = useRemoterRuntime({
      props: {
        llmConfigs: [
          {
            id: 'test-model-1',
            name: '测试模型 1',
            model: 'deepseek-chat',
            apiKey: 'sk-123',
            isDefault: true
          }
        ]
      },
      emit,
      selectedModelId
    })

    expect(selectedModel.value?.id).toBe('test-model-1')

    updateLLMConfig({
      model: 'deepseek-chat',
      apiKey: 'sk-new-key'
    })

    expect(selectedModelId.value).toBe('test-model-1')
  })
})
