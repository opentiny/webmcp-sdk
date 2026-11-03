<script setup lang="ts">
/**
 * 可复制模板：界面、会话、请求循环都交给 TinyRobot Chat。
 * 本文件只做三件事：把页面 WebMCP 接成套件的 mcp、把内置 SKILL.md 接成技能、在一轮请求结束后通知 page-agent 收遮罩。
 *
 * 接入时容易踩的约定：
 * 1. mcp 与 mcpServers 互斥。页面工具在 document.modelContext 上，没有 HTTP 端点，所以用自定义 mcp，不用 mcpServers.baseUrl。
 * 2. 模型看到的函数名是 webmcp__工具名，执行时用原始名。createWebMcpToolAdapter 已经做了这层转换。
 * 3. 套件只认 { value }，不依赖 Vue。box 必须包 ref，工具列表才会在 toolchange 后刷新。
 * 4. 一轮用户消息开始时，套件会锁住当时启用的工具 id。navigate_to_page 之后新出现的工具，要等用户再发一条消息才能调用。
 * 5. skillPlugin 只负责请求期的 select_skills。扩展面板里的 MCP 标签由套件根据 mcp 自动生成，Skills 标签要自己放进 ui.extensions.tabs。
 * 6. 工具的 description 会原样出现在调用卡片上。page-agent 的 description 是一整份操作手册，卡片里会铺开。这是给模型看的说明，调用结果在卡片右侧箭头里。不要为了卡片把 description 改短。
 * 7. 模型地址必须是绝对 URL，且路径以 /chat/completions 结尾，否则套件会再拼一次。浏览器不能直连上游，开发时由 Vite 转发。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { TrChat, useChatRuntime, type ChatProviderConfig, type ChatUIOptions } from '@opentiny/tiny-robot-chat'
import type { ExtensionManagerActionEvent } from '@opentiny/tiny-robot'
import { loadSkill, localStorageStrategyFactory, skillPlugin, type SkillDefinition } from '@opentiny/tiny-robot-kit'
import { createWebMcpToolAdapter } from '@opentiny/next-sdk'

// SSR 或单测里没有 window。正式页面用当前源，拼出同源绝对地址。
const runtimeOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

const modelProviders: ChatProviderConfig[] = [
  {
    type: 'openai',
    // 不带 apiKey。网关看到没有 Authorization 时按访客处理，密钥不要放进浏览器。
    // 模型 id 必须是该网关实际提供的，这里是 deepseek-flash。
    apiUrl: new URL('/api/v1/llm/chat/completions', runtimeOrigin).toString(),
    models: [{ id: 'deepseek-flash', label: '电商助手' }]
  }
]

/** App.vue 用 import.meta.glob 传入的 SKILL.md。值是原文，或返回原文的异步函数。 */
const props = defineProps<{
  skills?: Record<string, string | (() => Promise<string>)>
}>()

/**
 * 页面 WebMCP → 套件 mcp。
 * onScope 把刷新和 toolchange 监听绑到组件生命周期。
 * box 用 Vue ref 包住服务器和工具列表：套件渲染时读 .value，Vue 才能追踪到后续更新。
 */
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

/** loadSkill 解析出的完整技能。身份是 front matter 里的 name。 */
const skills = ref<SkillDefinition[]>([])
/** 面板开关。缺省视为开启，只有用户关掉才写成 false。 */
const skillEnabled = ref<Record<string, boolean>>({})
/** 交给 skillPlugin 的候选集。关掉的技能不会进入 select_skills。 */
const enabledSkills = computed(() => skills.value.filter((skill) => skillEnabled.value[skill.name] !== false))

/**
 * 扩展面板。
 * MCP 标签不要写在这里，套件会根据 mcp.runtime 自己生成，id 为 mcp 的标签会被丢掉。
 * 内置技能标成已安装，只提供禁用开关，不提供卸载。
 */
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

/** Skills 标签上的开关。MCP 标签的安装和启用由套件自己处理。 */
function onExtensionAction(event: ExtensionManagerActionEvent) {
  if (event.tabId !== 'skills' || event.action.id !== 'toggle' || typeof event.action.checked !== 'boolean') return
  skillEnabled.value = { ...skillEnabled.value, [event.itemId]: event.action.checked }
}

/**
 * 每个技能单独解析。文件名必须是 SKILL.md。
 * 套件会剥掉路径的第一段目录，把多个技能放进同一次 fileList 会对不上入口文件。
 */
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
    // 只持久化消息。技能开关和页面工具列表不进这份存储。
    storage: localStorageStrategyFactory({ key: 'doc-ai-webmcp-chat-v1' }),
    autoSaveMessages: true,
    useMessageOptions: {
      plugins: [
        {
          name: 'page-hint',
          // 每次请求前重写系统消息，避免多轮对话把系统提示叠上去。
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
        // auto：模型先调用 select_skills，套件再把选中技能的 instructions 写入当次请求。
        skillPlugin({ mode: 'auto', skills: enabledSkills })
      ]
    }
  }
})

// 套件没有 page-agent 遮罩的概念。请求从 processing 离开时，通知页面收起遮罩。
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
  <!-- ui 只补 Skills 标签。会话、模型和 MCP 面板都来自 runtime。 -->
  <TrChat class="webmcp-chat" :runtime="runtime" :ui="ui" @extension-action="onExtensionAction" />
</template>

<style scoped>
/*
 * 套件用 --tr-layout-height 决定内部滚动高度。
 * 嵌在可拖拽侧栏里时，自己和内部根节点都要 min-height: 0，否则被内容撑开，消息区不滚动。
 */
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
