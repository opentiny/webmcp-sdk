<template>
  <div class="app-container">
    <!-- 主体内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
    <!-- 用户层传入 skillMdModules，由 remoter 内部调用 next-sdk 的 skill 能力处理 -->
    <tiny-remoter :skills="skillMdModules" :show="show" :menuItems="menuItems"> </tiny-remoter>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import { ref } from 'vue'
import { skillMdModules } from './skills'
const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)
</script>

<style scoped></style>
