<script setup lang="ts">
/**
 * 页面 MCP 脚本管理（列表 + 大编辑器，TinyVue）
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
  iconChevronDown,
  iconHelp
} from '@opentiny/vue-icon'
import {
  listUserMcpScripts,
  upsertUserMcpScript,
  removeUserMcpScript,
  setUserMcpScriptEnabled,
  exportUserMcpScriptsZip,
  importUserMcpScriptsZip,
  importUserMcpScriptsJson,
  validateMatchPatterns,
  createDefaultScriptMeta,
  type UserMcpScript
} from '@/user-mcp-scripts'

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
const IconHelpComp = iconHelp()

const scripts = ref<UserMcpScript[]>([])
const loading = ref(false)
const saving = ref(false)

/** null = 未打开；'__new__' = 新建未落盘；否则为脚本 id */
const selectedKey = ref<string | null>(null)
const isDirty = ref(false)
const collapseNames = ref<string[]>(['meta'])
const sourceEditorRef = ref<HTMLTextAreaElement | null>(null)
/** Esc 后下一击 Tab 允许移出编辑器（无障碍） */
const tabNavArmed = ref(false)

const editForm = reactive({
  name: '',
  description: '',
  matchesText: '',
  enabled: true,
  replacesBuiltIn: false,
  source: ''
})

const editFormRef = ref<{ validate: () => Promise<boolean>; clearValidate?: () => void } | null>(null)
const editRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  matchesText: [{ required: true, message: '请输入至少一条 @match', trigger: 'blur' }],
  source: [{ required: true, message: '脚本源码不能为空', trigger: 'blur' }]
}

const deleteVisible = ref(false)
const discardVisible = ref(false)
const pendingSelectKey = ref<string | null>(null)

const importInputRef = ref<HTMLInputElement | null>(null)

const isEditing = computed(() => selectedKey.value !== null)
const isNewDraft = computed(() => selectedKey.value === '__new__')
const metaExpanded = computed(() => collapseNames.value.includes('meta'))
const editorTitle = computed(() => {
  if (!isEditing.value) return ''
  if (isNewDraft.value) return editForm.name || '未命名脚本'
  return editForm.name || '编辑脚本'
})

const selectedScript = computed(() => {
  if (!selectedKey.value || selectedKey.value === '__new__') return null
  return scripts.value.find((s) => s.id === selectedKey.value) ?? null
})

const sourceLineCount = computed(() => {
  const text = editForm.source || ''
  return text.length === 0 ? 1 : text.split('\n').length
})

const gutterText = computed(() => {
  const n = sourceLineCount.value
  let out = ''
  for (let i = 1; i <= n; i++) out += `${i}\n`
  return out
})

watch(editForm, () => {
  if (isEditing.value) isDirty.value = true
})

