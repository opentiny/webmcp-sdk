import { toRef, watch, ref, type Ref } from 'vue'
import {
  useConversation,
  localStorageStrategyFactory,
  type ChatCompletion,
  type MessageRequestBody
} from '@opentiny/tiny-robot-kit'
import {
  useChatRuntimeFromConversation,
  type ChatBeforeSend
} from '@opentiny/tiny-robot-chat'
import {
  AgentModelProvider,
  type McpServerConfig,
  type MenuItemConfig
} from '@opentiny/next-sdk'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'
import type { ProviderV2 } from '@ai-sdk/provider'
import { PromptManager } from './promptManager'
import { GENUI_CONFIG } from '../config/genui-config'
import useModel from './useModel'
import { useSkillWithTools } from './useSkill'
import { usePlugin } from './usePlugin'
import { usePluginSession } from './usePluginSession'
import { defaultPluginSrc } from '../components/default-plugin-svg'
import type { UnifiedModelConfig } from '../types/model-config'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'

export interface RemoterRuntimeOptions {
  props: {
    agentRoot?: string
    sessionId?: string
    menuItems?: MenuItemConfig[]
    remoteUrl?: string
    qrCodeUrl?: string
    systemPrompt?: string
    title?: string
    locale?: string
    AILogoUrl?: string
    mode?: string
    llmConfig?: ICustomAgentModelProviderLlmConfig
    inBrowserExt?: boolean
    genUiComponents?: Record<string, any>
    customMarketMcpServers?: any[]
    mcpServers?: Record<string, McpServerConfig>
    llmConfigs?: UnifiedModelConfig[]
    skills?: Record<string, string | (() => Promise<string>)>
    debugStream?: boolean
  }
  emit: (event: string, ...args: any[]) => void
  selectedModelId?: Ref<string | undefined>
  genUiAble?: Ref<boolean>
  enabledTools?: Ref<Record<string, boolean> | undefined>
  show?: Ref<boolean>
  fullscreen?: Ref<boolean>
}

const DEFAULT_SHARED_CONFIG = {
  model: 'deepseek-ai/DeepSeek-V3',
  maxSteps: 30,
  extraTools: {}
}

const DEFAULT_FACTORY_CONFIG = {
  apiKey: 'sk-trial',
  baseURL: 'https://agent.opentiny.design/api/v1/ai/',
  genuiUrl: 'https://agent.opentiny.design/api/v1/ai/prompt',
  providerType: 'deepseek' as const
}

function mergeProviderOptions(user?: Record<string, any>, defaults?: Record<string, any>) {
  if (!defaults && !user) return undefined
  if (!user) return defaults
  if (!defaults) return user
  const result: Record<string, any> = { ...defaults }
  for (const [provider, options] of Object.entries(user)) {
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      result[provider] = { ...(result[provider] || {}), ...options }
    } else {
      result[provider] = options
    }
  }
  return result
}

