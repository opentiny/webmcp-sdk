import { ref, reactive } from 'vue'
import { useNextAgent } from '../../src/composable/useNextAgent'

export function useShareChat() {
  const { agent, chatStream, status, messages, stop } = useNextAgent({
    ui: 'matechat',
    llmConfig: { apiKey: 'sk-trial', baseURL: 'https://agent.opentiny.design/api/v1/ai', providerType: 'deepseek' },
    agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
    sessionId: '45653e8b-8ba6-4cc5-b037-039faa65c3c1',
    systemPrompt: '你是一个AI助手，会调用工具完成任务',
    model: 'deepseek-ai/DeepSeek-V3'
  })
  const inputValue = ref('')

  const api = {
    createConversation() {
      messages.value = []
      agent.messages = []
    },

    clickPrompt(label: string) {
      inputValue.value = label
    },

    onSubmit() {
      if (inputValue.value) {
        chatStream(inputValue.value)
      }
    },
    onStop: stop
  }

  return {
    status,
    messages,
    inputValue,
    api
  }
}
