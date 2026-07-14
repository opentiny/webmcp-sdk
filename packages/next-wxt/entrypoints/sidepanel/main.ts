import { createApp } from 'vue'
import App from './App.vue'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

initializeBuiltinWebMCP()
createApp(App).mount('#app')
