import { ref, reactive } from 'vue'

export function useShareChat() {
  const state = reactive({
    historyShow: false,
    conversations: [],
    currConversationId: '',

    messages: [],

    xxx: 'placeholder'
  })

  const api = {
    createConversation() {},
    switchConversation(id: string) {},
    deleteConversation(id: string) {},
    showHistory() {}
  }

  return {
    state,
    api
  }
}
