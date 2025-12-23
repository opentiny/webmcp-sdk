<template>
  <div class="app-container"></div>
</template>

<script setup lang="ts">
import { WebMcpServer, ExtensionPageServerTransport, z } from '@opentiny/next-sdk'
import { onMounted } from 'vue'

const serverInfo = {
  name: 'demo-server',
  version: '1.0.0'
}
// Create an MCP server
const server = new WebMcpServer(serverInfo)

server.registerTool(
  'generate-color-extension',
  {
    title: '生成页面背景颜色',
    description: '根据用户的心情或者情绪生成页面的背景颜色,要求：传入的color参数格式为十六进制颜色值,比如 #000000',
    inputSchema: { color: z.string() }
  },
  async ({ color }) => {
    document.body.style.backgroundColor = color
    return {
      content: [{ type: 'text', text: String(color) }]
    }
  }
)

const sessionId = localStorage.getItem('mcp-sessionId-extension')

// Create pair MCP transports

onMounted(() => {
  setTimeout(async () => {
    const serverTransport = new ExtensionPageServerTransport(sessionId)
    localStorage.setItem('mcp-sessionId', serverTransport.sessionId)

    console.log(serverTransport.sessionId)
    // Connect the client and server
    await server.connect(serverTransport)
    serverTransport.notifyRegistration(serverInfo)
  }, 1000)
})
</script>

<style scoped></style>
