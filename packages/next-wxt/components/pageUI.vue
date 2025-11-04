<script lang="ts" setup>
import { onMessage } from 'webext-bridge/content-script'
import AiSvg from '@/assets/logo-next-no-bg-left.svg'

/** 插件状态：  ready, run */
const status = defineModel('status', { type: String, default: 'ready' })
/** 要显示的消息, 目前传入的就是toolName */
const message = defineModel('message', { type: String, default: '' })

window.addEventListener('message', function (event) {
  if (event.data.type === 'page-app-message') {
    status.value = event.data.status
    message.value = event.data.message
    nextTick(() => {
      const el = document.querySelector('[data-wxt-integrated]')
      el?.classList.toggle('wxt-ingt-active', status.value === 'run')
    })
  }
})
</script>

<template>
  <AiSvg class="wxt-ingt-svg"></AiSvg>
  <div class="wxt-ingt-breath"></div>
  <div class="wxt-ingt-message">
    <span class="wxt-message__text">正在调用</span> <span class="wxt-message__toolname"> {{ message }} 工具名abcd</span>
  </div>
</template>

<style>
[data-wxt-integrated] .wxt-ingt-svg {
  position: fixed;
  right: 80px;
  bottom: 40px;
  width: 48px;
  height: 48px;
}

[data-wxt-integrated] .wxt-ingt-breath {
  position: fixed;
  top: 85px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  pointer-events: none;
  display: none;
}

[data-wxt-integrated].wxt-ingt-active .wxt-ingt-breath {
  display: block;
  /* box-shadow: inset 0 0 40px 10px rgba(1, 70, 116, 0.3); */
  animation: breathing-inset 0.8s infinite;
}

[data-wxt-integrated] .wxt-ingt-message {
  position: fixed;
  top: 100px;
  left: 32px;
  z-index: 99999;
  pointer-events: none;

  background: #f3f8ff;
  border: 1px solid #1476ff80;
  border-radius: 99px;
  padding: 16px 28px;
  font-size: 14px;
  line-height: 20px;
  display: none;
}

[data-wxt-integrated] .wxt-message__text {
  color: #808080;
  font-weight: 400;
  margin-right: 8px;
}
[data-wxt-integrated] .wxt-message__toolname {
  color: #1476ff;
  font-weight: 500;
}

[data-wxt-integrated].wxt-ingt-active .wxt-ingt-message {
  display: inline;
}

/* 呼吸灯动画关键帧，控制内部阴影和透明度变化 */
@keyframes breathing-inset {
  0% {
    box-shadow: inset 0 0 0 0 rgba(0, 153, 255, 0.3);
    opacity: 0.7;
  }
  50% {
    box-shadow: inset 0 0 15px 15px rgba(0, 153, 255, 0.7);
    opacity: 1;
  }
  100% {
    box-shadow: inset 0 0 0 0 rgba(0, 153, 255, 0.3);
    opacity: 0.7;
  }
}
</style>
