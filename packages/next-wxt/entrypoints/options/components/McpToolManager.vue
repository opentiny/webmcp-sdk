<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { storage } from '@wxt-dev/storage'
import type { DynamicMcpTool } from '../types'
import { STORAGE_KEYS } from '../types'

// 响应式数据
const tools = ref<DynamicMcpTool[]>([])
const dialogVisible = ref(false)
const editingIndex = ref<number | null>(null)
const dialogRef = ref<HTMLDialogElement | null>(null)

// 表单数据
const formData = ref({
  name: '',
  domain: '',
  urlPattern: '',
  code: '',
  enabled: true,
  description: ''
})

// 默认代码模板
const DEFAULT_CODE_TEMPLATE = `// MCP 工具定义示例
// 参数：{ server, z, cookie }
// server.registerTool(name, config, handler)

export default ({ server, z, cookie }) => {
  // 注册工具
  server.registerTool(
    'my_tool_name',
    {
      title: '工具标题',
      description: '工具描述',
      inputSchema: {
        param1: z.string().describe('参数1描述'),
        param2: z.number().optional().describe('参数2描述（可选）')
      }
    },
    async ({ param1, param2 }) => {
      // 工具逻辑
      console.log('执行工具:', param1, param2)
      
      return {
        content: [
          { type: 'text', text: '执行结果' }
        ]
      }
    }
  )
}
`

/**
 * 加载工具列表
 */
async function loadTools() {
  try {
    const data = (await storage.getMeta(STORAGE_KEYS.DYNAMIC_MCP_TOOLS)) || { list: [] }
    tools.value = Array.isArray(data.list) ? data.list : []
  } catch (e) {
    console.error('加载动态MCP工具失败:', e)
    tools.value = []
  }
}

/**
 * 保存工具列表
 */
async function saveTools() {
  try {
    const dataToSave = { list: [...tools.value] }
    await storage.setMeta(STORAGE_KEYS.DYNAMIC_MCP_TOOLS, dataToSave)

    // 通知 background 重新加载工具
    browser.runtime.sendMessage({ type: 'reload-dynamic-mcp-tools' })
  } catch (e) {
    console.error('保存动态MCP工具失败:', e)
  }
}

/**
 * 打开添加对话框
 */