export function useRemoterRuntime(options: RemoterRuntimeOptions) {
  const { props, emit, selectedModelId, genUiAble, enabledTools, show } = options

  // 1. 初始化大模型与提示词管理器
  const mergedConfig: any = {
    ...DEFAULT_SHARED_CONFIG,
    ...DEFAULT_FACTORY_CONFIG,
    ...(props.llmConfig || {})
  }

  const agent = new AgentModelProvider({
    llmConfig: mergedConfig.llm ? { llm: mergedConfig.llm } : { ...mergedConfig }
  })
  const promptManager = new PromptManager()
  promptManager.setStatic(props.systemPrompt || '')

  watch(
    () => props.systemPrompt,
    (prompt) => {
      promptManager.setStatic(prompt || '')
    }
  )

  // 2. 插件管理（与 agent 绑定）
  const internalEnabledTools = enabledTools || ref<Record<string, boolean> | undefined>({})
  const {
    installedPlugins,
    marketPlugins,
    pluginVisible,
    loadMcpServerToPlugin,
    togglePlugin,
    toggleTool,
    deletePlugin,
    addPluginCore,
    addPluginFromMarket,
    addPluginFromScan,
    handleClientDisconnected,
    searchPlugin,
    syncInstalledPluginTools
  } = usePlugin(agent, internalEnabledTools, defaultPluginSrc)

  marketPlugins.value = [...(props.customMarketMcpServers || [])]

  // 3. 模型配置管理
  const llmConfigsRef = props.llmConfigs ? (toRef(props, 'llmConfigs') as Ref<UnifiedModelConfig[]>) : undefined
  const { selectedModel } = useModel(llmConfigsRef, selectedModelId)

  const updateLLMConfig = (cfg: {
    model: string
    baseURL?: string
    genuiUrl?: string
    apiKey?: string
    providerType?: 'deepseek' | 'openai' | ((opt: any) => ProviderV2)
    useReActMode?: boolean
    llm?: ProviderV2
    providerOptions?: Record<string, any>
    headers?: Record<string, string>
  }) => {
    if (cfg.llm) {
      agent.llm = cfg.llm
      agent.useReActMode = cfg.useReActMode || false
      mergedConfig.model = cfg.model
      mergedConfig.useReActMode = cfg.useReActMode
    } else if (cfg.providerType && cfg.baseURL && cfg.apiKey) {
      const finallyBaseURL = genUiAble?.value ? cfg.genuiUrl || cfg.baseURL : cfg.baseURL
      mergedConfig.model = cfg.model
      mergedConfig.apiKey = cfg.apiKey
      mergedConfig.baseURL = cfg.baseURL
      mergedConfig.providerType = cfg.providerType
      mergedConfig.useReActMode = cfg.useReActMode || false
      agent.useReActMode = cfg.useReActMode || false

      let providerFn: (options: { apiKey: string; baseURL: string; headers?: Record<string, string> }) => ProviderV2 | OpenAIProvider
      if (cfg.providerType === 'deepseek') {
        providerFn = createDeepSeek
      } else if (cfg.providerType === 'openai') {
        providerFn = createOpenAI
      } else if (typeof cfg.providerType === 'function') {
        providerFn = cfg.providerType
      } else {
        throw new Error(`Unsupported providerType: ${cfg.providerType}`)
      }
      agent.llm = providerFn({ apiKey: cfg.apiKey, baseURL: finallyBaseURL, ...(cfg.headers ? { headers: cfg.headers } : {}) })
    }
    mergedConfig.providerOptions = cfg.providerOptions
    mergedConfig.headers = cfg.headers
  }

  const syncModelConfig = () => {
    if (selectedModel.value) {
      const m = selectedModel.value
      updateLLMConfig({
        model: m.model || '',
        baseURL: m.baseURL || '',
        genuiUrl: m.genuiUrl || '',
        apiKey: m.apiKey || '',
        providerType: m.providerType,
        useReActMode: m.useReActMode,
        llm: m.llm,
        providerOptions: m.providerOptions,
        headers: m.headers
      })
    }
  }

  if (props.llmConfigs) {
    watch(selectedModel, syncModelConfig, { immediate: true })
  }
  if (genUiAble) {
    watch(genUiAble, syncModelConfig, { immediate: true })
  }

  // 4. Skills 接入
  const skillsRef = toRef(props, 'skills')
  useSkillWithTools({
    skillsRef: skillsRef as any,
    customAgentProvider: {
      promptManager,
      llmConfig: mergedConfig
    }
  })

  // 5. 遥控器 session / 扫码 / 识别码输入逻辑
  const inputMessageRef = ref('')
  const { handleScanSuccess, handleSessionIdInput, initialize: initializePluginSession } = usePluginSession({
    sessionId: toRef(props, 'sessionId'),
    agentRoot: toRef(props, 'agentRoot', 'https://agent.opentiny.design/api/v1/webmcp-trial/'),
    mode: props.mode || 'remoter',
    qrCodeUrl: props.qrCodeUrl,
    remoteUrl: props.remoteUrl,
    menuItems: toRef(props, 'menuItems'),
    AILogoUrl: props.AILogoUrl,
    show: show || ref(false),
    addPluginFromScan,
    inputMessage: inputMessageRef
  })

  initializePluginSession()

  // 6. 核心 responseProvider：把 agent.chatStream 的 fullStream 转换为标准 OpenAI chunk
  const responseProvider = async function* (body: MessageRequestBody, abortSignal: AbortSignal): AsyncGenerator<ChatCompletion> {
    const lastUserMsg = body.messages[body.messages.length - 1]
    if (!lastUserMsg) return

    const allToolNames: string[] = Object.keys(mergedConfig.extraTools || {})
    Object.values(agent.mcpTools || {}).forEach((toolObj) => {
      allToolNames.push(...Object.keys(toolObj || {}))
    })
    const activeTools = Array.from(new Set(allToolNames)).filter((name) => !agent.ignoreToolnames.includes(name))

    const chatStreamOptions: any = {
      model: mergedConfig.model,
      system: promptManager.getSystemPrompt(),
      abortSignal,
      toolChoice: 'auto',
      tools: mergedConfig.extraTools || {},
      maxSteps: mergedConfig.maxSteps,
      providerOptions: mergeProviderOptions(mergedConfig.providerOptions, GENUI_CONFIG),
      prepareStep: ({ messages }: { messages: any[] }) => {
        return {
          system: promptManager.getSystemPrompt(),
          messages,
          activeTools
        }
      },
      onStepFinish: (result: any) => {
        if (result.finishReason === 'tool-calls' && result.content?.length > 0) {
          const lastMsg = result.content[result.content.length - 1]
          if (lastMsg.toolName === 'get_skill_content' && lastMsg.type === 'tool-result') {
            promptManager.appendTemp(lastMsg.output?.content || '')
          }
        }
      },
      onFinish: async () => {
        await agent.closeAll()
        promptManager.setTemp('')
        emit('chat-stream-finish')
      }
    }

    // 格式化消息给 ai-sdk
    const cleanMessages = (messages: any[]) =>
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))

    chatStreamOptions.messages = cleanMessages(body.messages)
    const result = await agent.chatStream(chatStreamOptions)

    const chunkId = `chatcmpl_${Date.now()}`
    let accumulatedText = ''

    for await (const event of (result as any).fullStream) {
      if (abortSignal.aborted) break

      if (event.type === 'reasoning-delta') {
        yield {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: mergedConfig.model,
          system_fingerprint: null,
          choices: [{
            index: 0,
            delta: { role: 'assistant', reasoning_content: event.text },
            finish_reason: null,
            message: undefined as any,
            logprobs: null
          }]
        }
      } else if (event.type === 'text-delta') {
        accumulatedText += event.text
        yield {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: mergedConfig.model,
          system_fingerprint: null,
          choices: [{
            index: 0,
            delta: { role: 'assistant', content: event.text },
            finish_reason: null,
            message: undefined as any,
            logprobs: null
          }]
        }
      } else if (event.type === 'tool-call') {
        yield {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: mergedConfig.model,
          system_fingerprint: null,
          choices: [{
            index: 0,
            delta: {
              role: 'assistant',
              tool_calls: [{
                index: 0,
                id: event.toolCallId || event.id,
                type: 'function',
                function: {
                  name: event.toolName,
                  arguments: typeof event.input === 'string' ? event.input : JSON.stringify(event.input || {})
                }
              }]
            },
            finish_reason: null,
            message: undefined as any,
            logprobs: null
          }]
        }
      } else if (event.type === 'finish') {
        emit('before-ai-render', {
          role: 'assistant',
          content: accumulatedText,
          uiContent: [{ type: 'markdown', content: accumulatedText }]
        })
        yield {
          id: chunkId,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: mergedConfig.model,
          system_fingerprint: null,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop',
            message: undefined as any,
            logprobs: null
          }]
        }
      }
    }
  }

  // 7. useConversation 与 useChatRuntime
  const conversation = useConversation({
    useMessageOptions: {
      responseProvider: responseProvider as any
    },
    storage: localStorageStrategyFactory({ key: 'tiny-remoter-conversations' } as any),
    autoSaveMessages: true
  })

  const beforeSend: ChatBeforeSend = async ({ payload }) => {
    // 拦截识别码（如 /abc123）
    if (payload.text) {
      const isSessionId = await handleSessionIdInput(payload.text)
      if (isSessionId) {
        return 'handled'
      }
    }
    return 'continue'
  }

  const runtime = useChatRuntimeFromConversation({
    conversation,
    beforeSend
  })

  // 8. 挂载时初始化外部 MCP 服务
  const initMcpServers = async () => {
    if (props.mcpServers) {
      for (const [name, config] of Object.entries(props.mcpServers)) {
        await loadMcpServerToPlugin(name, config)
      }
    }
    const preInstalledPlugins = marketPlugins.value.filter((p: any) => p.addState === 'added' && p.enabled)
    for (const p of preInstalledPlugins) {
      await addPluginFromMarket(p)
    }
  }

  return {
    agent,
    promptManager,
    runtime,
    conversation,
    installedPlugins,
    marketPlugins,
    pluginVisible,
    loadMcpServerToPlugin,
    togglePlugin,
    toggleTool,
    deletePlugin,
    addPluginCore,
    addPluginFromMarket,
    handleClientDisconnected,
    searchPlugin,
    syncInstalledPluginTools,
    handleScanSuccess,
    initMcpServers,
    updateLLMConfig,
    selectedModel
  }
}
