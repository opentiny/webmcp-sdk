<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { storage } from '@wxt-dev/storage'

// 存储键名
const STORAGE_KEY = 'local:ai-extension-configs'

// 配置项类型定义
interface ConfigItem {
  name: string
  label: string
  prompts: string
  description?: string
  requireDomains?: string[]
  tools?: string[]
}

// 响应式数据
const configs = ref<ConfigItem[]>([])
const dialogVisible = ref(false)
const editingIndex = ref<number | null>(null)
const dialogRef = ref<HTMLDialogElement | null>(null)

// 表单数据
const formData = ref({
  name: '',
  label: '',
  prompts: '',
  description: '',
  domainsInput: '',
  toolsInput: ''
})

// 加载配置列表
async function loadConfigs() {
  try {
    const data = (await storage.getMeta(STORAGE_KEY)) || { list: [] }
    configs.value = data.list || []
  } catch (e) {
    configs.value = []
  }
}

// 保存配置列表
async function saveConfigs() {
  await storage.setMeta(STORAGE_KEY, { list: configs.value })
  chrome.runtime.sendMessage({ type: 'reload-sidepanel' })
}

// 打开添加对话框
function openAdd() {
  editingIndex.value = null
  formData.value = {
    name: '',
    label: '',
    prompts: '',
    description: '',
    domainsInput: '',
    toolsInput: ''
  }
  dialogVisible.value = true
}

// 打开编辑对话框
function openEdit(idx: number) {
  const c = configs.value[idx]
  editingIndex.value = idx
  formData.value = {
    name: c.name || '',
    label: c.label || '',
    prompts: c.prompts || '',
    description: c.description || '',
    domainsInput: Array.isArray(c.requireDomains) ? c.requireDomains.join(',') : '',
    toolsInput: Array.isArray(c.tools) ? c.tools.join(',') : ''
  }
  dialogVisible.value = true
}

// 关闭对话框
function hideForm() {
  if (dialogRef.value) {
    try {
      dialogRef.value.close()
    } catch (e) {
      dialogRef.value?.removeAttribute('open')
    }
  }
  dialogVisible.value = false
  editingIndex.value = null
}

// 监听对话框显示状态，控制原生 dialog 元素
watch(dialogVisible, async (visible) => {
  await nextTick()
  if (dialogRef.value) {
    if (visible) {
      try {
        dialogRef.value.showModal()
      } catch (e) {
        dialogRef.value.setAttribute('open', '')
      }
    } else {
      try {
        dialogRef.value.close()
      } catch (e) {
        dialogRef.value.removeAttribute('open')
      }
    }
  }
})

// 处理对话框关闭事件（包括点击 backdrop 关闭）
function handleDialogClose() {
  dialogVisible.value = false
  editingIndex.value = null
}

// 删除配置
function handleDelete(idx: number) {
  configs.value.splice(idx, 1)
  saveConfigs()
}

// 提交表单
function handleSubmit() {
  const name = formData.value.name.trim()
  const label = formData.value.label.trim()
  const prompts = formData.value.prompts
  const description = formData.value.description.trim()

  // 表单验证
  if (!/^[A-Za-z]+$/.test(name)) {
    alert('Name 必须只包含英文字母且非空')
    return
  }
  if (!label) {
    alert('Label 不能为空')
    return
  }

  // 解析逗号分隔的域名为数组
  const raw = formData.value.domainsInput || ''
  const requireDomains = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s)

  // 解析逗号分隔的工具为数组
  const tools = (formData.value.toolsInput || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s)

  const config: ConfigItem = { name, label, prompts, description, requireDomains, tools }

  if (editingIndex.value === null) {
    configs.value.push(config)
  } else {
    configs.value[editingIndex.value] = config
  }

  saveConfigs()
  hideForm()
}

// 格式化域名显示
function formatDomains(domains?: string[]) {
  return Array.isArray(domains) && domains.length > 0 ? domains.join(', ') : '未配置域名'
}

// 初始化
onMounted(async () => {
  await loadConfigs()
})
</script>

