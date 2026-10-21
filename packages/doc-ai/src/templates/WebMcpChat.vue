<script setup lang="ts">
/**
 * 可复制模板：界面、会话和技能都交给 TinyRobot Chat。
 * 本文件只把 document.modelContext 适配成套件的 mcp。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { TrChat, useChatRuntime, type ChatMcpServerInfo, type ChatMcpToolInfo, type ChatProviderConfig, type UseChatRuntimeMcpAdapter } from '@opentiny/tiny-robot-chat'
import { localStorageStrategyFactory, skillPlugin, type SkillDefinition } from '@opentiny/tiny-robot-kit'
import { parseSkillFrontMatter } from '@opentiny/next-sdk'

const SERVER_ID = 'webmcp'

const modelProviders: ChatProviderConfig[] = [
  {
    type: 'openai',
    apiUrl: 'https://agent.opentiny.design/api/v1/ai/chat/completions',
    apiKey: 'sk-trial',
    models: [{ id: 'deepseek-ai/DeepSeek-V3', label: '电商助手' }]
  }
]

const props = defineProps<{
  skills?: Record<string, string | (() => Promise<string>)>
}>()

interface WebMcpTool {
  name: string
  description?: string
  inputSchema?: unknown
}

interface WebMcpContext {
  listTools?: () => Promise<WebMcpTool[]>
  getTools?: () => Promise<WebMcpTool[]>
  executeTool?: (tool: WebMcpTool, input: string) => Promise<unknown>
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

function modelContext() {
  return (document as Document & { modelContext?: WebMcpContext }).modelContext
}

function schemaOf(raw: unknown): Record<string, unknown> {
  let schema: Record<string, unknown> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) schema = { ...(raw as Record<string, unknown>) }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) schema = parsed as Record<string, unknown>
    } catch {
      schema = {}
    }
  }
  return {
    ...schema,
    type: typeof schema.type === 'string' ? schema.type : 'object',
    properties: schema.properties && typeof schema.properties === 'object' ? schema.properties : {}
  }
}

function textOf(result: unknown) {
  if (typeof result === 'string') return result
  const content = (result as { content?: unknown })?.content
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : String((part as { text?: unknown })?.text ?? '')))
      .filter(Boolean)
      .join('\n')
    if (text.trim()) return text
  }
  return JSON.stringify(result)
}

function createWebMcpAdapter(): UseChatRuntimeMcpAdapter {
  const server = reactive<ChatMcpServerInfo>({
    id: SERVER_ID,
    name: '页面 WebMCP',
    description: 'document.modelContext 上的工具',
    installed: true,
    enabled: true
  })
  const tools = ref<ChatMcpToolInfo[]>([])
  const descriptors = new Map<string, WebMcpTool>()

  async function refresh() {
    const ctx = modelContext()
    const list = ctx?.listTools ?? ctx?.getTools
    const listed = list ? await list.call(ctx) : []
    descriptors.clear()
    const enabled = new Map(tools.value.map((item) => [item.id, item.enabled]))
    for (const tool of listed) {
      if (tool?.name && !descriptors.has(tool.name)) descriptors.set(tool.name, tool)
    }
    tools.value = [...descriptors.keys()].map((name) => ({
      id: name,
      name,
      description: descriptors.get(name)?.description,
      enabled: enabled.get(name) ?? true
    }))
  }

  const onToolChange = () => void refresh()
  onMounted(() => {
    modelContext()?.addEventListener?.('toolchange', onToolChange)
    void refresh()
  })
  onUnmounted(() => modelContext()?.removeEventListener?.('toolchange', onToolChange))

  return {
    runtime: {
      servers: computed(() => [{ ...server }]),
      tools: computed(() => ({ [SERVER_ID]: tools.value.map((item) => ({ ...item })) })),
      async addServer() {
        server.installed = true
        server.enabled = true
        await refresh()
      },
      removeServer() {
        server.installed = false
        server.enabled = false
        tools.value = []
        descriptors.clear()
      },
      async setServerEnabled(_id, enabled) {
        server.enabled = enabled
        if (enabled && tools.value.length === 0) await refresh()
        tools.value = tools.value.map((item) => ({ ...item, enabled }))
      },
      setToolEnabled(_serverId, toolId, enabled) {
        tools.value = tools.value.map((item) => (item.id === toolId ? { ...item, enabled } : item))
      }
    },
    async listTools(_serverIds, selected) {
      if (descriptors.size === 0) await refresh()
      return (selected[SERVER_ID] ?? []).flatMap((id) => {
        const tool = descriptors.get(id)
        return tool
          ? [{
              serverId: SERVER_ID,
              id,
              name: `${SERVER_ID}__${id}`,
              originalName: id,
              description: tool.description,
              inputSchema: schemaOf(tool.inputSchema)
            }]
          : []
      })
    },
    async callTool(_serverId, name, args) {
      const ctx = modelContext()
      const tool = descriptors.get(name)
      if (!ctx?.executeTool || !tool) throw new Error(`WebMCP 工具不可用：${name}`)
      return textOf(await ctx.executeTool(tool, JSON.stringify(args ?? {})))
    }
  }
}

const skills = ref<SkillDefinition[]>([])
onMounted(async () => {
  const next: SkillDefinition[] = []
  for (const [key, source] of Object.entries(props.skills ?? {})) {
    if (!key.replace(/\\/g, '/').endsWith('SKILL.md')) continue
    const raw = typeof source === 'string' ? source : await source()
    const meta = await parseSkillFrontMatter(raw)
    if (!meta) continue
    next.push({
      name: meta.name,
      description: meta.description,
      instructions: raw.replace(/^---[\s\S]*?---\s*/, '').trim()
    })
  }
  skills.value = next
})

const runtime = useChatRuntime({
  modelProviders,
  mcp: createWebMcpAdapter(),
  conversation: {
    storage: localStorageStrategyFactory({ key: 'doc-ai-webmcp-chat-v1' }),
    autoSaveMessages: true,
    useMessageOptions: {
      plugins: [
        {
          name: 'page-hint',
          onBeforeRequest({ requestBody }) {
            const messages = (requestBody.messages ?? []).filter((message) => message.role !== 'system')
            requestBody.messages = [
              {
                role: 'system',
                content:
                  '你是当前网页的助手。工具来自页面 WebMCP，会随路由出现和消失。列表里没有目标工具时，先调用 navigate_to_page。跳转后新工具要等用户再发一条消息才能调用。业务规则以已选中的技能说明为准。'
              },
              ...messages
            ]
          }
        },
        skillPlugin({ mode: 'auto', skills })
      ]
    }
  }
})

watch(
  () => runtime.activeConversation.value?.requestState,
  (state, prev) => {
    if (prev === 'processing' && state && state !== 'processing') {
      window.dispatchEvent(new CustomEvent('page-agent-chat-end'))
    }
  }
)
</script>

<template>
  <TrChat class="webmcp-chat" :runtime="runtime" />
</template>

<style scoped>
.webmcp-chat {
  --tr-layout-height: 100%;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
}

.webmcp-chat :deep(.tr-chat-ui) {
  height: 100%;
  min-height: 0;
}
</style>
