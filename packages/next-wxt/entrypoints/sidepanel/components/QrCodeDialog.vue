<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue'
import { QrCode } from '@opentiny/next-sdk'

const props = defineProps<{
  visible: boolean
  url: string
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// 当对话框显示且 URL 变化时,生成二维码
watch(
  () => [props.visible, props.url],
  async ([visible, url]) => {
    if (visible && url && typeof url === 'string') {
      // 等待 DOM 更新完成
      await nextTick()

      if (canvasRef.value) {
        try {
          console.log('开始生成二维码，URL:', url)
          const qrCode = new QrCode(url, { size: 200, margin: 2 })
          await qrCode.toCanvas(canvasRef.value)
          console.log('二维码生成成功')
        } catch (error) {
          console.error('生成二维码失败:', error)
        }
      } else {
        console.warn('Canvas 元素未找到')
      }
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('close')
}

// 点击遮罩层关闭
const handleMaskClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="qrcode-dialog-mask" @click="handleMaskClick">
        <div class="qrcode-dialog">
          <!-- 绝对定位的关闭按钮 -->
          <button class="qrcode-dialog__close" @click="handleClose">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <div class="qrcode-dialog__body">
            <div class="qrcode-container">
              <canvas ref="canvasRef"></canvas>
            </div>
            <p class="qrcode-description">请使用手机扫描二维码访问</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.qrcode-dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.qrcode-dialog {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 280px;
  max-width: 90%;
  overflow: hidden;
  position: relative;
}

.qrcode-dialog__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  z-index: 10;
}

.qrcode-dialog__close:hover {
  background: #f0f0f0;
  color: #333;
}

.qrcode-dialog__body {
  padding: 32px 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qrcode-container {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.qrcode-container canvas {
  display: block;
}

.qrcode-description {
  margin: 0;
  font-size: 14px;
  color: #666;
  text-align: center;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .qrcode-dialog,
.fade-leave-active .qrcode-dialog {
  transition: transform 0.3s ease;
}

.fade-enter-from .qrcode-dialog {
  transform: scale(0.9);
}

.fade-leave-to .qrcode-dialog {
  transform: scale(0.9);
}
</style>
