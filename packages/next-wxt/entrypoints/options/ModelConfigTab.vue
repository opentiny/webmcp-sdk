<script setup lang="ts">
import { ref, onMounted, reactive, nextTick } from 'vue'
import {
  setCustomModels,
  getWebAgentUrl,
  setWebAgentUrl,
  getConnectType,
  CONNECT_TYPE_KEY,
  type CustomModelConfig
} from '../sidepanel/model-manage/model-storage'
import { storage } from '@wxt-dev/storage'
import { DEFAULT_WEB_AGENT_URL, initializeDefaultModelsIfNeeded } from '../sidepanel/model-manage'
import { iconEdit, iconDel, iconAdd } from '@opentiny/vue-icon'
import { TinyForm, Modal, TinyOption } from '@opentiny/vue'

const IconEditComp = iconEdit()
const IconDelComp = iconDel()
const IconAddComp = iconAdd()

const webAgentUrl = ref('')
const connectType = ref('')
const customModels = ref<CustomModelConfig[]>([])
const isSavingUrl = ref(false)

// Load data
async function loadData() {
  const [storedUrl, storedType] = await Promise.all([
    getWebAgentUrl(),
    getConnectType()
  ])
  webAgentUrl.value = storedUrl || DEFAULT_WEB_AGENT_URL
  connectType.value = storedType

  const models = await initializeDefaultModelsIfNeeded()
  customModels.value = models || []
}

onMounted(() => {
  loadData()
})

// Save Web-Agent URL
async function saveWebAgentUrl() {
  if (isSavingUrl.value) return

  const trimmedUrl = webAgentUrl.value.trim()
  if (trimmedUrl) {
    try {
      new URL(trimmedUrl)
    } catch (e) {
      Modal.alert('无效的 Web-Agent 地址，请检查格式（需包含协议，如 http:// 或 https://）')
      return
    }
  }

  isSavingUrl.value = true
  try {
    await setWebAgentUrl(trimmedUrl)
    await storage.setItem(CONNECT_TYPE_KEY, connectType.value)

    const res = await browser.runtime.sendMessage({ type: 'reconnect-web-agent' })
    if (res?.success) {
      Modal.message({ message: 'Web-Agent 接口地址配置已保存，且连接成功', status: 'success' })
    } else {
      Modal.message({ message: '地址已保存，但连接 Web Agent 失败，请检查目标系统状态或网络', status: 'error' })
    }
    notifyReload()
  } catch (err) {
    Modal.message({ message: '地址已保存，但连接 Web Agent 请求发生异常', status: 'error' })
  } finally {
    isSavingUrl.value = false
  }
}

// Dialog state
const editDialogVisible = ref(false)
const isEditing = ref(false)
const editingIndex = ref(-1)

const formData = reactive<CustomModelConfig>({
  id: '',
  label: '',
  model: '',
  providerType: '',
  baseURL: '',
  genuiUrl: '',
  apiKey: '',
  useReActMode: false,
  isDefault: false,
  iconType: 'builtin',
  iconValue: 'builtin-ai'
})

const formRef = ref<{ validate: () => Promise<boolean>; clearValidate?: () => void } | null>(null)

const builtInIcons = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'aliyun', label: '阿里云百炼' },
  { value: 'builtin-ai', label: 'Built-in AI' }
]

const providerTypes = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'ollama', label: 'Ollama' }
]

const formRules = {
  id: [{ required: true, message: '请输入模型 ID', trigger: 'blur' }],
  label: [{ required: true, message: '请输入模型显示名称', trigger: 'blur' }],
  model: [{ required: true, message: '请输入模型（model 参数）', trigger: 'blur' }],
  providerType: [{ required: true, message: '请输入 providerType', trigger: 'blur' }],
  iconValue: [{ required: true, message: '请输入图标值', trigger: 'blur' }]
}

function openAdd() {
  isEditing.value = false
  editingIndex.value = -1
  formData.id = ''
  formData.label = ''
  formData.model = ''
  formData.providerType = 'deepseek'
  formData.baseURL = ''
  formData.genuiUrl = ''
  formData.apiKey = ''
  formData.useReActMode = false
  formData.isDefault = false
  formData.iconType = 'builtin'
  formData.iconValue = 'deepseek'

  editDialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate?.())
}

function openEdit(index: number, row: CustomModelConfig) {
  isEditing.value = true
  editingIndex.value = index
  Object.assign(formData, JSON.parse(JSON.stringify(row)))

  editDialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate?.())
}

