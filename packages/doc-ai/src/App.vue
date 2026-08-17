<template>
  <div class="app-container">
    <!-- Left App Content — 宽度动态computed -->
    <div class="app-left" :style="{ width: show ? `calc(100% - ${rightWidth}px)` : '100%' }">
      <header class="app-header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <circle cx="14" cy="9" r="3" fill="white" opacity="0.95" />
              <circle cx="8" cy="19" r="2.2" fill="white" opacity="0.9" />
              <circle cx="20" cy="19" r="2.2" fill="white" opacity="0.9" />
              <line x1="14" y1="12" x2="9" y2="17" stroke="white" stroke-width="1.4" opacity="0.7" />
              <line x1="14" y1="12" x2="19" y2="17" stroke="white" stroke-width="1.4" opacity="0.7" />
            </svg>
          </div>
          <h1>电商智能管理系统</h1>
        </div>
        <div class="header-actions">
          <span class="user-greeting">欢迎，管理员</span>
          <div class="avatar">管</div>
        </div>
      </header>

      <div class="app-body">
        <!-- Sidebar Navigation -->
        <aside class="app-sidebar">
          <nav class="nav-menu">
            <router-link to="/" class="nav-item" active-class="active">
              <component :is="IconDesktopView" class="icon" />
              概览大盘
            </router-link>
            <router-link to="/inventory" class="nav-item" active-class="active">
              <component :is="IconBoxSolid" class="icon" />
              库存管理
            </router-link>
            <router-link to="/price-protection" class="nav-item" active-class="active">
              <component :is="IconLock" class="icon" />
              价保监控
            </router-link>
            <router-link to="/orders" class="nav-item" active-class="active">
              <component :is="IconShoppingCard" class="icon" />
              订单管理
            </router-link>
            <router-link to="/sales" class="nav-item" active-class="active">
              <component :is="IconLineChart" class="icon" />
              商品销售记录
            </router-link>
            <router-link to="/finance" class="nav-item" active-class="active">
              <component :is="IconCoin" class="icon" />
              财务管理
            </router-link>
          </nav>

          <div class="sidebar-footer">
            <div class="sys-status">
              <div class="status-dot"></div>
              <span>系统运行正常</span>
            </div>
          </div>
        </aside>

        <!-- Main Content Area with Router View -->
        <main class="app-main">
          <div class="router-wrapper">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </main>
      </div>
    </div>

    <!-- 拖拽分隔条 — 仅 AI 面板显示时出现 -->
    <div v-show="show" class="app-divider" @mousedown="startDrag">
      <div class="divider-handle"></div>
    </div>

    <!-- Right AI Assistant — 宽度由 rightWidth 控制 -->
    <div v-show="show" class="app-right" :style="{ width: rightWidth + 'px' }">
      <tiny-remoter
        class="remoter-pane"
        :skills="skillMdModules"
        v-model:show="show"
        :mcpServers="mcpServers"
        layoutMode="relative"
        :menuItems="menuItems"
        :systemPrompt="systemPrompt"
        :promptItems="ecommercePromptItems"
        :pillItems="ecommercePillItems"
        @chat-stream-finish="onChatStreamFinish"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import type { McpServerConfig } from '@opentiny/next-sdk'
import { onMounted, ref, h } from 'vue'
import { createMcpServer, useWebAgentServer } from './mcp-servers'
import { iconDesktopView, iconBoxSolid, iconLock, iconLineChart, iconCoin, iconShoppingCard } from '@opentiny/vue-icon'
import { AGENT_ROOT } from './const'

// 电商管理平台：欢迎区建议卡片（上方大卡片）
const ecommercePromptItems = [
  {
    label: '订单与物流',
    description: '需要查订单状态、物流信息，还是根据客户姓名找订单？',
    icon: h('span', { style: { fontSize: '18px' } }, '📦'),
    badge: 'NEW'
  },
  {
    label: '价保与售后',
    description: '要创建价保申请、补差价，还是查看价保单审核状态？',
    icon: h('span', { style: { fontSize: '18px' } }, '🛡️')
  },
  {
    label: '库存与销售',
    description: '需要商品入库、查销售趋势，还是看财务对账？',
    icon: h('span', { style: { fontSize: '18px' } }, '📊')
  }
]

