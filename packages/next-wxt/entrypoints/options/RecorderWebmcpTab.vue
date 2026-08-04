<script setup lang="ts">
/**
 * Recorder 自动化工具管理（扩展侧 WebMCP，可在线编辑）
 */
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { TinyForm, Message } from '@opentiny/vue'
import {
  iconDel,
  iconAdd,
  iconDownload,
  iconUpload,
  iconSave,
  iconClose,
  iconCode,
  iconFile,
  iconChevronUp,
  iconChevronDown
} from '@opentiny/vue-icon'
import {
  listRecorderWebmcpTools,
  upsertRecorderWebmcpTool,
  removeRecorderWebmcpTool,
  setRecorderWebmcpToolEnabled,
  exportRecorderWebmcpToolsJson,
  importRecorderWebmcpToolsJson,
  createDefaultRecorderToolMeta,
  type RecorderWebmcpTool
} from '@/recorder-webmcp'
import { validateMatchPatterns } from '@/user-mcp-scripts/match'

const IconDelComp = iconDel()
const IconAddComp = iconAdd()
const IconDownloadComp = iconDownload()
const IconUploadComp = iconUpload()
const IconSaveComp = iconSave()
const IconCloseComp = iconClose()
const IconCodeComp = iconCode()
const IconFileComp = iconFile()
const IconChevronUpComp = iconChevronUp()
const IconChevronDownComp = iconChevronDown()

const tools = ref<RecorderWebmcpTool[]>([])
const loading = ref(false)
const saving = ref(false)
const selectedKey = ref<string | null>(null)
const isDirty = ref(false)
const collapseNames = ref<string[]>(['meta'])
const importInputRef = ref<HTMLInputElement | null>(null)
const stepsEditorRef = ref<HTMLTextAreaElement | null>(null)

const editForm = reactive({
  name: '',
  title: '',
  description: '',
  matchesText: '',
  enabled: true,
  inputSchemaText: '',
  stepsText: '',
  sourceBackup: ''
})

const editFormRef = ref<{ validate: () => Promise<boolean>; clearValidate?: () => void } | null>(null)
const editRules = {
  name: [{ required: true, message: '请输入工具名', trigger: 'blur' }],
  matchesText: [{ required: true, message: '请输入至少一条 @match', trigger: 'blur' }],
  stepsText: [{ required: true, message: 'steps 不能为空', trigger: 'blur' }]
}

const deleteVisible = ref(false)
const discardVisible = ref(false)
const pendingSelectKey = ref<string | null>(null)

const isEditing = computed(() => selectedKey.value !== null)
const isNewDraft = computed(() => selectedKey.value === '__new__')
const metaExpanded = computed(() => collapseNames.value.includes('meta'))
const editorTitle = computed(() => {
  if (!isEditing.value) return ''
  return editForm.title || editForm.name || (isNewDraft.value ? '未命名工具' : '编辑工具')
})

const selectedTool = computed(() => {
  if (!selectedKey.value || selectedKey.value === '__new__') return null
  return tools.value.find((t) => t.id === selectedKey.value) ?? null
})

watch(editForm, () => {
  if (isEditing.value) isDirty.value = true
})

async function loadTools() {
  loading.value = true
  try {
    tools.value = await listRecorderWebmcpTools()
  } catch (e) {
    console.error(e)
    Message.message({ message: '加载工具失败', status: 'error' })
  } finally {
    loading.value = false
  }
}

