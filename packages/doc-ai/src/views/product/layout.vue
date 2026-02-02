<template>
  <div class="product-layout">
    <!-- 左侧：TinyVue TreeMenu 菜单 -->
    <aside class="layout-aside">
      <tiny-tree-menu
        ref="treeMenuRef"
        :data="menuData"
        node-key="id"
        :default-expanded-keys="['product']"
        placeholder="搜索菜单"
        @node-click="handleNodeClick"
      />
    </aside>
    <!-- 右侧：子路由内容 -->
    <main class="layout-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const treeMenuRef = ref<{ setCurrentKey: (key: string) => void } | null>(null)

// 商品管理菜单数据：id、label、path 用于路由跳转
const menuData = ref([
  {
    id: 'product',
    label: '商品管理',
    children: [
      { id: 'list', label: '商品列表', path: '/product/list' },
      { id: 'category', label: '按分类管理', path: '/product/category' },
      { id: 'status', label: '按状态管理', path: '/product/status' },
      { id: 'inventory', label: '库存分析', path: '/product/inventory' }
    ]
  }
])

// 根据 route.path 反查节点 id，用于高亮
const pathToNodeId: Record<string, string> = {
  '/product/list': 'list',
  '/product/category': 'category',
  '/product/status': 'status',
  '/product/inventory': 'inventory'
}

function syncCurrentKey() {
  const id = pathToNodeId[route.path]
  if (id && treeMenuRef.value?.setCurrentKey) {
    treeMenuRef.value.setCurrentKey(id)
  }
}

function handleNodeClick(nodeData: { path?: string }) {
  if (nodeData.path && route.path !== nodeData.path) {
    router.push(nodeData.path)
  }
}

onMounted(() => {
  syncCurrentKey()
})

watch(
  () => route.path,
  () => {
    syncCurrentKey()
  }
)
</script>

<style scoped lang="less">
.product-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.layout-aside {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--ti-base-color-border, #e8e8e8);
  background: #fafafa;
}

.layout-main {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