async function saveModel() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const newModel = JSON.parse(JSON.stringify(formData))

  // 若设为默认，则清除其他的默认状态
  if (isEditing.value && editingIndex.value >= 0) {
    // 若设为默认，则清除其他的默认状态
    if (newModel.isDefault) {
      customModels.value.forEach((m) => (m.isDefault = false))
    }
    customModels.value[editingIndex.value] = newModel
  } else {
    // Check duplicate ID
    if (customModels.value.some((m) => m.id === newModel.id)) {
      Modal.message({ message: '模型 ID 已存在', status: 'warning' })
      return
    }
    // 若设为默认，则清除其他的默认状态
    if (newModel.isDefault) {
      customModels.value.forEach((m) => (m.isDefault = false))
    }
    customModels.value.push(newModel)
  }

  await setCustomModels(customModels.value)
  editDialogVisible.value = false
  Modal.message({ message: isEditing.value ? '修改成功' : '添加成功', status: 'success' })
  notifyReload()
}

// Delete confirmation
const deleteDialogVisible = ref(false)
const deletingIndex = ref(-1)

function openDelete(index: number) {
  deletingIndex.value = index
  deleteDialogVisible.value = true
}

async function confirmDelete() {
  if (deletingIndex.value >= 0) {
    customModels.value.splice(deletingIndex.value, 1)
    await setCustomModels(customModels.value)
    Modal.message({ message: '删除成功', status: 'success' })
    notifyReload()
  }
  deleteDialogVisible.value = false
}

function notifyReload() {
  void browser.runtime.sendMessage({ type: 'reload-sidepanel' }).catch(() => {})
}
</script>

<template>
  <div class="model-config-tab">
    <div class="section-block">
      <div class="section-title">全局配置</div>
      <p class="section-desc">
        修改全局 Web-Agent 服务地址。留空则使用内置默认地址:
        <code class="default-val">{{ DEFAULT_WEB_AGENT_URL }}</code>
      </p>
      <div class="agent-url-form">
        <TinyForm label-width="120px" label-position="left">
          <TinyFormItem label="接口地址">
            <TinyInput
              v-model="webAgentUrl"
              :placeholder="`例如: ${DEFAULT_WEB_AGENT_URL}`"
              clearable
              style="width: 400px"
            />
          </TinyFormItem>
          <TinyFormItem label="连接类型">
            <TinySelect v-model="connectType" style="width: 200px">
              <TinyOption label="sse" value="sse" />
              <TinyOption label="stream (MCP)" value="stream" />
            </TinySelect>
            <TinyButton :loading="isSavingUrl" type="primary" @click="saveWebAgentUrl" style="margin-left: 12px"
              >保存全局配置</TinyButton
            >
          </TinyFormItem>
        </TinyForm>
      </div>
    </div>

    <div class="section-block">
      <div class="section-title">模型接口与界面配置</div>
      <p class="section-desc">统一管理您的本地大语言模型与系统内置模型，对任何配置的修改/删除均可立即在侧边栏生效。</p>

      <div class="toolbar">
        <TinyButton class="toolbar-btn" @click="openAdd">
          <span class="toolbar-btn-inner">
            <component :is="IconAddComp" />
            <span>添加模型配置</span>
          </span>
        </TinyButton>
      </div>

      <table class="simple-table">
        <thead>
          <tr>
            <th width="50">序号</th>
            <th>显示名称</th>
            <th width="100">Provider</th>
            <th>Base URL</th>
            <th>GenUI URL</th>
            <th width="80">ReAct</th>
            <th width="50">默认</th>
            <th width="100" style="text-align: center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in customModels" :key="row.id">
            <td>{{ index + 1 }}</td>
            <td :title="row.id">
              <div class="model-label-cell">
                <span class="main-label">{{ row.label }}</span>
                <span class="sub-id">{{ row.id }}</span>
              </div>
            </td>
            <td>{{ row.providerType }}</td>
            <td :title="row.baseURL" class="truncate">{{ row.baseURL || '-' }}</td>
            <td :title="row.genuiUrl" class="truncate">{{ row.genuiUrl || '-' }}</td>
            <td>{{ row.useReActMode ? '是' : '-' }}</td>
            <td>{{ row.isDefault ? '是' : '-' }}</td>
            <td align="center">
              <div class="ops-cell">
                <button class="icon-btn-action" title="编辑" aria-label="编辑模型配置" @click="openEdit(index, row)">
                  <component :is="IconEditComp" />
                </button>
                <button class="icon-btn-action icon-btn-danger" title="删除" aria-label="删除模型配置" @click="openDelete(index)">
                  <component :is="IconDelComp" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="customModels.length === 0">
            <td colspan="8" class="empty-text">暂无模型配置</td>
          </tr>
        </tbody>
      </table>
    </div>

    <TinyModal
      v-model="editDialogVisible"
      :title="isEditing ? '编辑模型配置' : '添加模型配置'"
      width="600px"
      :append-to-body="true"
      :show-footer="true"
      @close="editDialogVisible = false"
    >
      <div class="dialog-body">
        <TinyForm ref="formRef" :model="formData" :rules="formRules" label-width="120px">
          <TinyFormItem label="模型 ID" prop="id">
            <TinyInput v-model="formData.id" placeholder="如 my-deepseek" :disabled="isEditing" />
          </TinyFormItem>
          <TinyFormItem label="显示名称" prop="label">
            <TinyInput v-model="formData.label" placeholder="如 My DeepSeek" />
          </TinyFormItem>
          <TinyFormItem label="Model" prop="model">
            <TinyInput v-model="formData.model" placeholder="对应接口的 model 参数段，如 deepseek-chat" />
          </TinyFormItem>
          <TinyFormItem label="Provider Type" prop="providerType">
            <TinySelect v-model="formData.providerType" placeholder="请选择或输入" filterable allow-create clearable>
              <TinyOption v-for="item in providerTypes" :key="item.value" :label="item.label" :value="item.value" />
            </TinySelect>
          </TinyFormItem>
          <TinyFormItem label="API Key" prop="apiKey">
            <TinyInput v-model="formData.apiKey" placeholder="对应模型的 API 凭证" type="password" show-password />
          </TinyFormItem>
          <TinyFormItem label="Base URL" prop="baseURL">
            <TinyInput v-model="formData.baseURL" placeholder="大语言模型对话接口前缀 (可选)" />
          </TinyFormItem>
          <TinyFormItem label="GenUI URL" prop="genuiUrl">
            <TinyInput v-model="formData.genuiUrl" placeholder="生成 UI 专用接口 (可选)" />
          </TinyFormItem>
          <TinyFormItem label="ReAct Mode">
            <TinySwitch v-model="formData.useReActMode" />
          </TinyFormItem>
          <TinyFormItem label="设为默认选中">
            <TinySwitch v-model="formData.isDefault" />
          </TinyFormItem>
          <TinyFormItem label="图标类型">
            <TinyRadio v-model="formData.iconType" label="builtin">内置图标</TinyRadio>
            <TinyRadio v-model="formData.iconType" label="url">图片 URL</TinyRadio>
          </TinyFormItem>
          <TinyFormItem label="图标参数" prop="iconValue">
            <TinySelect v-if="formData.iconType === 'builtin'" v-model="formData.iconValue" placeholder="请选择">
              <TinyOption v-for="item in builtInIcons" :key="item.value" :label="item.label" :value="item.value" />
            </TinySelect>
            <TinyInput v-else v-model="formData.iconValue" placeholder="请输入图片网络地址" />
          </TinyFormItem>
        </TinyForm>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <TinyButton @click="editDialogVisible = false">取消</TinyButton>
          <TinyButton type="primary" @click="saveModel">确认</TinyButton>
        </div>
      </template>
    </TinyModal>

    <TinyModal
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
      :append-to-body="true"
      :show-footer="true"
      @confirm="confirmDelete"
      @close="deleteDialogVisible = false"
    >
      <div class="delete-dialog-body">
        <p>确定要删除这个模型配置吗？</p>
      </div>
    </TinyModal>
  </div>