function openAdd() {
  editingIndex.value = null
  formData.value = {
    name: '',
    domain: '',
    urlPattern: '',
    code: DEFAULT_CODE_TEMPLATE,
    enabled: true,
    description: ''
  }
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function openEdit(idx: number) {
  const tool = tools.value[idx]
  editingIndex.value = idx
  formData.value = {
    name: tool.name,
    domain: tool.domain,
    urlPattern: tool.urlPattern || '',
    code: tool.code,
    enabled: tool.enabled,
    description: tool.description || ''
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

// 监听对话框显示状态
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
 * 处理对话框关闭事件
 */
function handleDialogClose() {
  dialogVisible.value = false
  editingIndex.value = null
}

/**
 * 删除工具
 */
function handleDelete(idx: number) {
  if (confirm('确定要删除这个工具吗？')) {
    tools.value.splice(idx, 1)
    saveTools()
  }
}

/**
 * 切换工具启用状态
 */
function toggleEnabled(idx: number) {
  tools.value[idx].enabled = !tools.value[idx].enabled
  tools.value[idx].updatedAt = Date.now()
  saveTools()
}

/**
 * 提交表单
 */
function handleSubmit() {
  const name = formData.value.name.trim()
  const domain = formData.value.domain.trim()
  const code = formData.value.code.trim()

  // 表单验证
  if (!name) {
    alert('工具名称不能为空')
    return
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    alert('工具名称只能包含字母、数字、下划线和连字符')
    return
  }
  if (!domain) {
    alert('域名不能为空')
    return
  }
  if (!code) {
    alert('工具代码不能为空')
    return
  }

  // 检查代码格式（基本验证）
  if (!code.includes('server.registerTool')) {
    alert('代码必须包含 server.registerTool 调用')
    return
  }

  const now = Date.now()
  const tool: DynamicMcpTool = {
    id: editingIndex.value === null ? `tool_${now}` : tools.value[editingIndex.value].id,
    name,
    domain,
    urlPattern: formData.value.urlPattern.trim() || undefined,
    code,
    enabled: formData.value.enabled,
    description: formData.value.description.trim(),
    createdAt: editingIndex.value === null ? now : tools.value[editingIndex.value].createdAt,
    updatedAt: now
  }

  if (editingIndex.value === null) {
    tools.value.push(tool)
  } else {
    tools.value[editingIndex.value] = tool
  }

  saveTools()
  hideForm()
}

/**
 * 格式化时间显示
 */
function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

/**
 * 按域名分组工具
 */
const groupedTools = computed(() => {
  const groups = new Map<string, DynamicMcpTool[]>()

  tools.value.forEach((tool) => {
    if (!groups.has(tool.domain)) {
      groups.set(tool.domain, [])
    }
    groups.get(tool.domain)!.push(tool)
  })

  return Array.from(groups.entries()).map(([domain, tools]) => ({
    domain,
    tools: tools.sort((a, b) => b.updatedAt - a.updatedAt)
  }))
})

// 初始化
onMounted(async () => {
  await loadTools()
})
</script>

<template>
  <div class="mcp-tool-manager">
    <div class="header">
      <div class="header-info">
        <h2>动态 MCP 工具管理</h2>
        <p class="subtitle">类似油猴脚本，按域名和路由动态注入 MCP 工具</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openAdd">
        <span class="icon">+</span>
        添加工具
      </button>
    </div>

    <!-- 按域名分组显示 -->
    <div v-if="groupedTools.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>还没有动态工具</h3>
      <p>点击"添加工具"创建你的第一个动态 MCP 工具</p>
    </div>

    <div v-for="group in groupedTools" :key="group.domain" class="domain-group">
      <div class="domain-header">
        <span class="domain-icon">🌐</span>
        <h3>{{ group.domain }}</h3>
        <span class="tool-count">{{ group.tools.length }} 个工具</span>
      </div>

      <div class="tools-list">
        <div v-for="(tool, idx) in group.tools" :key="tool.id" class="tool-card">
          <div class="tool-header">
            <div class="tool-title-section">
              <h4>{{ tool.name }}</h4>
              <span v-if="tool.urlPattern" class="url-pattern">{{ tool.urlPattern }}</span>
            </div>
            <div class="tool-actions">
              <label class="switch">
                <input type="checkbox" :checked="tool.enabled" @change="toggleEnabled(tools.indexOf(tool))" />
                <span class="slider"></span>
              </label>
              <button class="btn-icon" title="编辑" @click="openEdit(tools.indexOf(tool))">✏️</button>
              <button class="btn-icon btn-danger" title="删除" @click="handleDelete(tools.indexOf(tool))">🗑️</button>
            </div>
          </div>

          <p v-if="tool.description" class="tool-description">{{ tool.description }}</p>

          <div class="tool-meta">
            <span class="meta-item">创建: {{ formatTime(tool.createdAt) }}</span>
            <span class="meta-item">更新: {{ formatTime(tool.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑对话框 -->
    <dialog ref="dialogRef" class="dialog" @close="handleDialogClose">
      <div class="dialog-content" @click.stop>
        <h3>{{ editingIndex === null ? '添加' : '编辑' }}动态工具</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <div class="form-group">
              <label for="name">工具名称 *</label>
              <input id="name" v-model="formData.name" type="text" required placeholder="例如: my_custom_tool" />
              <span class="hint">只能包含字母、数字、下划线和连字符</span>
            </div>

            <div class="form-group">
              <label for="domain">匹配域名 *</label>
              <input id="domain" v-model="formData.domain" type="text" required placeholder="例如: excalidraw.com" />
            </div>
          </div>

          <div class="form-group">
            <label for="urlPattern">URL 匹配模式（可选）</label>
            <input
              id="urlPattern"
              v-model="formData.urlPattern"
              type="text"
              placeholder="例如: /canvas/* 或留空匹配所有路径"
            />
            <span class="hint">支持通配符 *，留空表示匹配该域名下所有页面</span>
          </div>

          <div class="form-group">
            <label for="description">工具描述</label>
            <input id="description" v-model="formData.description" type="text" placeholder="简短描述这个工具的功能" />
          </div>

          <div class="form-group">
            <label for="enabled" class="checkbox-label">
              <input id="enabled" v-model="formData.enabled" type="checkbox" />
              <span>启用此工具</span>
            </label>
          </div>

          <div class="form-group">
            <label for="code">工具代码 *</label>
            <textarea
              id="code"
              v-model="formData.code"
              required
              rows="15"
              placeholder="输入符合 MCP Server 规范的工具代码"
              spellcheck="false"
            ></textarea>
            <span class="hint">
              代码必须导出一个函数，接收 { server, z, cookie } 参数，并调用 server.registerTool 注册工具
            </span>
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
.mcp-tool-manager {
  height: 100%;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.header-info h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #6c757d;
}

.icon {
  font-size: 18px;
  margin-right: 4px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #6c757d;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #495057;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* 域名分组 */
.domain-group {
  margin-bottom: 32px;
}

.domain-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  margin-bottom: 16px;
}

.domain-icon {
  font-size: 20px;
}

.domain-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
  flex: 1;
}

.tool-count {
  font-size: 13px;
  color: #6c757d;
  background: #fff;
  padding: 4px 12px;
  border-radius: 12px;
}

/* 工具列表 */
.tools-list {
  display: grid;
  gap: 16px;
}

.tool-card {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.tool-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.tool-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tool-title-section h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  font-family: 'Courier New', monospace;
}

.url-pattern {
  font-size: 12px;
  color: #667eea;
  background: #f8f9ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.tool-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-description {
  margin: 12px 0;
  font-size: 14px;
  color: #495057;
  line-height: 1.6;
}

.tool-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6c757d;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.meta-item {
  display: flex;
  align-items: center;
}

/* 开关按钮 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.btn-icon {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #f8f9fa;
}

.btn-icon.btn-danger:hover {
  background: #fff5f5;
}

/* 按钮样式 */
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

/* 对话框样式 */
.dialog {
  border: none;
  padding: 0 16px 0 0;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  background: #fff;
  width: 90%;
  max-width: 800px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  margin: 0;
}

.form-group input[type='text'],
.form-group input[type='checkbox'],
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

.form-group input[type='checkbox'] {
  width: auto;
  padding: 0;
}

.form-group textarea {
  font-family: 'Courier New', Consolas, monospace;
  resize: vertical;
  min-height: 300px;
  line-height: 1.5;
}

.form-group input[type='text']:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
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
