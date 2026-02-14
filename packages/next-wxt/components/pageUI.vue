<script lang="ts" setup>
import AiSvgReady from '@/assets/logo-next.svg'
import AiSvgRun from '@/assets/logo-next-eye-open.svg'
import { onRuntimeMessage, sendRuntimeMessage } from '@/utils/messages'

/** 当前标签页 ID，由父组件传入 */
const props = defineProps<{
  tabId: number
}>()

/** 插件状态：  ready, run */
const status = defineModel('status', { type: String, default: 'ready' })
/** 要显示的消息, 目前传入的就是toolName */
const message = defineModel('message', { type: String, default: '' })

// 国际化文本常量
const CALLING_TEXT = '正在调用'

// 悬浮按钮默认隐藏，仅在调用工具时（status 变为 run）显示
const visible = ref(false)
const isDragging = ref(false)
const position = reactive({ x: window.innerWidth - 100, y: window.innerHeight - 100 })
let startX = 0
let startY = 0
let initialX = 0
let initialY = 0

// 确保浮窗位置在可视区域内
const clampPosition = () => {
  const maxX = window.innerWidth - 48
  const maxY = window.innerHeight - 48
  position.x = Math.max(0, Math.min(position.x, maxX))
  position.y = Math.max(0, Math.min(position.y, maxY))
}

// 初始化位置时进行边界检查
clampPosition()

// 处理动画状态更新的通用函数
const updateAnimationStatus = (data: { status: string; message: string }) => {
  if (data.status === 'run') {
    sendRuntimeMessage('focus-current-tab', data, 'content->bg')
    visible.value = true // Ensure visible when running
  }

  status.value = data.status
  message.value = data.message
  nextTick(() => {
    const el = document.querySelector('[data-wxt-integrated]')
    el?.classList.toggle('wxt-ingt-active', status.value === 'run')
  })
}

// 监听来自 sidepanel 的 runtime message（工具调用动画）
onRuntimeMessage(
  'update-page-app-message',
  (data) => {
    // 只处理当前标签页的消息
    if (data.tabId === props.tabId) {
      updateAnimationStatus({ status: data.status, message: data.message })
    }
  },
  'side->content',
  props.tabId
)

// 监听来自页面的 window message（保持向后兼容）
onWindowMessage(
  'update-page-app-message',
  (data) => {
    updateAnimationStatus(data)
  },
  'page->content'
)

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  startX = e.clientX
  startY = e.clientY
  initialX = position.x
  initialY = position.y

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  const newX = initialX + dx
  const newY = initialY + dy
  // 限制浮窗在屏幕范围内,至少保留48px可见
  position.x = Math.max(0, Math.min(newX, window.innerWidth - 48))
  position.y = Math.max(0, Math.min(newY, window.innerHeight - 48))
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

const handleClose = () => {
  visible.value = false
}

// 监听窗口大小变化,确保浮窗保持在可视区域内
onMounted(() => {
  window.addEventListener('resize', clampPosition)
})

// 组件卸载时清理事件监听器,防止内存泄漏
onUnmounted(() => {
  window.removeEventListener('resize', clampPosition)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="wxt-ingt-breath"></div>

  <div
    v-show="visible"
    class="wxt-ui-container"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
    @mousedown="handleMouseDown"
  >
    <div class="wxt-icon-wrapper">
      <AiSvgReady class="wxt-ingt-svg" v-if="status === 'ready'"></AiSvgReady>
      <AiSvgRun class="wxt-ingt-svg" v-else></AiSvgRun>
      <div class="wxt-close-btn" @click.stop="handleClose" title="关闭悬浮窗">✕</div>
    </div>

    <div class="wxt-ingt-message">
      <img src="@/assets/loading.webp" class="wxt-message__loading" />
      <span class="wxt-message__text">{{ CALLING_TEXT }}</span>
      <span class="wxt-message__toolname"> {{ message }} </span>
    </div>
  </div>
</template>

<style>
[data-wxt-integrated] .wxt-ui-container {
  position: fixed;
  z-index: 99999;
  user-select: none;
  cursor: move;
  /* Ensure drag keeps elements together */
  display: flex;
  flex-direction: column;
  align-items: center;
}

[data-wxt-integrated] .wxt-icon-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  /* So close button is relative to this */
}

[data-wxt-integrated] .wxt-ingt-svg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white; /* Ensure visibility */
  pointer-events: none; /* Let clicks pass to container or handle explicitly */
}

/* Close button style */
[data-wxt-integrated] .wxt-close-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  background: #f5222d;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: auto; /* Enable click */
}

[data-wxt-integrated] .wxt-ui-container:hover .wxt-close-btn {
  opacity: 1;
}

[data-wxt-integrated] .wxt-ingt-breath {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99998;
  pointer-events: none;
  display: none;
}

[data-wxt-integrated].wxt-ingt-active .wxt-ingt-breath {
  display: block;
  animation: breathing-inset 1.3s infinite;
}

/* Message Bubble */
[data-wxt-integrated] .wxt-ingt-message {
  display: none; /* Hidden by default */
  gap: 8px;

  /* Position relative to the container/icon */
  position: absolute;
  right: 60px; /* To the left of the icon */
  top: 50%;
  transform: translateY(-50%);

  white-space: nowrap;
  background: #f3f8ff;
  border: 1px solid #1476ff80;
  border-radius: 99px;
  padding: 10px 20px;
  font-size: 14px;
  line-height: 20px;
  pointer-events: none;
}

/** 设置小三角 */
[data-wxt-integrated] .wxt-ingt-message::after {
  position: absolute;
  transform: translate(0, -50%) rotate(-90deg); /* Point right */
  display: block;
  width: 10px;
  height: 10px;
  z-index: 1;
  content: ' ';

  border: 1px solid #1476ff80;
  background-color: #f3f8ff;
  border-radius: 2px;
  border-bottom: none;
  border-left: none;

  top: 50%;
  right: -6px; /* Position at the right edge of bubble */
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}

[data-wxt-integrated] .wxt-message__loading {
  width: 14px;
  height: 14px;
}
[data-wxt-integrated] .wxt-message__text {
  color: #808080;
  font-weight: 400;
}
[data-wxt-integrated] .wxt-message__toolname {
  color: #1476ff;
  font-weight: 500;
}

/* Show message when active */
[data-wxt-integrated].wxt-ingt-active .wxt-ingt-message {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 呼吸灯动画关键帧，控制内部阴影和透明度变化 */
@keyframes breathing-inset {
  0% {
    box-shadow: inset 0 0 0 0 rgba(4, 55, 128, 0.74);
    opacity: 0.7;
  }
  50% {
    box-shadow: inset 0 0 10px 20px rgba(20, 118, 255, 0.3);
    opacity: 1;
  }
  100% {
    box-shadow: inset 0 0 0 0 rgba(4, 55, 128, 0.74);
    opacity: 0.7;
  }
}
</style>
