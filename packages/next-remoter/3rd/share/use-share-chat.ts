import { ref, reactive } from 'vue'

export function useShareChat() {
  const state = reactive({
    historyShow: false,
    conversations: [],
    currConversationId: '',

    messages: [],

    inputValue: '',

    xxx: 'placeholder'
  })

  const api = {
    createConversation() {},
    switchConversation(id: string) {},
    deleteConversation(id: string) {},
    showHistory() {},

    clickPrompt(label: string) {
      state.inputValue = label
    },

    onSubmit() {},

    xxx: 1
  }

  return {
    state,
    api
  }
}