// 电商管理平台：输入框上方快捷操作按钮（小药丸按钮 + 下拉菜单）
const ecommercePillItems = [
  {
    id: 'orders',
    text: '订单物流',
    menus: [
      { id: 0, text: '查订单状态', inputMessage: '帮我查一下订单 ORD-5X9A2B 的当前状态和物流信息。' },
      { id: 1, text: '按客户查单', inputMessage: '请根据客户姓名「张三」查询他的订单列表。' }
    ]
  },
  {
    id: 'price-protection',
    text: '价保售后',
    menus: [
      {
        id: 0,
        text: '创建价保',
        inputMessage: '帮我给用户王五创建一个价保申请单，金额 1000 元，原因为百亿补贴。'
      },
      { id: 1, text: '查价保单', inputMessage: '帮我查看当前待审核的价保申请列表。' }
    ]
  },
  {
    id: 'inventory-sales',
    text: '库存与销售',
    menus: [
      { id: 0, text: '商品入库', inputMessage: '请把 200 台 MacBook Pro 入库到上海二号仓。' },
      { id: 1, text: '销售趋势', inputMessage: '帮我看看最近 30 天的商品销售趋势。' },
      { id: 2, text: '财务对账', inputMessage: '打开财务管理看板，看一下本月支出和可用余额。' }
    ]
  }
]

const show = ref(true)
const systemPrompt = `你是「电商智能管理系统」的内置助理，必须严格遵守以下工具调用规则：

1）这是一个采用 WebMCP 架构的项目：
- 工具是随页面路由「动态加载和卸载」的。这意味着如果你在当前工具列表中没有看到某个功能（例如库存管理工具 add_inventory），说明你当前可能不在对应的页面。
- 当你需要调用某个功能但发现对应工具缺失时，你应该先使用 navigate_to_page 工具跳转到对应的路由（例如：库存 -> /inventory，订单 -> /orders，价保 -> /price-protection，财务 -> /finance），跳转成功后，对应的工具会自动出现在你的工具列表中。

2）技能文档优先：
- 在调用任何业务工具（如下单、价保、库存等）之前，必须先调用 get_skill_content 工具读取对应 skill 技能文档。
- 只有在「确认已经阅读并理解技能文档」之后，才允许继续调用后续业务工具。

3）只调用已提供的工具，禁止“猜名字”：
- 你只能从当前上下文中「明确列出的 MCP 工具列表」中选择工具名称，必须一字不差地使用列表里的名称。
- 绝对禁止凭空发明或猜测新的工具名。
- 如果在跳转到对应路由后仍找不到该工具，请告知用户该功能可能尚未实现。

4）处理“工具不存在”错误的方式：
- 如果工具调用返回「工具不存在」等类似错误，且你已确认路径正确，请向用户清晰说明情况，并建议由开发者维护。

请始终记住：你是一个具备「导航意识」的 AI 助理，通过页面跳转来获取环境所需的 MCP 工具能力。`

const IconDesktopView = iconDesktopView()
const IconBoxSolid = iconBoxSolid()
const IconLock = iconLock()
const IconLineChart = iconLineChart()
const IconCoin = iconCoin()
const IconShoppingCard = iconShoppingCard()

// ── 拖拽调整宽度 ──────────────────────────────────────────────
const STORAGE_KEY = 'ai-panel-width'
const DEFAULT_WIDTH = 380
const MIN_WIDTH = 240
const MAX_WIDTH = 720

// 从 localStorage 恢复上一次宽度，否则使用默认值
const savedWidth = parseInt(localStorage.getItem(STORAGE_KEY) ?? '', 10)
const rightWidth = ref(isNaN(savedWidth) ? DEFAULT_WIDTH : savedWidth)

