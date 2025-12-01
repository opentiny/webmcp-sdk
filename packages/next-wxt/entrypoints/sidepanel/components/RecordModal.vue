<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  isRecording: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'start-recording'): void
  (e: 'stop-recording'): void
}>()

const primaryText = computed(() => (props.isRecording ? '停止录制' : '开始录制'))
const panelClass = computed(() =>
  props.isRecording
    ? 'record-modal__panel record-modal__panel--recording'
    : 'record-modal__panel record-modal__panel--idle'
)

const statusLabel = computed(() => (props.isRecording ? '录制中' : '准备录制'))

const handlePrimaryClick = () => {
  if (props.isRecording) {
    emit('stop-recording')
    return
  }
  emit('start-recording')
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <teleport to="body">
    <transition name="record-modal-fade">
      <div v-if="visible" class="record-modal__mask">
        <div :class="panelClass">
          <header class="record-modal__header">
            <div class="record-modal__title-group">
              <h3>录制 MCP 工具</h3>
              <span class="record-modal__subtitle">快速生成请求复刻工具</span>
            </div>
            <div class="record-modal__status-chip">
              <span class="record-modal__status-dot" />
              {{ statusLabel }}
            </div>
            <button class="record-modal__close" type="button" @click="handleClose">×</button>
          </header>
          <section class="record-modal__content">
            <div class="record-modal__subheader">为什么需要录制 MCP 工具？</div>
            <ul class="record-modal__features">
              <li class="record-modal__feature">
                <span class="record-modal__feature-icon">①</span>
                <div>
                  <div class="record-modal__feature-title">自动生成代码</div>
                  <p>拦截真实 POST 请求后可立即生成工具逻辑，摆脱繁琐的手写流程。</p>
                </div>
              </li>
              <li class="record-modal__feature">
                <span class="record-modal__feature-icon">②</span>
                <div>
                  <div class="record-modal__feature-title">零成本复用</div>
                  <p>直接复用请求头、请求体与响应解析策略，调试阶段即可交付可用工具。</p>
                </div>
              </li>
              <li class="record-modal__feature">
                <span class="record-modal__feature-icon">③</span>
                <div>
                  <div class="record-modal__feature-title">快速回归</div>
                  <p>同一场景可随时回放录制内容，帮助团队高效回归和扩展能力。</p>
                </div>
              </li>
            </ul>
            <div class="record-modal__callout">
              <span class="record-modal__callout-dot" />
              <div>
                <strong>录制小贴士：</strong>
                点击“开始录制”后，请在目标页面完成一次完整提交流程，我们会实时捕捉请求并生成工具代码。
              </div>
            </div>
          </section>
          <footer class="record-modal__footer">
            <button class="record-modal__secondary" type="button" @click="handleClose">取消</button>
            <button class="record-modal__primary" type="button" @click="handlePrimaryClick">{{ primaryText }}</button>
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.record-modal__mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.record-modal__panel {
  width: min(480px, calc(100vw - 32px));
  border-radius: 24px;
  border: 1px solid rgba(99, 102, 241, 0.08);
  box-shadow:
    0 20px 60px rgba(15, 23, 42, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  padding: 28px;
  color: #1d2a3b;
  font-size: 14px;
  line-height: 1.6;
}

.record-modal__panel--idle {
  background: linear-gradient(180deg, #fdfefe 0%, #f6f8ff 100%);
}

.record-modal__panel--recording {
  background: linear-gradient(180deg, #fff6f6 0%, #ffeceb 100%);
  border-color: rgba(244, 114, 182, 0.4);
  box-shadow:
    0 25px 70px rgba(244, 114, 182, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.record-modal__title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 16px;
}

.record-modal__header h3 {
  font-size: 20px;
  margin: 0;
  color: #0f172a;
}

.record-modal__close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #edf0f7;
  color: #334155;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.record-modal__close:hover {
  background: #e0e6f0;
}

.record-modal__subtitle {
  font-size: 12px;
  color: #9ca3af;
  letter-spacing: 0.5px;
}

.record-modal__status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
  font-size: 12px;
  font-weight: 600;
}

.record-modal__panel--recording .record-modal__status-chip {
  background: rgba(248, 113, 113, 0.15);
  color: #b91c1c;
}

.record-modal__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

.record-modal__subheader {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 12px;
  letter-spacing: 0.2px;
}

.record-modal__content {
  margin-top: 12px;
  padding: 16px 0 24px;
}

.record-modal__features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-modal__feature {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.record-modal__feature-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.5px;
  box-shadow: 0 3px 10px rgba(79, 70, 229, 0.15);
}

.record-modal__feature-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.record-modal__feature p {
  margin: 0;
  color: #475569;
}

.record-modal__callout {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #eef4ff;
  border: 1px solid rgba(59, 130, 246, 0.18);
  color: #1d2a3b;
  font-size: 13px;
  line-height: 1.5;
}

.record-modal__callout-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  margin-top: 6px;
}

.record-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.record-modal__secondary {
  border: none;
  background: #e8edf7;
  color: #475569;
  padding: 8px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.record-modal__secondary:hover {
  background: #d9e1f2;
}

.record-modal__primary {
  border: none;
  background: linear-gradient(135deg, #4f8cff, #7ba9ff);
  color: #fff;
  padding: 8px 22px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 10px 20px rgba(79, 140, 255, 0.35);
}

.record-modal__primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(79, 140, 255, 0.45);
}

.record-modal-fade-enter-active,
.record-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.record-modal-fade-enter-from,
.record-modal-fade-leave-to {
  opacity: 0;
}
</style>
