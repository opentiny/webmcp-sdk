<script lang="ts" setup>
import { ref, type Ref, shallowReactive, computed } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './useBrowserExtensions'
import { EXCALIDRAW_PROMPT, OFFICE_PROMPT } from '@/utils/prompt'
import { useWebAgentServer } from './useWebAgentServer'
import TinyUser from '@opentiny/vue-user'
import { useCustomMarketMcpServers } from './useCustomMarketMcpServers'
import { TrSuggestionPillButton, TrDropdownMenu } from '@opentiny/tiny-robot'
import { AGENT_ROOT, ROBOT_URL } from './const'
import { useGenerateCode } from './useGenerateCode'

const llmConfig = {
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_BASE_URL,
  providerType: import.meta.env.VITE_LLM_PROVIDER_TYPE,
  model: import.meta.env.VITE_LLM_MODEL,
  maxSteps: 15,
  providerOptions: {
    deepseek: {
      'prompt': {
        strategy: 'append',
        'id': '5ed1b9071c15d1ed59b5827ea5dcabd4',
        'params': {
          customComponents: [
            {
              name: '选择用户组件',
              description: '选择用户组件，用于选择用户，支持模糊搜索',
              component: 'TinyUser',
              schema: {
                properties: [
                  {
                    property: 'modelValue',
                    label: '用户绑定工号',
                    required: true,
                    description: '用户的工号，双向绑定值',
                    type: 'string'
                  },
                  {
                    property: 'valueField',
                    label: '值字段',
                    required: true,
                    description: '用户工号值的绑定字段',
                    type: 'string'
                  }
                ]
              }
            }
          ],
          customExamples: [
            {
              name: '选择用户示例',
              schema: {
                componentName: 'Page',
                state: {
                  reviewer: ''
                },
                children: [
                  {
                    componentName: 'h3',
                    props: {},
                    children: '输入用户名搜索工号并选择用户'
                  },
                  {
                    componentName: 'TinyUser',
                    props: {
                      modelValue: {
                        type: 'JSExpression',
                        model: true,
                        value: 'this.state.reviewer'
                      },
                      valueField: 'uid'
                    }
                  },
                  {
                    componentName: 'TinyButton',
                    props: {
                      text: '提交'
                    }
                  }
                ]
              }
            }
          ]
        }
      } as any
    }
  }
}

const remoterRef = ref() as Ref<InstanceType<typeof TinyRemoter>>
useBrowserExtensions(remoterRef)

// 通过 Web Agent 服务获取实时 sessionId（中文注释：供短码/URL 使用）
const sessionId = ref('')

useWebAgentServer()
  .then((id) => {
    sessionId.value = id
  })
  .catch((error) => {
    console.error('useWebAgentServer 初始化失败', error)
    sessionId.value = ''
  })

const genUiComponents = shallowReactive({ TinyUser })
// 汇总自定义 MCP Server 配置（中文注释：用于传给 TinyRemoter 的插件市场）
const customMarketMcpServers = useCustomMarketMcpServers()
const { isRecording, toggleRecording } = useGenerateCode()

// pillItems 依赖 sessionId 动态生成识别码与分享链接
const pillItems = computed(() => {
  const fallbackText = '会话尚未建立'
  const shortCode = sessionId.value ? sessionId.value.slice(-6) : fallbackText
  const shareUrl = sessionId.value ? `${ROBOT_URL}?sessionId=${sessionId.value}` : fallbackText
  const connectType = import.meta.env.VITE_WEB_AGENT_CONNECT_TYPE
  const agentRoot = connectType === 'sse' ? AGENT_ROOT + 'sse' : AGENT_ROOT + 'mcp'

  return [
    {
      id: 'copy-session-id',
      text: '复制会话信息',
      menus: [
        {
          id: 'copy-session-id-sort-code',
          text: `识别码：${shortCode}`
        },
        {
          id: 'copy-session-id-mcp-url',
          text: `Agent连接地址：${agentRoot}/?sessionId=${sessionId.value}`
        },
        {
          id: 'copy-session-id-url',
          text: `遥控器地址：${shareUrl}`
        }
      ]
    }
  ]
})

// 处理药丸按钮菜单项点击事件，复制文本到剪贴板（中文注释：点击识别码或URL时自动复制到剪贴板，只复制冒号后面的内容）
async function handlePillItemClick(item: any) {
  if (!item?.text) {
    console.warn('handlePillItemClick: item.text 不存在')
    return
  }

  // 提取冒号后面的字符串（中文注释：如果文本包含冒号，只复制冒号后面的部分；否则复制整个文本）
  const textToCopy = item.text.includes('：')
    ? item.text.split('：')[1]?.trim() || item.text
    : item.text.includes(':')
      ? item.text.split(':')[1]?.trim() || item.text
      : item.text

  try {
    // 使用 Clipboard API 复制文本到剪贴板
    await navigator.clipboard.writeText(textToCopy)
    showToast('已复制到剪贴板')
  } catch (error) {
    showToast('复制到剪贴板失败')
  }
}
</script>

<template>
  <div class="sidepanel-wrapper">
    <TinyRemoter
      ref="remoterRef"
      mode="chat-dialog"
      :browserExtensions="useBrowserExtensions"
      show
      fullscreen
      title=""
      :llmConfig="llmConfig"
      :systemPrompt="`${OFFICE_PROMPT}${EXCALIDRAW_PROMPT}`"
      inBrowserExt
      gen-ui-able
      :custom-market-mcp-servers="customMarketMcpServers"
      :gen-ui-components="genUiComponents"
    >
      <template #suggestions>
        <button class="record-button" type="button" @click="toggleRecording">
          {{ isRecording ? '停止录制' : '开始录制' }}
        </button>
        <div class="chat-input-pills">
          <tr-dropdown-menu
            v-for="pill in pillItems"
            :key="pill.id"
            :items="pill.menus"
            @item-click="handlePillItemClick"
            trigger="click"
          >
            <template #trigger>
              <TrSuggestionPillButton>{{ pill.text }}</TrSuggestionPillButton>
            </template>
          </tr-dropdown-menu>
        </div>
      </template>
    </TinyRemoter>
  </div>
</template>

<style>
.tr-dropdown-menu__list-item {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style scoped>
:deep(.tr-container__header-operations) {
  .tr-icon-button {
    display: none;
  }

  .tr-icon-button:first-child,
  .tr-icon-button:nth-child(2) {
    display: flex;
  }
}

:deep(.tr-bubble__content-items) {
  p {
    font-size: 16px;
  }

  li {
    font-size: 14px;
    color: #555;
  }

  .tr-bubble__text {
    font-size: 16px;
  }
}

.chat-input-pills {
  margin-bottom: 8px;
  display: flex;
  gap: 16px;
}

.sidepanel-wrapper {
  position: relative;
}

.record-button {
  position: absolute;
  top: 12px;
  left: 24px;
  z-index: 5;
  padding: 6px 16px;
  border-radius: 16px;
  border: none;
  background: #f53f3f;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.record-button:hover {
  opacity: 0.9;
}

.record-button:active {
  transform: scale(0.98);
}
</style>
