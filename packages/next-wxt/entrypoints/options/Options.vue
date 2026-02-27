<script setup lang="ts">
/**
 * Options 配置页：Skills 管理 + Token 生成
 * 使用 TinyVue Tabs 分标签展示，风格与 TinyVue 保持一致
 */
import { ref } from 'vue'
import SkillsTab from './SkillsTab.vue'
import TokenTab from './TokenTab.vue'

// 当前激活的标签
const activeTab = ref('skills')
</script>

<template>
  <div class="options-container">
    <div class="card">
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
      </TinyTabs>
    </div>
  </div>
</template>

<style scoped>
.options-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.options-tabs {
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .options-container {
    padding: 16px;
  }

  .card {
    padding: 20px;
  }

  .header h2 {
    font-size: 20px;
  }
}
</style>
