<template>
  <div class="app-container">
    <!-- 主体内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
    <tiny-remoter> </tiny-remoter>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { WebMcpServer } from '@opentiny/next-sdk'
import { useTransport } from './composable/useTransport'
const { serverTransport } = useTransport()
const server = new WebMcpServer({ name: 'doc-ai-server', version: '1.0.0' })
server.connect(serverTransport)
</script>

<style scoped></style>
