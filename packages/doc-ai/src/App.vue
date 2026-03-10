<template>
  <div class="app-container" ref="containerRef">
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
    <div v-if="show" class="app-divider" @mousedown="startDrag">
      <div class="divider-handle"></div>
    </div>

    <!-- Right AI Assistant — 宽度由 rightWidth 控制 -->
    <div v-if="show" class="app-right" :style="{ width: rightWidth + 'px' }">
      <tiny-remoter
        class="remoter-pane"
        :skills="skillMdModules"
        :show="show"
        :mcpServers="mcpServers"
        layoutMode="relative"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { onMounted, ref } from 'vue'
import { createMcpServer, clientTransport } from './mcp-servers'
import { iconDesktopView, iconBoxSolid, iconLock, iconLineChart, iconCoin, iconShoppingCard } from '@opentiny/vue-icon'

const show = ref(true)

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

const containerRef = ref<HTMLElement | null>(null)

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
  eager: true
}) as Record<string, string>

// Setup MCP Servers
const mcpServers = {
  'ecommerce-mcp-server': {
    type: 'local' as const,
    transport: clientTransport
  }
}

onMounted(async () => {
  await createMcpServer()
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
