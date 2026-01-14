<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { storage } from '@wxt-dev/storage'
import type { ExpertConfigItem } from '../types'
import { STORAGE_KEYS } from '../types'

// 响应式数据
const configs = ref<ExpertConfigItem[]>([])
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

/**
 * 将对象转换为数组（处理存储时数组被转换为对象的情况）
 */
function normalizeToArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value
  }
  // 如果是对象，检查是否有数字键，如果有则转换为数组
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    // 检查是否所有键都是数字（类似数组索引）
    const isArrayLike = keys.length > 0 && keys.every((key) => /^\d+$/.test(key))
    if (isArrayLike) {
      // 按数字键排序后转换为数组，确保顺序正确
      const sortedKeys = keys.map(Number).sort((a, b) => a - b)
      return sortedKeys.map((key) => value[String(key)])
    }
  }
  return []
}

/**
 * 加载配置列表
 */
async function loadConfigs() {
  try {
    const data = (await storage.getMeta(STORAGE_KEYS.EXPERT_CONFIGS)) || { list: [] }
    const loadedList = data?.list || []

    // 如果存储的数据是对象格式（键为数字），转换为数组并立即修复存储
    if (!Array.isArray(loadedList) && loadedList && typeof loadedList === 'object') {
      console.warn('检测到存储数据格式异常（对象而非数组），正在修复...')
      // 转换为数组
      const normalized = normalizeToArray(loadedList)
      // 立即修复存储的数据格式，使用 JSON 序列化确保数组格式
      const dataToSave = JSON.parse(JSON.stringify({ list: normalized }))
      await storage.setMeta(STORAGE_KEYS.EXPERT_CONFIGS, dataToSave)
      configs.value = normalized
    } else {
      // 正常情况：确保是数组
      configs.value = Array.isArray(loadedList) ? loadedList : []
    }
  } catch (e) {
    console.error('加载配置失败:', e)
    configs.value = []
  }
}

/**
 * 保存配置列表
 */
async function saveConfigs() {
  // 确保保存的数据是数组格式，并且是真正的数组（不是类数组对象）
  let listToSave: ExpertConfigItem[] = []
  if (Array.isArray(configs.value)) {
    listToSave = [...configs.value] // 创建新数组确保格式正确
  } else {
    // 如果不是数组，尝试转换
    listToSave = normalizeToArray(configs.value)
  }

  // 使用 JSON 序列化/反序列化确保数组格式正确，避免存储时被转换为对象
  const dataToSave = JSON.parse(JSON.stringify({ list: listToSave }))
  await storage.setMeta(STORAGE_KEYS.EXPERT_CONFIGS, dataToSave)

  // 通知 sidepanel 重新加载
  browser.runtime.sendMessage({ type: 'reload-sidepanel' })
}

/**
 * 打开添加对话框
 */
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

/**
 * 打开编辑对话框
 */
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

/**
 * 关闭对话框
 */
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

/**
 * 处理对话框关闭事件（包括点击 backdrop 关闭）
 */
function handleDialogClose() {
  dialogVisible.value = false
  editingIndex.value = null
}

/**
 * 删除配置
 */
function handleDelete(idx: number) {
  configs.value.splice(idx, 1)
  saveConfigs()
}

/**
 * 提交表单
 */
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

  const config: ExpertConfigItem = { name, label, prompts, description, requireDomains, tools }

  // 确保 configs.value 是数组
  if (!Array.isArray(configs.value)) {
    configs.value = []
  }

  if (editingIndex.value === null) {
    configs.value.push(config)
  } else {
    configs.value[editingIndex.value] = config
  }

  saveConfigs()
  hideForm()
}

/**
 * 格式化域名显示
 */
function formatDomains(domains?: string[]) {
  return Array.isArray(domains) && domains.length > 0 ? domains.join(', ') : '未配置域名'
}

// 初始化
onMounted(async () => {
  await loadConfigs()
})
</script>

<template>
  <div class="expert-config-container">
    <div class="header">
      <h2>AI 提示词专家配置</h2>
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

    <!-- 对话框 -->
    <dialog ref="dialogRef" class="dialog" @close="handleDialogClose">
      <div class="dialog-content" @click.stop>
        <h3>{{ editingIndex === null ? '添加' : '编辑' }}配置</h3>
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
            <input id="label" v-model="formData.label" type="text" required placeholder="例如: 绘图专家，办公助手" />
          </div>

          <div class="form-group">
            <label for="description">描述</label>
            <input id="description" v-model="formData.description" type="text" placeholder="简短描述" />
          </div>

          <div class="form-group">
            <label for="prompts">提示词</label>
            <textarea id="prompts" v-model="formData.prompts" required rows="3" placeholder="专家提示词..."></textarea>
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
            <input id="toolsInput" v-model="formData.toolsInput" type="text" placeholder="请输入工具名称" />
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
/* 复用原有样式，去除外层容器样式 */
.expert-config-container {
  height: 100%;
  overflow-y: auto;
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
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
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
  padding: 0 16px 0 0;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  background: #fff;
  width: 90%;
  max-width: 600px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
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
  box-sizing: border-box;
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
</style>
