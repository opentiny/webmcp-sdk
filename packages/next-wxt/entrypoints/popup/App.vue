<script lang="ts" setup>
import { ref, computed } from 'vue'
import QrCodeDialog from '@/entrypoints/sidepanel/components/QrCodeDialog.vue'
import { AGENT_ROOT, ROBOT_URL } from '@/entrypoints/sidepanel/const'
import { StorageKeys } from '@/entrypoints/sidepanel/utils/storage-keys'
import { showToast as vantToast } from 'vant' // actually unplugin-auto-import usually exposes showToast globally, we don't necessarily need to import it if it's auto imported, but explicit import is safer. Let's use standard API. Oh wait, user used `import { showToast } from 'vant'` in sidepanel! I will do the same:
import { storage } from '@wxt-dev/storage'
import { WEB_AGENT_URL_KEY, CONNECT_TYPE_KEY } from '@/entrypoints/sidepanel/model-manage/model-storage'

// 通过向 Background 询问获取 sessionId 与连接状态
const sessionId = ref('')
const connectionStatus = ref('connecting')
browser.runtime
  .sendMessage({ type: 'get-mcp-session-id' })
  .then((res) => {
    if (res) {
      if (res.sessionId) sessionId.value = res.sessionId
      if (res.status) connectionStatus.value = res.status
    }
  })
  .catch((error) => {
    console.error('获取 sessionId 失败', error)
    connectionStatus.value = 'error'
  })

const sessionChangesHandler = (changes: any) => {
  if (changes[StorageKeys.MCP_SESSION_ID]) {
    sessionId.value = (changes[StorageKeys.MCP_SESSION_ID].newValue as string) || ''
  }
  if (changes[StorageKeys.MCP_STATUS]) {
    connectionStatus.value = (changes[StorageKeys.MCP_STATUS].newValue as string) || 'connecting'
  }
}

// 监听 storage 变化以保持最新
browser.storage.local.onChanged.addListener(sessionChangesHandler)

const isInnerMode = import.meta.env.VITE_MODEL_CONFIG === 'inner' || String(import.meta.env.MODE).includes('inner')

const connectType = ref(import.meta.env.VITE_WEB_AGENT_CONNECT_TYPE || 'sse')
storage.getItem<string>(CONNECT_TYPE_KEY).then((val) => {
  if (val) connectType.value = val
})

const customAgentRoot = ref('')
storage.getItem<any>(WEB_AGENT_URL_KEY).then((url) => {
  if (typeof url === 'string') {
    customAgentRoot.value = url
  }
})
storage.watch<any>(WEB_AGENT_URL_KEY, (newVal) => {
  if (typeof newVal === 'string') {
    customAgentRoot.value = newVal
  } else if (newVal === null) {
    customAgentRoot.value = ''
  }
})

const sessionIdStr = computed(() => (typeof sessionId.value === 'string' ? sessionId.value : ''))
const shortCode = computed(() => (sessionIdStr.value ? sessionIdStr.value.slice(-6) : '-'))
const shareUrl = computed(() => (sessionIdStr.value ? `${ROBOT_URL}?sessionId=${sessionIdStr.value}` : '-'))
const agentRoot = computed(() => {
  let root = AGENT_ROOT
  if (customAgentRoot.value && customAgentRoot.value.trim() !== '') {
    try {
      const customUrl = new URL(customAgentRoot.value)
      // 如果用户输入了完整路径（不只是域名），以用户的为准
      if (customUrl.pathname && customUrl.pathname.length > 1) {
        root = customAgentRoot.value.trim()
        if (!root.endsWith('/')) {
          root += '/'
        }
      } else {
        root = root.replace(/^https?:\/\/[^\/]+/, customUrl.origin)
      }
    } catch {
      // 忽略无效的 URL
    }
  }
  return connectType.value === 'sse' ? root + 'sse' : root + 'mcp'
})
const agentUrl = computed(() => (sessionIdStr.value ? `${agentRoot.value}/?sessionId=${sessionIdStr.value}` : '-'))

const isQrCodeDialogVisible = ref(false)

const openQrCodeDialog = () => {
  if (sessionIdStr.value) {
    isQrCodeDialogVisible.value = true
  } else {
    vantToast('会话尚未建立，无法生成二维码')
  }
}

