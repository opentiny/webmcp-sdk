<script setup lang="ts">
/**
 * 可复制模板：界面、会话和技能都交给 TinyRobot Chat。
 * 页面 WebMCP 通过 createWebMcpToolAdapter 交给套件。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { TrChat, useChatRuntime, type ChatProviderConfig, type ChatUIOptions } from '@opentiny/tiny-robot-chat'
import type { ExtensionManagerActionEvent } from '@opentiny/tiny-robot'
import { loadSkill, localStorageStrategyFactory, skillPlugin, type SkillDefinition } from '@opentiny/tiny-robot-kit'
import { createWebMcpToolAdapter } from '@opentiny/next-sdk'

const runtimeOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

const modelProviders: ChatProviderConfig[] = [
  {
    type: 'openai',
    // 同源路径，开发时由 Vite 转发到 web-agent-copy 使用的大模型网关，避免浏览器跨域
    apiUrl: new URL('/api/v1/llm/chat/completions', runtimeOrigin).toString(),
    models: [{ id: 'deepseek-flash', label: '电商助手' }]
  }
]

const props = defineProps<{
  skills?: Record<string, string | (() => Promise<string>)>
}>()

const mcp = createWebMcpToolAdapter().createChatMcpAdapter({
  onScope(start, stop) {
    onMounted(start)
    onUnmounted(stop)
  },
  box(initial) {
    const state = ref(initial)
    return {
      get value() {
        return state.value
      },
      set(next) {
        state.value = next
      }
    }
  }
})

const skills = ref<SkillDefinition[]>([])
const skillEnabled = ref<Record<string, boolean>>({})
const enabledSkills = computed(() => skills.value.filter((skill) => skillEnabled.value[skill.name] !== false))
const ui = computed<ChatUIOptions>(() => ({
  extensions: {
    tabs: [
      {
        id: 'skills',
        label: 'Skills',
        items: skills.value.map((skill) => ({
          id: skill.name,
          name: skill.name,
          description: skill.description,
          installed: true,
          actions: [
            {
              id: 'toggle',
              type: 'switch',
              label: '',
              checked: skillEnabled.value[skill.name] !== false
            }
          ]
        }))
      }
    ]
  }
}))

function onExtensionAction(event: ExtensionManagerActionEvent) {
  if (event.tabId !== 'skills' || event.action.id !== 'toggle' || typeof event.action.checked !== 'boolean') return
  skillEnabled.value = { ...skillEnabled.value, [event.itemId]: event.action.checked }
}

onMounted(async () => {
  const next: SkillDefinition[] = []
  for (const [key, source] of Object.entries(props.skills ?? {})) {
    if (!key.replace(/\\/g, '/').endsWith('SKILL.md')) continue
    const raw = typeof source === 'string' ? source : await source()
    const file = new File([raw], 'SKILL.md', { type: 'text/markdown' })
    next.push(await loadSkill({ source: 'browser', fileList: [file] }))
  }
  skills.value = next
})

const runtime = useChatRuntime({
  modelProviders,
  mcp,
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
        skillPlugin({ mode: 'auto', skills: enabledSkills })
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
  <TrChat class="webmcp-chat" :runtime="runtime" :ui="ui" @extension-action="onExtensionAction" />
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
