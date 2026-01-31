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
import { provide, onMounted } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { WebMcpServer } from '@opentiny/next-sdk'
import { useTransport } from './composable/useTransport'
import { useProductMcp } from './composable/useProductMcp'
import type { Product } from './skills/product-management'
// 商品管理 Demo 初始数据（用于验证 Web-Skill + Web-MCP）
import productsData from './views/comprehensive/products.json'

const { serverTransport } = useTransport()
const server = new WebMcpServer({ name: 'doc-ai-server', version: '1.0.0' })

// 初始化 Web-Skills + Web-MCP：注册商品管理 Skill、read_memory_doc/read_cdn_doc/list_skills 及商品 CRUD 工具
const productMcp = useProductMcp(server)
// 供商品管理页使用：同一 server（含 Skill + 工具）与同一 productMcp
provide('webMcpServer', server)
provide('productMcp', productMcp)

onMounted(async () => {
  await server.connect(serverTransport)
  await productMcp.initialize()
  // 将 JSON 中的 id 转为 string，符合 Product 类型
  const normalized = (productsData as Array<Record<string, unknown>>).map((p) => ({
    ...p,
    id: String(p.id)
  })) as Product[]
  productMcp.loadProducts(normalized)
})
</script>

<style scoped></style>
