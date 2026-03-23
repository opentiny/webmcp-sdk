<script setup lang="ts">
/**
 * Options 配置页：Skills 管理 + Token 生成
 * 使用 TinyVue Tabs 分标签展示，风格与 TinyVue 保持一致
 */
import { ref } from 'vue'
import SkillsTab from './SkillsTab.vue'
import TokenTab from './TokenTab.vue'
import ModelConfigTab from './ModelConfigTab.vue'

// 当前激活的标签
const activeTab = ref('skills')
</script>

<template>
  <div class="options-container">
    <div class="header">
      <h2>OpenTiny AI Extension 配置</h2>
    </div>

    <TinyTabs v-model="activeTab" class="options-tabs">
      <TinyTabItem name="skills" title="Skills 管理">
        <SkillsTab />
      </TinyTabItem>
      <TinyTabItem name="token" title="Token 生成">
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

@media (max-width: 768px) {
  .options-container {
    padding: 16px;
  }

  .header h2 {
    font-size: 20px;
  }
}
</style>
