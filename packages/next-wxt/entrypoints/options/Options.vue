<script setup lang="ts">
/**
 * Options 配置页：Skills / 页面 MCP 脚本 / Recorder 自动化 / Token / 模型配置
 * 使用 TinyVue Tabs 分标签展示，风格与 TinyVue 保持一致
 */
import { ref } from 'vue'
import SkillsTab from './SkillsTab.vue'
import TokenTab from './TokenTab.vue'
import ModelConfigTab from './ModelConfigTab.vue'
import UserMcpScriptsTab from './UserMcpScriptsTab.vue'
import RecorderWebmcpTab from './RecorderWebmcpTab.vue'

// 当前激活的标签
const activeTab = ref('skills')

// 判断是否为内部模式
const isInnerMode = import.meta.env.VITE_MODEL_CONFIG === 'inner'
</script>

<template>
  <div class="options-container">
    <div class="header">
      <h2>OpenTiny AI Extension 配置</h2>
    </div>

    <TinyTabs
      v-model="activeTab"
      class="options-tabs"
      :class="{
        'tabs-mcp-scripts': activeTab === 'user-mcp-scripts' || activeTab === 'recorder-webmcp'
      }"
    >
      <TinyTabItem name="skills" title="Skills 管理">
        <SkillsTab />
      </TinyTabItem>
      <TinyTabItem name="user-mcp-scripts" title="页面 MCP 脚本">
        <UserMcpScriptsTab />
      </TinyTabItem>
      <TinyTabItem name="recorder-webmcp" title="Recorder 自动化">
        <RecorderWebmcpTab />
      </TinyTabItem>
      <TinyTabItem v-if="isInnerMode" name="token" title="Token 生成">
        <TokenTab />
      </TinyTabItem>
      <TinyTabItem name="model" title="模型及接口配置">
        <ModelConfigTab />
      </TinyTabItem>
    </TinyTabs>
  </div>
</template>

<style scoped>
.options-container {
  min-height: 100vh;
  background: #ffffff;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
}

.options-tabs {
  margin-top: 16px;
}

/* 仅页面 MCP 脚本 Tab 需要更高编辑区 */
.tabs-mcp-scripts :deep(.tiny-tabs__content) {
  overflow: visible;
}

@media (max-width: 768px) {
  .options-container {
    padding: 16px;
  }

  .header h2 {
    font-size: 20px;
  }
}
</style>