<template>
  <div class="options-container">
    <div class="card">
      <div class="header">
        <h2>AI Extensions 提示词专家配置</h2>
        <button class="btn btn-primary" type="button" @click="openAdd">添加配置</button>
      </div>

      <div class="table-wrapper">
        <table class="config-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Label</th>
              <th>Description</th>
              <th>Domains</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="configs.length === 0">
              <td colspan="5" class="empty-state">暂无配置，点击"添加配置"开始创建</td>
            </tr>
            <tr v-for="(config, idx) in configs" :key="idx" class="table-row">
              <td>{{ config.name }}</td>
              <td>{{ config.label }}</td>
              <td>{{ config.description || '' }}</td>
              <td>{{ formatDomains(config.requireDomains) }}</td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" @click="openEdit(idx)">编辑</button>
                <button class="btn btn-ghost btn-sm btn-danger" @click="handleDelete(idx)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 对话框 -->
    <dialog ref="dialogRef" class="dialog" @close="handleDialogClose">
      <div class="dialog-content" @click.stop>
        <h3>编辑配置</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">专家ID</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              pattern="[A-Za-z]+"
              required
              placeholder="例如: myExtension"
            />
          </div>

          <div class="form-group">
            <label for="label">专家名称</label>
            <input
              id="label"
              v-model="formData.label"
              type="text"
              required
              placeholder="例如: 绘图专家，办公助手"
            />
          </div>

          <div class="form-group">
            <label for="description">描述</label>
            <input
              id="description"
              v-model="formData.description"
              type="text"
              placeholder="简短描述"
            />
          </div>

          <div class="form-group">
            <label for="prompts">提示词</label>
            <textarea
              id="prompts"
              v-model="formData.prompts"
              required
              rows="3"
              placeholder="专家提示词..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="domainsInput">关联域名（可选，英文逗号分隔）</label>
            <input
              id="domainsInput"
              v-model="formData.domainsInput"
              type="text"
              placeholder="请输入域名 a.com, b.org"
            />
          </div>

          <div class="form-group">
            <label for="toolsInput">关联工具（可选，英文逗号分隔）</label>
            <input
              id="toolsInput"
              v-model="formData.toolsInput"
              type="text"
              placeholder="请输入工程名称"
            />
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" type="submit">保存</button>
            <button class="btn btn-ghost" type="button" @click="hideForm">取消</button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.options-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.table-wrapper {
  margin-top: 24px;
  overflow-x: auto;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.config-table thead {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.config-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
  border-bottom: 2px solid #dee2e6;
}

.config-table td {
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
  font-size: 14px;
}

.table-row {
  transition: all 0.2s ease;
}

.table-row:hover {
  background-color: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.empty-state {
  text-align: center;
  padding: 48px !important;
  color: #6c757d;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.btn-ghost {
  background: #fff;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-ghost:hover {
  background: #f8f9ff;
  transform: translateY(-1px);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.btn-danger {
  color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover {
  background: #fff5f5;
  color: #c82333;
  border-color: #c82333;
}

.dialog {
  border: none;
  /* 给dialog添加右侧padding，补偿滚动条空间，确保内容区域视觉对称 */
  padding: 0 16px 0 0;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  background: #fff;
  width: 90%;
  max-width: 600px;
  /* 确保对话框在视口内，留出上下各 20px 的边距 */
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  /* 使用固定定位和 transform 居中，确保对话框在视口中心 */
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 确保对话框不会超出视口边界 */
  margin: 0;
  /* 自定义滚动条样式，确保视觉对称 */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
  box-sizing: border-box;
}

.dialog::-webkit-scrollbar {
  width: 8px;
}

.dialog::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 4px;
}

.dialog::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.dialog::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.dialog:not([open]) {
  display: none;
}

.dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.dialog-content {
  /* 统一的内边距，左侧32px，右侧也保持32px（dialog本身已有右侧padding补偿滚动条） */
  padding: 32px;
  box-sizing: border-box;
}

.dialog-content h3 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.form-group input[type='text'],
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-group input[type='text']:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e9ecef;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .options-container {
    padding: 16px;
  }

  .card {
    padding: 20px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header h2 {
    font-size: 20px;
  }

  .table-wrapper {
    overflow-x: scroll;
  }

  .config-table {
    min-width: 600px;
  }

  .dialog {
    width: 95%;
  }

  .dialog-content {
    padding: 24px;
  }
}
</style>

