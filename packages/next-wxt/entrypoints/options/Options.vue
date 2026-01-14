<script setup lang="ts">
import { ref } from 'vue'
import { TinyTabs, TinyTabItem } from '@opentiny/vue'
import ExpertConfig from './components/ExpertConfig.vue'
import McpToolManager from './components/McpToolManager.vue'

// 当前激活的标签页
const activeTab = ref('expert')
</script>

<template>
  <div class="options-container">
    <div class="card">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>AI Extensions 配置中心</h1>
        <p class="subtitle">管理提示词专家和动态 MCP 工具</p>
      </div>

      <!-- 标签页导航 -->
      <tiny-tabs v-model="activeTab" class="custom-tabs">
        <tiny-tab-item name="expert" title="提示词专家">
          <expert-config />
        </tiny-tab-item>
        <tiny-tab-item name="mcp-tools" title="动态工具">
          <mcp-tool-manager />
        </tiny-tab-item>
      </tiny-tabs>
    </div>
  </div>
</template>

<style scoped>
/* 外层容器 - 渐变背景 */
.options-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 卡片容器 */
.card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  min-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
}

/* 页面标题 */
.page-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #6c757d;
}

/* 自定义 Tabs 样式 */
.custom-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 覆盖 OpenTiny Tabs 默认样式 */
.custom-tabs :deep(.tiny-tabs__header) {
  margin-bottom: 24px;
  border-bottom: 2px solid #e9ecef;
}

.custom-tabs :deep(.tiny-tabs__nav-wrap) {
  padding: 0;
}

.custom-tabs :deep(.tiny-tabs__item) {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  color: #6c757d;
  transition: all 0.2s ease;
}

.custom-tabs :deep(.tiny-tabs__item:hover) {
  color: #667eea;
}

.custom-tabs :deep(.tiny-tabs__item.is-active) {
  color: #667eea;
  font-weight: 600;
}

.custom-tabs :deep(.tiny-tabs__active-bar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  height: 3px;
}

.custom-tabs :deep(.tiny-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .options-container {
    padding: 16px;
  }

  .card {
    padding: 20px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .custom-tabs :deep(.tiny-tabs__item) {
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