function parseMatchesText(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function notifyUpdated() {
  try {
    await browser.runtime.sendMessage({ type: 'recorder-webmcp-updated' })
  } catch (e) {
    console.warn('[recorder-webmcp] 刷新通知失败', e)
  }
}

function fillFormFromTool(row: RecorderWebmcpTool) {
  editForm.name = row.name
  editForm.title = row.title
  editForm.description = row.description || ''
  editForm.matchesText = row.matches.join('\n')
  editForm.enabled = row.enabled
  editForm.inputSchemaText = JSON.stringify(row.inputSchema ?? {}, null, 2)
  editForm.stepsText = JSON.stringify(row.steps ?? [], null, 2)
  editForm.sourceBackup = row.sourceBackup || ''
}

function fillFormFromMeta(meta: ReturnType<typeof createDefaultRecorderToolMeta>) {
  editForm.name = meta.name
  editForm.title = meta.title
  editForm.description = meta.description
  editForm.matchesText = meta.matches.join('\n')
  editForm.enabled = meta.enabled
  editForm.inputSchemaText = JSON.stringify(meta.inputSchema, null, 2)
  editForm.stepsText = JSON.stringify(meta.steps, null, 2)
  editForm.sourceBackup = ''
}

function focusEditor() {
  nextTick(() => stepsEditorRef.value?.focus())
}

function applyNewDraft() {
  selectedKey.value = '__new__'
  fillFormFromMeta(
    createDefaultRecorderToolMeta({ title: 'Recorder 示例', matches: ['*://example.com/*'] })
  )
  collapseNames.value = ['meta']
  nextTick(() => {
    isDirty.value = false
    editFormRef.value?.clearValidate?.()
    focusEditor()
  })
}

function trySelect(nextKey: string, apply: () => void) {
  if (isDirty.value && isEditing.value) {
    pendingSelectKey.value = nextKey
    discardVisible.value = true
    return
  }
  apply()
}

function openCreate() {
  trySelect('__new__', applyNewDraft)
}

function selectTool(id: string) {
  if (selectedKey.value === id) return
  trySelect(id, () => {
    const row = tools.value.find((t) => t.id === id)
    if (!row) return
    selectedKey.value = id
    fillFormFromTool(row)
    collapseNames.value = ['meta']
    nextTick(() => {
      isDirty.value = false
      editFormRef.value?.clearValidate?.()
      focusEditor()
    })
  })
}

function confirmDiscard() {
  discardVisible.value = false
  const key = pendingSelectKey.value
  pendingSelectKey.value = null
  isDirty.value = false
  if (key === '__new__') applyNewDraft()
  else if (key === null) selectedKey.value = null
  else if (key) {
    const row = tools.value.find((t) => t.id === key)
    if (!row) return
    selectedKey.value = key
    fillFormFromTool(row)
    nextTick(() => {
      isDirty.value = false
      focusEditor()
    })
  }
}

function closeEditor() {
  if (isDirty.value) {
    pendingSelectKey.value = null
    discardVisible.value = true
    return
  }
  selectedKey.value = null
  isDirty.value = false
}

function cancelDiscard() {
  discardVisible.value = false
  pendingSelectKey.value = null
}

function toggleMeta() {
  collapseNames.value = metaExpanded.value ? [] : ['meta']
}

async function saveEdit() {
  const ok = await editFormRef.value?.validate().catch(() => false)
  if (!ok) {
    collapseNames.value = ['meta']
    return
  }

  const name = editForm.name.trim()
  const matches = parseMatchesText(editForm.matchesText)
  const matchCheck = validateMatchPatterns(matches)
  if (!matchCheck.ok) {
    Message.message({ message: matchCheck.error, status: 'warning' })
    collapseNames.value = ['meta']
    return
  }

  let inputSchema: Record<string, unknown>
  let steps: unknown
  try {
    inputSchema = JSON.parse(editForm.inputSchemaText || '{}')
  } catch {
    Message.message({ message: 'inputSchema 不是合法 JSON', status: 'warning' })
    return
  }
  try {
    steps = JSON.parse(editForm.stepsText || '[]')
  } catch {
    Message.message({ message: 'steps 不是合法 JSON', status: 'warning' })
    return
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    Message.message({ message: 'steps 须为非空数组', status: 'warning' })
    return
  }

  saving.value = true
  try {
    const result = await upsertRecorderWebmcpTool({
      id: isNewDraft.value ? undefined : selectedKey.value || undefined,
      name,
      title: editForm.title.trim() || name,
      description: editForm.description.trim(),
      matches,
      enabled: editForm.enabled,
      inputSchema,
      steps: steps as any,
      sourceBackup: editForm.sourceBackup.trim() || undefined
    })
    if (!result.ok) {
      Message.message({ message: result.error, status: 'error' })
      return
    }
    await loadTools()
    selectedKey.value = result.tool.id
    fillFormFromTool(result.tool)
    isDirty.value = false
    await notifyUpdated()
    Message.message({ message: '已保存，侧栏将按当前页重新同步工具', status: 'success' })
  } catch (e) {
    console.error(e)
    Message.message({ message: '保存失败', status: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(row: RecorderWebmcpTool, enabled: boolean) {
  const result = await setRecorderWebmcpToolEnabled(row.id, enabled)
  if (!result.ok) {
    Message.message({ message: result.error, status: 'error' })
    return
  }
  await loadTools()
  if (selectedKey.value === row.id) {
    editForm.enabled = enabled
    isDirty.value = false
  }
  await notifyUpdated()
}

function confirmDelete() {
  if (isNewDraft.value) {
    selectedKey.value = null
    isDirty.value = false
    return
  }
  deleteVisible.value = true
}

async function doDelete() {
  deleteVisible.value = false
  if (!selectedTool.value) return
  await removeRecorderWebmcpTool(selectedTool.value.id)
  selectedKey.value = null
  isDirty.value = false
  await loadTools()
  await notifyUpdated()
  Message.message({ message: '已删除', status: 'success' })
}

function downloadBackup() {
  const json = exportRecorderWebmcpToolsJson(tools.value)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recorder-webmcp-tools-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importInputRef.value?.click()
}

async function handleImportFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const result = await importRecorderWebmcpToolsJson(text)
    if (!result.ok) {
      Message.message({ message: result.error, status: 'error' })
      return
    }
    await loadTools()
    await notifyUpdated()
    Message.message({
      message: `导入完成：成功 ${result.imported}，跳过 ${result.skipped}（导入项默认禁用）`,
      status: 'success'
    })
  } catch (e) {
    console.error(e)
    Message.message({ message: '导入失败', status: 'error' })
  }
}

function onStepsKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    void saveEdit()
  }
}

onMounted(loadTools)
</script>

<template>
  <div class="recorder-tab">
    <div class="page-header">
      <div class="page-header-text">
        <p class="page-desc">
          管理由 Chrome Recorder（Puppeteer）转化的扩展侧自动化工具。工具挂在侧栏，用
          <code>puppeteer-core</code> 操作<strong>当前激活页</strong>；仅
          <code>@match</code> 命中时出现在工具列表。可在对话中粘贴脚本，由
          <code>recorder-to-webmcp</code> Skill 转化后调用 <code>recorder_webmcp_save</code> 落盘。
        </p>
      </div>
      <div class="page-header-actions">
        <TinyButton class="toolbar-btn" @click="downloadBackup">
          <span class="toolbar-btn-inner">
            <component :is="IconDownloadComp" />
            <span>导出</span>
          </span>
        </TinyButton>
        <TinyButton class="toolbar-btn" @click="triggerImport">
          <span class="toolbar-btn-inner">
            <component :is="IconUploadComp" />
            <span>导入</span>
          </span>
        </TinyButton>
        <TinyButton type="primary" class="toolbar-btn" @click="openCreate">
          <span class="toolbar-btn-inner">
            <component :is="IconAddComp" />
            <span>新建工具</span>
          </span>
        </TinyButton>
        <input
          ref="importInputRef"
          type="file"
          accept=".json,application/json"
          class="hidden-input"
          @change="handleImportFile"
        />
      </div>
    </div>

    <div class="workspace">
      <aside class="sidebar">
        <div class="sidebar-title">
          <component :is="IconFileComp" class="sidebar-title-icon" />
          <span>已保存工具</span>
          <TinyTag v-if="tools.length" size="small" type="info" effect="light" class="count-tag">
            {{ tools.length }}
          </TinyTag>
        </div>

        <div v-if="loading" class="sidebar-empty">加载中…</div>
        <div v-else-if="tools.length === 0" class="sidebar-empty">
          <p>暂无工具</p>
          <TinyButton type="text" @click="openCreate">新建第一个</TinyButton>
        </div>
        <ul v-else class="tool-list">
          <li
            v-for="row in tools"
            :key="row.id"
            class="tool-item"
            :class="{ active: selectedKey === row.id, disabled: !row.enabled }"
            @click="selectTool(row.id)"
          >
            <div class="tool-item-switch" @click.stop>
              <TinySwitch :model-value="row.enabled" @change="(v: boolean) => toggleEnabled(row, v)" />
            </div>
            <div class="tool-item-body">
              <div class="tool-item-name">{{ row.title || row.name }}</div>
              <div class="tool-item-match" :title="row.matches.join('\n')">
                {{ row.name }} · {{ row.matches[0] || '（无 match）' }}
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <section class="editor-pane">
        <div v-if="!isEditing" class="editor-placeholder">
          <component :is="IconCodeComp" class="placeholder-icon" />
          <h3>Recorder 自动化编辑器</h3>
          <p>从左侧选择工具，或新建。编辑 steps / inputSchema JSON，Ctrl/⌘+S 保存。</p>
          <TinyButton type="primary" @click="openCreate">新建工具</TinyButton>
        </div>

        <template v-else>
          <header class="editor-toolbar">
            <div class="editor-toolbar-left">
              <strong class="editor-title">{{ editorTitle }}</strong>
              <TinyTag v-if="isDirty" size="small" type="warning" effect="light">未保存</TinyTag>
              <TinyTag v-if="isNewDraft" size="small" type="info" effect="light">新草稿</TinyTag>
            </div>
            <div class="editor-toolbar-right">
              <TinyButton size="mini" @click="toggleMeta">
                <span class="toolbar-btn-inner">
                  <component :is="metaExpanded ? IconChevronUpComp : IconChevronDownComp" />
                  <span>元数据</span>
                </span>
              </TinyButton>
              <TinyButton size="mini" @click="closeEditor">
                <span class="toolbar-btn-inner">
                  <component :is="IconCloseComp" />
                  <span>关闭</span>
                </span>
              </TinyButton>
              <TinyButton size="mini" type="danger" plain @click="confirmDelete">
                <span class="toolbar-btn-inner">
                  <component :is="IconDelComp" />
                  <span>删除</span>
                </span>
              </TinyButton>
              <TinyButton type="primary" size="mini" :loading="saving" @click="saveEdit">
                <span class="toolbar-btn-inner">
                  <component :is="IconSaveComp" />
                  <span>保存并生效</span>
                </span>
              </TinyButton>
            </div>
          </header>

          <TinyCollapse v-model="collapseNames" class="meta-collapse">
            <TinyCollapseItem title="工具元数据" name="meta">
              <TinyForm
                ref="editFormRef"
                :model="editForm"
                :rules="editRules"
                label-width="110px"
                class="meta-form"
              >
                <TinyFormItem label="工具名" prop="name">
                  <TinyInput v-model="editForm.name" placeholder="recorder_xxx" />
                </TinyFormItem>
                <TinyFormItem label="标题">
                  <TinyInput v-model="editForm.title" placeholder="显示标题" />
                </TinyFormItem>
                <TinyFormItem label="描述">
                  <TinyInput v-model="editForm.description" type="textarea" :rows="2" />
                </TinyFormItem>
                <TinyFormItem label="@match" prop="matchesText">
                  <TinyInput
                    v-model="editForm.matchesText"
                    type="textarea"
                    :rows="3"
                    placeholder="每行一条，例如：*://opentiny.design/*"
                  />
                </TinyFormItem>
                <TinyFormItem label="启用">
                  <TinySwitch v-model="editForm.enabled" />
                </TinyFormItem>
                <TinyFormItem label="inputSchema">
                  <TinyInput v-model="editForm.inputSchemaText" type="textarea" :rows="6" />
                </TinyFormItem>
              </TinyForm>
            </TinyCollapseItem>
          </TinyCollapse>

          <div class="code-header">
            <span class="code-header-left">
              <component :is="IconCodeComp" />
              <span>steps · JSON</span>
            </span>
            <span class="code-header-hint">Ctrl/⌘+S 保存</span>
          </div>
          <textarea
            ref="stepsEditorRef"
            v-model="editForm.stepsText"
            class="json-editor"
            spellcheck="false"
            wrap="off"
            @keydown="onStepsKeydown"
          />

          <div class="code-header secondary">
            <span>sourceBackup（可选，原始 Recorder 源码）</span>
          </div>
          <TinyInput v-model="editForm.sourceBackup" type="textarea" :rows="4" class="backup-input" />
        </template>
      </section>
    </div>

    <TinyModal v-model="deleteVisible" title="删除工具" width="400" :show-footer="true">
      <p>确定删除「{{ selectedTool?.title || selectedTool?.name }}」？</p>
      <template #footer>
        <TinyButton @click="deleteVisible = false">取消</TinyButton>
        <TinyButton type="danger" @click="doDelete">删除</TinyButton>
      </template>
    </TinyModal>

    <TinyModal v-model="discardVisible" title="放弃未保存更改？" width="400" :show-footer="true">
      <p>当前编辑未保存，切换将丢失更改。</p>
      <template #footer>
        <TinyButton @click="cancelDiscard">继续编辑</TinyButton>
        <TinyButton type="danger" @click="confirmDiscard">放弃</TinyButton>
      </template>
    </TinyModal>
  </div>
</template>

<style scoped>
.recorder-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 640px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.page-desc {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  max-width: 720px;
}
.page-desc code {
  font-size: 12px;
  background: #f4f4f5;
  padding: 1px 4px;
  border-radius: 3px;
}
.page-header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.toolbar-btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.hidden-input {
  display: none;
}
.workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  min-height: 560px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.sidebar {
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #e4e7ed;
}
.sidebar-title-icon {
  font-size: 16px;
}
.count-tag {
  margin-left: auto;
}
.sidebar-empty {
  padding: 24px 16px;
  color: #909399;
  text-align: center;
  font-size: 13px;
}
.tool-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow: auto;
  flex: 1;
}
.tool-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
}
.tool-item:hover {
  background: #f0f2f5;
}
.tool-item.active {
  background: #ecf5ff;
}
.tool-item.disabled .tool-item-name {
  color: #909399;
}
.tool-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.tool-item-match {
  margin-top: 2px;
  font-size: 11px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.editor-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 0 0 12px;
}
.editor-placeholder {
  margin: auto;
  text-align: center;
  color: #909399;
  padding: 40px 20px;
}
.placeholder-icon {
  font-size: 40px;
  margin-bottom: 8px;
}
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e4e7ed;
}
.editor-toolbar-left,
.editor-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.editor-title {
  font-size: 14px;
}
.meta-collapse {
  margin: 0 12px;
}
.meta-form {
  padding-top: 8px;
}
.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px 4px;
  font-size: 12px;
  color: #606266;
}
.code-header.secondary {
  margin-top: 8px;
}
.code-header-left {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}
.code-header-hint {
  color: #909399;
}
.json-editor {
  margin: 0 12px;
  flex: 1;
  min-height: 220px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #1e1e1e;
  color: #d4d4d4;
}
.backup-input {
  margin: 0 12px;
}
@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .sidebar {
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
    max-height: 240px;
  }
}
</style>