async function loadScripts() {
  loading.value = true
  try {
    scripts.value = await listUserMcpScripts()
  } catch (e) {
    console.error(e)
    Message.message({ message: '加载脚本失败', status: 'error' })
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

async function notifyReinject(opts: { scriptId?: string; matchesSnapshot?: string[][] }) {
  try {
    await browser.runtime.sendMessage({
      type: 'reinject-user-mcp-scripts',
      scriptId: opts.scriptId,
      matchesSnapshot: opts.matchesSnapshot
    })
  } catch (e) {
    console.warn('[user-mcp-scripts] reinject 通知失败', e)
  }
}

function fillFormFromMeta(meta: {
  name: string
  description: string
  matches: string[]
  enabled: boolean
  replacesBuiltIn: boolean
  source: string
}) {
  editForm.name = meta.name
  editForm.description = meta.description
  editForm.matchesText = meta.matches.join('\n')
  editForm.enabled = meta.enabled
  editForm.replacesBuiltIn = meta.replacesBuiltIn
  editForm.source = meta.source
}

function fillFormFromScript(row: UserMcpScript) {
  editForm.name = row.name
  editForm.description = row.description || ''
  editForm.matchesText = row.matches.join('\n')
  editForm.enabled = row.enabled
  editForm.replacesBuiltIn = row.replacesBuiltIn
  editForm.source = row.source
}

function focusEditor() {
  nextTick(() => {
    sourceEditorRef.value?.focus()
  })
}

function applyNewDraft() {
  selectedKey.value = '__new__'
  fillFormFromMeta(createDefaultScriptMeta({ name: '我的页面工具', matches: ['*://example.com/*'] }))
  collapseNames.value = ['meta']
  nextTick(() => {
    isDirty.value = false
    editFormRef.value?.clearValidate?.()
    focusEditor()
  })
}

function openCreate() {
  trySelect('__new__', applyNewDraft)
}

function selectScript(id: string) {
  if (selectedKey.value === id) return
  trySelect(id, () => {
    const row = scripts.value.find((s) => s.id === id)
    if (!row) return
    selectedKey.value = id
    fillFormFromScript(row)
    collapseNames.value = ['meta']
    nextTick(() => {
      isDirty.value = false
      editFormRef.value?.clearValidate?.()
      focusEditor()
    })
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

function confirmDiscard() {
  discardVisible.value = false
  const key = pendingSelectKey.value
  pendingSelectKey.value = null
  isDirty.value = false
  if (key === '__new__') {
    applyNewDraft()
  } else if (key === null) {
    selectedKey.value = null
  } else if (key) {
    const row = scripts.value.find((s) => s.id === key)
    if (!row) return
    selectedKey.value = key
    fillFormFromScript(row)
    nextTick(() => {
      isDirty.value = false
      editFormRef.value?.clearValidate?.()
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
  if (!(editForm.source || '').trim()) {
    Message.message({ message: '脚本源码不能为空', status: 'warning' })
    return
  }

  saving.value = true
  try {
    const previousMatches = selectedScript.value?.matches
    const result = await upsertUserMcpScript({
      id: isNewDraft.value ? undefined : selectedKey.value || undefined,
      name,
      description: editForm.description.trim(),
      matches,
      enabled: editForm.enabled,
      replacesBuiltIn: editForm.replacesBuiltIn,
      source: editForm.source
    })
    if (!result.ok) {
      Message.message({ message: result.error, status: 'error' })
      return
    }
    isDirty.value = false
    Message.message({ message: '已保存，正在刷新匹配页面…', status: 'success' })
    await loadScripts()
    selectedKey.value = result.script.id
    fillFormFromScript(result.script)
    nextTick(() => {
      isDirty.value = false
    })
    await notifyReinject({
      scriptId: result.script.id,
      matchesSnapshot: previousMatches ? [previousMatches, matches] : [matches]
    })
  } catch (e: any) {
    Message.message({ message: e?.message || '保存失败', status: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(row: UserMcpScript, enabled: boolean) {
  const result = await setUserMcpScriptEnabled(row.id, enabled)
  if (!result.ok) {
    Message.message({ message: result.error, status: 'error' })
    await loadScripts()
    return
  }
  await loadScripts()
  if (selectedKey.value === row.id) {
    editForm.enabled = enabled
    nextTick(() => {
      isDirty.value = false
    })
  }
  await notifyReinject({ scriptId: row.id })
}

function confirmDelete() {
  if (isNewDraft.value) {
    selectedKey.value = null
    isDirty.value = false
    return
  }
  if (!selectedScript.value) return
  deleteVisible.value = true
}

async function doDelete() {
  const row = selectedScript.value
  if (!row) return
  const snap = [row.matches]
  await removeUserMcpScript(row.id)
  deleteVisible.value = false
  selectedKey.value = null
  isDirty.value = false
  Message.message({ message: '已删除', status: 'success' })
  await loadScripts()
  await notifyReinject({ matchesSnapshot: snap })
}

async function downloadBackup() {
  if (!scripts.value.length) {
    Message.message({ message: '暂无脚本可导出', status: 'warning' })
    return
  }
  const blob = await exportUserMcpScriptsZip(scripts.value)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mcp-servers-${new Date().toISOString().slice(0, 10)}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function triggerImport() {
  importInputRef.value?.click()
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const lower = file.name.toLowerCase()
  try {
    let result: { ok: true; imported: number; skipped: number } | { ok: false; error: string }
    if (lower.endsWith('.zip')) {
      result = await importUserMcpScriptsZip(await file.arrayBuffer())
    } else if (lower.endsWith('.json')) {
      // 兼容旧版 JSON 备份
      result = await importUserMcpScriptsJson(await file.text())
    } else {
      Message.message({ message: '请选择 .zip（mcp-servers 目录）备份文件', status: 'warning' })
      return
    }
    if (!result.ok) {
      Message.message({ message: result.error, status: 'error' })
      return
    }
    Message.message({
      message: `已导入 ${result.imported} 条（默认禁用，请审阅后启用）${
        result.skipped ? `，跳过 ${result.skipped} 条` : ''
      }`,
      status: 'success'
    })
    await loadScripts()
    await notifyReinject({})
  } catch (e: any) {
    Message.message({ message: e?.message || '导入失败', status: 'error' })
  }
}

function onSourceKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    tabNavArmed.value = true
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    void saveEdit()
    return
  }
  if (e.key === 'Tab') {
    // Esc 后 Tab / 带修饰键的 Tab：允许焦点移出编辑器
    if (tabNavArmed.value || e.ctrlKey || e.altKey) {
      tabNavArmed.value = false
      return
    }
    e.preventDefault()
    const el = sourceEditorRef.value
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const insert = '  '
    editForm.source = editForm.source.slice(0, start) + insert + editForm.source.slice(end)
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + insert.length
    })
    return
  }
  tabNavArmed.value = false
}

function syncScroll() {
  const el = sourceEditorRef.value
  const gutter = el?.parentElement?.querySelector('.line-gutter') as HTMLElement | null
  if (el && gutter) gutter.scrollTop = el.scrollTop
}

onMounted(loadScripts)
</script>

<template>
  <div class="mcp-scripts-tab">
    <div class="page-header">
      <div class="page-header-text">
        <p class="page-desc">
          在线编辑页面 WebMCP 脚本：左侧管理列表，右侧编辑源码。用
          <code>@match</code> 匹配站点并注册 <code>document.modelContext</code> 工具。导入/导出为
          <code>mcp-servers</code> 目录结构的 zip（与源码内置格式一致）。
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
            <span>新建脚本</span>
          </span>
        </TinyButton>
        <input
          ref="importInputRef"
          type="file"
          accept=".zip,application/zip,.json,application/json"
          class="hidden-input"
          @change="handleImportFile"
        />
      </div>
    </div>

    <div class="workspace">
      <!-- 左侧列表 -->
      <aside class="sidebar">
        <div class="sidebar-title">
          <component :is="IconFileComp" class="sidebar-title-icon" />
          <span>已安装脚本</span>
          <TinyTag v-if="scripts.length" size="small" type="info" effect="light" class="count-tag">
            {{ scripts.length }}
          </TinyTag>
        </div>

        <div v-if="loading" class="sidebar-empty">加载中…</div>
        <div v-else-if="scripts.length === 0" class="sidebar-empty">
          <p>暂无脚本</p>
          <TinyButton type="text" @click="openCreate">新建第一个</TinyButton>
        </div>
        <ul v-else class="script-list">
          <li
            v-for="row in scripts"
            :key="row.id"
            class="script-item"
            :class="{ active: selectedKey === row.id, disabled: !row.enabled }"
            @click="selectScript(row.id)"
          >
            <div class="script-item-switch" @click.stop>
              <TinyTooltip content="启用 / 停用" placement="top" effect="light">
                <TinySwitch
                  :model-value="row.enabled"
                  @change="(v: boolean) => toggleEnabled(row, v)"
                />
              </TinyTooltip>
            </div>
            <div class="script-item-body">
              <div class="script-item-name">
                <span class="name-text">{{ row.name }}</span>
                <TinyTag v-if="row.replacesBuiltIn" size="small" type="warning" effect="light">覆盖</TinyTag>
              </div>
              <div class="script-item-match" :title="row.matches.join('\n')">
                {{ row.matches[0] || '（无 match）' }}
              </div>
            </div>
          </li>
        </ul>

        <TinyAlert
          type="info"
          :closable="false"
          class="sidebar-alert"
          description="勾选「覆盖内置」时，匹配页将跳过源码内置 mcp-servers。"
        />
      </aside>

      <!-- 右侧编辑器 -->
      <section class="editor-pane">
        <div v-if="!isEditing" class="editor-placeholder">
          <component :is="IconCodeComp" class="placeholder-icon" />
          <h3>页面 MCP 脚本编辑器</h3>
          <p>从左侧选择脚本，或点击「新建脚本」。支持 Tab 缩进与 Ctrl/⌘+S 保存。</p>
          <TinyButton type="primary" @click="openCreate">
            <span class="toolbar-btn-inner">
              <component :is="IconAddComp" />
              <span>新建脚本</span>
            </span>
          </TinyButton>
        </div>

        <template v-else>
          <header class="editor-toolbar">
            <div class="editor-toolbar-left">
              <strong class="editor-title">{{ editorTitle }}</strong>
              <TinyTag v-if="isDirty" size="small" type="warning" effect="light">未保存</TinyTag>
              <TinyTag v-if="isNewDraft" size="small" type="info" effect="light">新草稿</TinyTag>
            </div>
            <div class="editor-toolbar-right">
              <TinyTooltip :content="metaExpanded ? '收起元数据' : '展开元数据'" placement="top" effect="light">
                <TinyButton size="mini" @click="toggleMeta">
                  <span class="toolbar-btn-inner">
                    <component :is="metaExpanded ? IconChevronUpComp : IconChevronDownComp" />
                    <span>元数据</span>
                  </span>
                </TinyButton>
              </TinyTooltip>
              <TinyButton size="mini" @click="closeEditor">
                <span class="toolbar-btn-inner">
                  <component :is="IconCloseComp" />
                  <span>关闭</span>
                </span>
              </TinyButton>
              <TinyButton size="mini" type="danger" plain class="btn-danger-plain" @click="confirmDelete">
                <span class="toolbar-btn-inner">
                  <component :is="IconDelComp" class="btn-danger-icon" />
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
            <TinyCollapseItem title="脚本元数据" name="meta">
              <TinyForm
                ref="editFormRef"
                :model="editForm"
                :rules="editRules"
                label-width="100px"
                class="meta-form"
              >
                <TinyFormItem label="名称" prop="name">
                  <TinyInput v-model="editForm.name" placeholder="脚本显示名称" />
                </TinyFormItem>
                <TinyFormItem label="描述">
                  <TinyInput v-model="editForm.description" placeholder="可选说明" />
                </TinyFormItem>
                <TinyFormItem label="@match" prop="matchesText">
                  <TinyInput
                    v-model="editForm.matchesText"
                    type="textarea"
                    :rows="3"
                    placeholder="每行一条，例如：*://*.example.com/*"
                  />
                </TinyFormItem>
                <TinyFormItem label="选项">
                  <div class="option-row">
                    <label class="option-item">
                      <TinySwitch v-model="editForm.enabled" />
                      <span>启用</span>
                    </label>
                    <label class="option-item">
                      <TinySwitch v-model="editForm.replacesBuiltIn" />
                      <span>覆盖内置 mcp-servers</span>
                      <TinyTooltip
                        content="开启后，匹配页面将不再注入源码内置 mcp-servers 域名脚本"
                        placement="top"
                        effect="light"
                      >
                        <span class="help-icon">
                          <component :is="IconHelpComp" />
                        </span>
                      </TinyTooltip>
                    </label>
                  </div>
                </TinyFormItem>
              </TinyForm>
            </TinyCollapseItem>
          </TinyCollapse>

          <div class="code-header">
            <span class="code-header-left">
              <component :is="IconCodeComp" />
              <span>源码 · JavaScript</span>
            </span>
            <span class="code-header-hint">Tab 缩进 · Esc 后 Tab 移出 · Ctrl/⌘+S 保存</span>
          </div>
          <div class="code-wrap">
            <pre class="line-gutter" aria-hidden="true">{{ gutterText }}</pre>
            <textarea
              ref="sourceEditorRef"
              v-model="editForm.source"
              class="source-editor"
              aria-label="脚本源码（JavaScript）"
              spellcheck="false"
              wrap="off"
              @keydown="onSourceKeydown"
              @scroll="syncScroll"
            />
          </div>
        </template>
      </section>
    </div>

    <TinyModal v-model="deleteVisible" title="删除确认" width="420" :show-footer="true">
      <p>确定删除脚本「{{ selectedScript?.name }}」吗？匹配页面将被刷新。</p>
      <template #footer>
        <TinyButton @click="deleteVisible = false">取消</TinyButton>
        <TinyButton type="danger" @click="doDelete">删除</TinyButton>
      </template>
    </TinyModal>

    <TinyModal v-model="discardVisible" title="未保存的更改" width="420" :show-footer="true">
      <p>当前脚本有未保存的修改，确定放弃吗？</p>
      <template #footer>
        <TinyButton @click="cancelDiscard">继续编辑</TinyButton>
        <TinyButton type="danger" @click="confirmDiscard">放弃更改</TinyButton>
      </template>
    </TinyModal>
  </div>
</template>

<style scoped>
.mcp-scripts-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  max-width: 640px;
}

.page-desc code {
  font-size: 12px;
  background: #f4f4f5;
  padding: 1px 4px;
  border-radius: 3px;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-btn :deep(button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* plain danger 按钮内图标默认偏浅，强制与文字同色 */
.btn-danger-plain :deep(.btn-danger-icon),
.btn-danger-plain .btn-danger-icon {
  color: #f56c6c !important;
  fill: currentColor !important;
}

.btn-danger-plain :deep(.btn-danger-icon svg),
.btn-danger-plain :deep(.btn-danger-icon path) {
  fill: currentColor !important;
  color: inherit;
}

.btn-danger-plain:hover :deep(.btn-danger-icon),
.btn-danger-plain:hover .btn-danger-icon {
  color: #f78989 !important;
}

.workspace {
  display: flex;
  height: calc(100vh - 200px);
  min-height: 520px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.sidebar-title-icon {
  font-size: 16px;
  color: #909399;
}

.count-tag {
  margin-left: auto;
}

.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #909399;
  font-size: 13px;
  padding: 24px;
}

.sidebar-empty p {
  margin: 0;
}

.script-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.script-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.script-item:hover {
  background: #f0f2f5;
}

.script-item.active {
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.script-item.disabled .name-text {
  color: #909399;
}

.script-item-switch {
  padding-top: 2px;
}

.script-item-body {
  flex: 1;
  min-width: 0;
}

.script-item-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-item-match {
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-alert {
  margin: 8px;
  flex-shrink: 0;
}

.sidebar-alert :deep(.tiny-alert) {
  padding: 8px 10px;
  font-size: 12px;
}

.editor-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.editor-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
  color: #606266;
}

.placeholder-icon {
  font-size: 48px;
  color: #c0c4cc;
}

.editor-placeholder h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.editor-placeholder p {
  margin: 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.6;
  color: #909399;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
  flex-shrink: 0;
}

.editor-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.editor-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.meta-collapse {
  flex-shrink: 0;
  border-bottom: 1px solid #ebeef5;
}

.meta-collapse :deep(.tiny-collapse-item__header) {
  background: #fff;
  padding-left: 14px;
  padding-right: 14px;
}

.meta-collapse :deep(.tiny-collapse-item__content) {
  padding: 4px 14px 12px;
}

.meta-form {
  max-width: 920px;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  min-height: 32px;
}

.option-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.help-icon {
  display: inline-flex;
  color: #909399;
  cursor: help;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.code-header-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.code-header-hint {
  color: #909399;
  font-size: 11px;
}

.code-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  background: #1e1e1e;
  overflow: hidden;
}

.line-gutter {
  flex-shrink: 0;
  width: 48px;
  overflow: hidden;
  margin: 0;
  background: #252526;
  color: #858585;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 13px;
  line-height: 1.55;
  padding: 12px 8px 12px 4px;
  text-align: right;
  user-select: none;
  white-space: pre;
  box-sizing: border-box;
}

.source-editor {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 12px 14px;
  margin: 0;
  background: #1e1e1e;
  color: #d4d4d4;
  caret-color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 13px;
  line-height: 1.55;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

.hidden-input {
  display: none;
}

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
  }

  .workspace {
    flex-direction: column;
    height: auto;
    min-height: 0;
  }

  .sidebar {
    width: 100%;
    max-height: 240px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .code-wrap {
    min-height: 420px;
  }

  .editor-toolbar {
    flex-wrap: wrap;
  }
}
</style>
