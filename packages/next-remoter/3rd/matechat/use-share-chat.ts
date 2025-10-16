import { ref, reactive } from 'vue'
import { useNextAgent } from '../../src/composable/useNextAgent'

export function useShareChat() {
  const { agent, chatStream, status, messages, stop } = useNextAgent({
    ui: 'matechat',
    llmConfig: { apiKey: 'sk-trial', baseURL: 'https://agent.opentiny.design/api/v1/ai', providerType: 'deepseek' },
    agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
    sessionId: '',
    systemPrompt: '你是一个AI助手，会调用工具完成任务',
    model: 'deepseek-ai/DeepSeek-V3'
  })

  const inputValue = ref('')

  const api = {
    createConversation() {},

    clickPrompt(label: string) {
      inputValue.value = label
    },

    onSubmit() {
      if (inputValue.value) {
        chatStream(inputValue.value)
      }
    }
  }

  return {
    status,
    messages,
    stop,
    inputValue,
    api
  }
}
