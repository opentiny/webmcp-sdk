<script lang="ts" setup>
import AiSvgReady from '@/assets/logo-next.svg'
import AiSvgRun from '@/assets/logo-next-eye-open.svg'

/** 插件状态：  ready, run */
const status = defineModel('status', { type: String, default: 'ready' })
/** 要显示的消息, 目前传入的就是toolName */
const message = defineModel('message', { type: String, default: '' })

onWindowMessage(
  'update-page-app-message',
  (data) => {
    if (data.status === 'run') {
      sendRuntimeMessage('focus-current-tab', data, 'content->bg')
    }

    status.value = data.status
    message.value = data.message
    nextTick(() => {
      const el = document.querySelector('[data-wxt-integrated]')
      el?.classList.toggle('wxt-ingt-active', status.value === 'run')
    })
  },
  'page->content'
)
</script>

<template>
  <AiSvgReady class="wxt-ingt-svg" v-if="status === 'ready'"></AiSvgReady>
  <AiSvgRun class="wxt-ingt-svg" v-else></AiSvgRun>
  <div class="wxt-ingt-breath"></div>
  <div class="wxt-ingt-message">
    <img src="@/assets/loading.webp" class="wxt-message__loading" />
    <span class="wxt-message__text">正在调用</span>
    <span class="wxt-message__toolname"> {{ message }} </span>
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
  top: 0;
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
  animation: breathing-inset 1.3s infinite;
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

[data-wxt-integrated].wxt-ingt-active .wxt-ingt-message {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* 呼吸灯动画关键帧，控制内部阴影和透明度变化 */
@keyframes breathing-inset {
  0% {
    box-shadow: inset 0 0 0 0 #1476ff80;
    opacity: 0.7;
  }
  50% {
    box-shadow: inset 0 0 10px 20px #1476ff30;
    opacity: 1;
  }
  100% {
    box-shadow: inset 0 0 0 0 #1476ff80;
    opacity: 0.7;
  }
}
</style>
