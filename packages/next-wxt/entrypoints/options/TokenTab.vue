<script setup lang="ts">
/**
 * Token 生成页面
 * 通过账号密码获取 token，并存入本地缓存
 */
import { ref, onMounted } from 'vue'
import { storage } from '@wxt-dev/storage'
import { TOKEN_STORAGE_KEY, getStoredToken } from '../sidepanel/utils/token-storage'

/** Token 接口地址，可通过环境变量 VITE_TOKEN_API_URL 配置 */
const TOKEN_API_URL = (import.meta as any).env?.VITE_TOKEN_API_URL || ''

// 表单数据
const account = ref('')
const password = ref('')

// 加载状态与提示
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | ''>('')

// 当前已存储的 token（脱敏显示）
const storedTokenPreview = ref('')

// 加载已存储的 token 预览（复用 token-storage 统一读取）
async function loadStoredToken() {
  const token = await getStoredToken()
  if (token && token.length > 8) {
    storedTokenPreview.value = `${token.slice(0, 8)}****${token.slice(-4)}`
  } else {
    storedTokenPreview.value = ''
  }
}

// 显示提示信息
function showMsg(text: string, type: 'success' | 'error') {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
    messageType.value = ''
  }, 3000)
}

// 提交获取 token
async function handleSubmit() {
  const acc = account.value.trim()
  const pwd = password.value

  if (!acc) {
    showMsg('请输入账号', 'error')
    return
  }
  if (!pwd) {
    showMsg('请输入密码', 'error')
    return
  }

  loading.value = true
  message.value = ''
  messageType.value = ''

  try {
    const res = await fetch(TOKEN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MyCustomApp/1.0' },
      body: JSON.stringify({ account: acc, password: pwd })
    })

    const data = await res.json().catch(() => ({}))
    const token =
      data?.token ?? data?.access_token ?? data?.accessToken ?? data?.data?.token ?? data?.data?.access_token

    if (token && typeof token === 'string') {
      await storage.setItem(TOKEN_STORAGE_KEY, token)
      await loadStoredToken()
      account.value = ''
      password.value = ''
      showMsg('Token 获取成功，已保存到本地缓存', 'success')
      notifyReload()
    } else {
      showMsg(data?.message || data?.error || `请求失败: ${res.status}`, 'error')
    }
  } catch (e: any) {
    showMsg(e?.message || '网络请求失败', 'error')
  } finally {
    loading.value = false
  }
}

// 通知 sidepanel 刷新
function notifyReload() {
  try {
    browser.runtime.sendMessage({ type: 'reload-sidepanel' })
  } catch {
    // 忽略
  }
}

onMounted(() => {
  loadStoredToken()
})
</script>

<template>
  <div class="token-tab">
    <p class="token-desc">输入账号和密码获取 Token，获取成功后会自动保存到本地缓存，供 AI 对话使用。</p>

    <div class="token-form">
      <div class="form-item">
        <label class="form-item-label">账号</label>
        <TinyInput v-model="account" placeholder="请输入账号" clearable />
      </div>
      <div class="form-item">
        <label class="form-item-label">密码</label>
        <TinyInput v-model="password" type="password" placeholder="请输入密码" :show-password="true" clearable />
      </div>
      <div class="form-actions">
        <TinyButton type="primary" :loading="loading" @click="handleSubmit">生成 Token</TinyButton>
      </div>
    </div>

    <div v-if="message" :class="['token-message', messageType]">
      {{ message }}
    </div>

    <div v-if="storedTokenPreview" class="token-preview">
      <span class="token-preview-label">当前已缓存 Token：</span>
      <code>{{ storedTokenPreview }}</code>
    </div>
  </div>
</template>

<style scoped>
.token-tab {
  padding: 0 4px;
}

.token-desc {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.token-form {
  max-width: 400px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.form-actions {
  margin-top: 24px;
}

.token-message {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
}

.token-message.success {
  background: #f0f9ff;
  color: #0c63e4;
  border: 1px solid #b3d8ff;
}

.token-message.error {
  background: #fef0f0;
  color: #c45656;
  border: 1px solid #fbc4c4;
}

.token-preview {
  margin-top: 24px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 13px;
}

.token-preview-label {
  color: #909399;
  margin-right: 8px;
}

.token-preview code {
  font-family: 'Consolas', 'Monaco', monospace;
  color: #606266;
}
</style>