</template>

<style scoped>
.model-config-tab {
  padding: 0 4px;
}

.section-block {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  position: relative;
  padding-left: 10px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: #5e7ce0;
  border-radius: 2px;
}

.section-desc {
  font-size: 14px;
  color: #606266;
  margin-bottom: 16px;
  line-height: 1.6;
}

.default-val {
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #5e7ce0;
  margin-left: 4px;
}

.readonly-table th {
  background-color: #fafafa;
}

.readonly-table td {
  color: #909399;
}

.agent-url-form {
  display: flex;
  align-items: center;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar-btn :deep(button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: #303133;
  margin-bottom: 24px;
  border: 1px solid #ebedf0;
}

.simple-table th,
.simple-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #ebedf0;
  text-align: left;
}

.simple-table th {
  background-color: #f5f7fa;
  font-weight: 600;
  color: #606266;
}

.simple-table tbody tr:hover {
  background-color: #f5f7fa;
}

.truncate {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-label-cell {
  display: flex;
  flex-direction: column;
}

.main-label {
  font-weight: 600;
  color: #303133;
}

.sub-id {
  font-size: 11px;
  color: #909399;
  line-height: 1.2;
}

.ops-cell {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.empty-text {
  text-align: center !important;
  color: #909399;
  padding: 32px 0 !important;
}

.icon-btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
  margin: 0 4px;
  border: 1px solid transparent;
  background: transparent;
  padding: 0;
}

.icon-btn-action:hover, .icon-btn-action:focus {
  background: #ecf5ff;
  color: #409eff;
  border-color: #d1e9ff;
  outline: none;
}

.icon-btn-danger:hover, .icon-btn-danger:focus {
  background: #fef0f0 !important;
  color: #f56c6c !important;
  border-color: #ffdbdb !important;
}

.dialog-body {
  padding: 20px 0;
}

.delete-dialog-body {
  padding: 12px 0;
}

.dialog-footer {
  text-align: right;
}
</style>
