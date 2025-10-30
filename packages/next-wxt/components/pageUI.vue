<script lang="ts" setup>
import { onMessage } from 'webext-bridge/content-script'
import AiSvg from '@/assets/logo-next-no-bg-left.svg'
import TinyPopover from '@opentiny/vue-popover'

/** 插件状态：  ready, run */
const status = defineModel('status', { type: String, default: 'ready' })
/** 要显示的消息 */
const message = defineModel('message', { type: String, default: '' })

onMessage('page-app-message', ({ sender, data }) => {
  status.value = data.status
  message.value = data.message

  nextTick(() => {
    const el = document.querySelector('.wxt-pop__message')
    el?.classList.toggle('bounce', status.value === 'run')
  })
})
</script>

<template>
  <tiny-popover
    trigger="manual"
    :content="message"
    :modelValue="status !== 'ready'"
    effect="dark"
    placement="top"
    popper-class="wxt-pop__message"
  >
    <template #reference>
      <AiSvg></AiSvg>
    </template>
  </tiny-popover>
</template>

<style>
[data-wxt-integrated] {
  position: fixed;
  right: 80px;
  bottom: 40px;
}

[data-wxt-integrated] svg {
  width: 48px;
  height: 48px;
}

.wxt-pop__message {
  display: inline-block;
  width: 200px;
}

.bounce {
  animation-name: ani-bounce;
  animation-duration: 1s;
  animation-iteration-count: infinite;
  transform-origin: center bottom;
}

@keyframes ani-bounce {
  0%,
  20%,
  53%,
  to {
    -webkit-animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  40%,
  43% {
    -webkit-animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    -webkit-transform: translate3d(0, -30px, 0) scaleY(1.1);
    transform: translate3d(0, -30px, 0) scaleY(1.1);
  }

  70% {
    -webkit-animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
    -webkit-transform: translate3d(0, -15px, 0) scaleY(1.05);
    transform: translate3d(0, -15px, 0) scaleY(1.05);
  }

  80% {
    -webkit-transform: translateZ(0) scaleY(0.95);
    transform: translateZ(0) scaleY(0.95);
    -webkit-transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  90% {
    -webkit-transform: translate3d(0, -4px, 0) scaleY(1.02);
    transform: translate3d(0, -4px, 0) scaleY(1.02);
  }
}
</style>