const copyToClipboard = async (text: string) => {
  if (!text || text === '-') {
    vantToast('暂无有效内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    vantToast('已复制到剪贴板')
  } catch (err) {
    vantToast('复制失败')
  }
}

const openSidePanel = async () => {
  // 获取当前窗口然后打开其 SidePanel
  const windowInfo = await browser.windows.getCurrent()
  if (windowInfo && windowInfo.id) {
    if ((browser.sidePanel as any).setOptions) {
      browser.sidePanel.setOptions({ tabId: undefined, path: 'sidepanel.html', enabled: true })
      if ((browser.sidePanel as any).open) {
        ;(browser.sidePanel as any).open({ windowId: windowInfo.id })
      }
    }
  }
}
</script>

<template>
  <div class="popup-container">
    <div class="header">
      <h2>Web Agent 会话信息</h2>
    </div>

    <!-- 连接状态提示 -->
    <div v-if="connectionStatus === 'error'" class="status-alert error">
      连接 Web Agent 失败，请检查服务地址或网络。
    </div>
    <div v-else-if="connectionStatus === 'connecting'" class="status-alert warning">正在连接 Web Agent...</div>

    <div class="info-section">
      <div v-if="!isInnerMode && connectionStatus === 'connected'" class="info-item">
        <span class="label">识别码</span>
        <div class="value-group">
          <span class="value">{{ shortCode }}</span>
          <button class="action-btn" @click="copyToClipboard(shortCode)">复制</button>
        </div>
      </div>

      <div class="info-item">
        <span class="label">Agent 连接端点</span>
        <div class="value-group">
          <span class="value truncate" :title="agentUrl">{{ agentUrl }}</span>
          <button class="action-btn" @click="copyToClipboard(agentUrl)">复制</button>
        </div>
      </div>

      <div class="info-item">
        <span class="label">连接类型</span>
        <div class="type-selector">
          <label class="radio-label">
            <input type="radio" value="sse" v-model="connectType" disabled />
            <span>SSE</span>
          </label>
          <label class="radio-label">
            <input type="radio" value="stream" v-model="connectType" disabled />
            <span>Stream (MCP)</span>
          </label>
        </div>
      </div>

      <div v-if="!isInnerMode && connectionStatus === 'connected'" class="info-item">
        <span class="label">遥控器地址</span>
        <div class="value-group">
          <span class="value truncate" :title="shareUrl">{{ shareUrl }}</span>
          <button class="action-btn" @click="copyToClipboard(shareUrl)">复制</button>
        </div>
      </div>
    </div>

    <div class="actions">
      <button v-if="!isInnerMode" class="primary-btn" @click="openQrCodeDialog" :disabled="!sessionIdStr">
        展示遥控器二维码
      </button>
      <button class="secondary-btn" @click="openSidePanel">打开控制面板</button>
    </div>

    <QrCodeDialog
      v-if="!isInnerMode"
      :visible="isQrCodeDialogVisible"
      :url="shareUrl"
      title="遥控器地址二维码"
      @close="isQrCodeDialogVisible = false"
    />
  </div>
</template>

<style scoped>
.popup-container {
  width: 320px;
  padding: 20px;
  font-family: inherit;
  background: #ffffff;
}

.header h2 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  display: flex;
  align-items: center;
  gap: 8px;
}
.header h2::before {
  content: '';
  display: block;
  width: 4px;
  height: 16px;
  background-color: #2b5bd9;
  border-radius: 2px;
}
.status-alert {
  margin-bottom: 16px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
}
.status-alert.error {
  background: #fff0f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}
.status-alert.warning {
  background: #f0f5ff;
  color: #2b5bd9;
  border: 1px solid #d6e4ff;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}
.value-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f7f8fa;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}
.value-group:hover {
  border-color: #e5e6eb;
}
.value {
  font-size: 13px;
  color: #333;
  line-height: 1.4;
}
.truncate {
  max-width: 210px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.type-selector {
  display: flex;
  gap: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 12px;
}
.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}
.radio-label input {
  margin: 0;
}
.action-btn {
  background: transparent;
  border: none;
  color: #2b5bd9;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.action-btn:hover {
  background: rgba(43, 91, 217, 0.08);
}
.actions {
  display: flex;
  gap: 12px;
}
button {
  flex: 1;
  padding: 10px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.primary-btn {
  background-color: #2b5bd9;
  color: #fff;
  box-shadow: 0 4px 10px rgba(43, 91, 217, 0.2);
}
.primary-btn:hover:not(:disabled) {
  background-color: #1e46b3;
  box-shadow: 0 6px 14px rgba(43, 91, 217, 0.3);
}
.primary-btn:disabled {
  background-color: #c0cff5;
  box-shadow: none;
  cursor: not-allowed;
}
.secondary-btn {
  background-color: #f2f5fc;
  color: #2b5bd9;
}
.secondary-btn:hover {
  background-color: #e0e8f8;
}
</style>