const startDrag = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = rightWidth.value

  const onMove = (ev: MouseEvent) => {
    // 向左拖 → 右侧变宽；向右拖 → 右侧变窄
    const delta = startX - ev.clientX
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
    rightWidth.value = newWidth
  }

  const onUp = () => {
    localStorage.setItem(STORAGE_KEY, String(rightWidth.value))
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
// ─────────────────────────────────────────────────────────────

const skillMdModules = import.meta.glob('./skills/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: false
}) as Record<string, string | (() => Promise<string>)>

// Setup MCP Servers
const doc = document as Document & { modelContext?: object }
const mcpServers: Record<string, McpServerConfig> = {
  'mcp-server-builtin-webmcp': {
    type: 'builtin' as const,
    client: doc.modelContext,
    name: '浏览器内置工具',
    description: '通过 document.modelContext 暴露的浏览器原生 MCP 工具'
  }
}

const menuItems = ref<any[]>([])

const onChatStreamFinish = () => {
  window.dispatchEvent(new CustomEvent('page-agent-chat-end'))
}

onMounted(async () => {
  // 本地 MCP Server 启动：失败则直接抛出（核心功能）
  await createMcpServer()

  // 远程 WebAgent 初始化：失败时只打印警告，不影响本地功能
  try {
    const result = await useWebAgentServer()
    if (result?.sessionId) {
      const remoteUrl = `${AGENT_ROOT}/mcp?sessionId=${result.sessionId}`
      menuItems.value = [
        {
          action: 'remote-url',
          text: '遥控器链接',
          desc: remoteUrl,
          tip: remoteUrl,
          active: true,
          showCopyIcon: true
        },
        {
          action: 'remote-control',
          text: '识别码',
          desc: result.sessionId.slice(-6),
          know: true,
          showCopyIcon: true
        }
      ]
    }
  } catch (err) {
    console.warn('[WebAgent] 远程遥控初始化失败，本地功能不受影响：', err)
  }
})
</script>

<style scoped>
/* App Layout Container */
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  background-color: #f7f8fc;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}

/* Left part — 宽度由 inline style 动态控制 */
.app-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  transition: width 0.15s ease;
}

/* 拖拽分隔条 */
.app-divider {
  width: 5px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
}
.app-divider:hover .divider-handle,
.app-divider:active .divider-handle {
  background: #6366f1;
  opacity: 1;
}
.divider-handle {
  width: 3px;
  height: 40px;
  border-radius: 2px;
  background: #c7d2fe;
  opacity: 0.6;
  transition: all 0.18s;
}

/* Right part — 宽度由 inline style 动态控制 */
.app-right {
  flex-shrink: 0;
  height: 100%;
  border-left: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.02);
  z-index: 10;
  min-width: 0;
}

.remoter-pane {
  height: 100%;
  width: 100%;
  border-radius: 0;
  box-shadow: none;
}

/* Premium Header */
.app-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #eef0f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 5;
  box-shadow: 0 1px 0 rgba(99, 102, 241, 0.06);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
  border-radius: 9px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo h1 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: #1e1b4b;
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-greeting {
  font-size: 0.88rem;
  color: #6b7280;
  font-weight: 500;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* App Body with Sidebar and Main Content */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Premium Sidebar */
.app-sidebar {
  width: 220px;
  background: linear-gradient(180deg, #fafaff 0%, #f5f5ff 100%);
  border-right: 1px solid #ede9fe;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 12px;
  z-index: 4;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #6b7280;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.14) 0%, rgba(59, 130, 246, 0.06) 100%);
  color: #4f46e5;
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12%;
  height: 76%;
  width: 3px;
  background: linear-gradient(180deg, #6366f1, #3b82f6);
  border-radius: 0 3px 3px 0;
}

.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.nav-item:hover .icon,
.nav-item.active .icon {
  opacity: 1;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: 16px;
  background: #f7f8fc;
  border-radius: 12px;
  margin-top: auto;
}

.sys-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #86909c;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #00b42a;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(0, 180, 42, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 180, 42, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(0, 180, 42, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 180, 42, 0);
  }
}

/* Main Content Area */
.app-main {
  flex: 1;
  background: #f7f8fc;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.router-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100%;
}

/* Route Transitions */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
