<template>
  <div class="bubble-image-wrapper">
    <img
      :src="content"
      class="bubble-image"
      alt="用户上传的图片"
      @click="handleImageClick"
    />
    
    <!-- 自定义图片预览模态框 -->
    <Teleport to="body">
      <div v-if="showPreview" class="image-preview-modal" @click="closePreview">
        <div class="preview-close" @click="closePreview">
          <svg viewBox="0 0 1024 1024" width="24" height="24">
            <path d="M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 0 0 203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z" fill="currentColor"/>
          </svg>
        </div>
        <div class="preview-content" @click.stop>
          <img :src="content" alt="预览图片" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * 气泡图片渲染器组件
 * 用于在聊天气泡中渲染用户上传的图片
 * 设计参考主流聊天应用（微信、ChatGPT）的样式
 */

// 定义组件的 props
defineProps<{
  content: string // 图片的 base64 数据或 URL
}>()

// 控制预览显示状态
const showPreview = ref(false)

/**
 * 处理图片点击事件 - 显示预览
 */
const handleImageClick = () => {
  showPreview.value = true
}

/**
 * 关闭预览
 */
const closePreview = () => {
  showPreview.value = false
}
</script>

<style scoped lang="less">
.bubble-image-wrapper {
  display: inline-block;
  max-width: 100%;
  margin: 4px 0;

  // 当图片不是第一个元素时，增加上边距
  &:not(:first-child) {
    margin-top: 8px;
  }

  // 当图片不是最后一个元素时，增加下边距
  &:not(:last-child) {
    margin-bottom: 8px;
  }
}

.bubble-image {
  max-width: 280px;
  max-height: 280px;
  width: auto;
  height: auto;
  display: block;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  object-fit: cover;

  // 悬停效果：阴影加深，轻微放大
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: scale(1.02);
  }

  // 图片加载失败时的占位样式
  &:not([src]),
  &[src=''] {
    background: #f5f5f5;
    min-width: 100px;
    min-height: 100px;
  }
}

// 图片预览模态框样式
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// 关闭按钮
.preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
  z-index: 10000;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
}

// 预览内容容器
.preview-content {
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    max-width: 100%;
    max-height: 90vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
}
</style>
