<template>
  <div>
    <tr-icon-button :icon="TinyIconScan" size="28" svgSize="20" @click="handleScan()" />
    <teleport to="body">
      <div v-show="isScanning" class="scan-code">
        <div class="container">
          <div class="qrcode">
            <div id="reader"></div>
          </div>
        </div>
        <div class="btn">
          <div class="left-back"><van-icon name="arrow-left" @click="clickBack" /></div>
        </div>
      </div>
    </teleport>
  </div>
</template>
​
<script setup lang="ts">
import { reactive, onUnmounted, ref } from 'vue'
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode'
import { IconScan } from '@opentiny/vue-icon'
import { TrIconButton } from '@opentiny/tiny-robot'

defineOptions({
  name: 'QrCodeScan'
})

const emit = defineEmits(['scanSuccess'])

const TinyIconScan = IconScan()

// 响应式状态管理
const state = reactive({
  html5QrCode: null as Html5Qrcode | null
})

const isScanning = ref(false)

// 开始扫描二维码
const start = () => {
  if (!state.html5QrCode) {
    showToast('摄像头无访问权限！')
    return
  }

  isScanning.value = true
  state.html5QrCode
    .start(
      { facingMode: 'environment' },
      {
        fps: 30, // 提高帧率到30fps，提升扫描速度
        aspectRatio: 1.0, // 设置宽高比
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], // 只使用摄像头扫描
        showTorchButtonIfSupported: true, // 支持手电筒功能
        showZoomSliderIfSupported: true, // 支持缩放功能
        defaultZoomValueIfSupported: 2, // 默认缩放值
        useBarCodeDetectorIfSupported: true // 使用更快的条码检测器
      },
      (decodedText) => {
        emit('scanSuccess', decodedText)
        showToast('添加工具完成')
        stop()
      }
    )
    .catch((err) => {
      console.log(err)
      showToast({
        message: `二维码识别失败`,
        duration: 3000
      })
    })
}

const handleScan = () => {
  getCameras().then(() => {
    start()
  })
}

const clickBack = () => {
  stop()
}

// 获取摄像头权限并初始化
const getCameras = () => {
  return Html5Qrcode.getCameras()
    .then((devices) => {
      if (devices && devices.length) {
        state.html5QrCode = new Html5Qrcode('reader')
      }
    })
    .catch(() => {
      showToast({
        message: '摄像头无访问权限！',
        duration: 3000
      })
    })
}

// 停止扫描
const stop = () => {
  if (!state.html5QrCode) {
    return
  }
  state.html5QrCode
    .stop()
    .then((ignore) => {
      console.log('停止扫码', ignore)
    })
    .catch((err) => {
      console.log(err)
      showToast('停止扫码失败')
    })
    .finally(() => {
      isScanning.value = false
    })
}

// 组件卸载时停止扫描
onUnmounted(() => {
  // 扫描设备是否在运行
  if (state.html5QrCode && state.html5QrCode.isScanning) {
    stop()
  }
})
</script>

<style lang="less" scoped>
.scan-code {
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0);
}
.container {
  height: 80vh;
  position: relative;
  width: 100%;
}
.qrcode {
  height: 100%;
}
#reader {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}
.btn {
  flex: 1;
  padding: 3vw;
  display: flex;
  justify-content: space-around;
  color: #fff;
  font-size: 8vw;
  align-items: flex-start;
}
</style>
