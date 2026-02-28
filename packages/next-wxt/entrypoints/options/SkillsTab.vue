<script setup lang="ts">
/**
 * Skills 管理标签页
 * 使用 TinyVue Tree + Icon 展示 skills 目录树
 * 支持：编辑、重命名、添加 skill、添加子文件夹、删除
 * 使用 next-sdk 的 parseSkillFrontMatter 解析并展示技能 meta
 */
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
import { skillMdModules } from '@/skills'
import { parseSkillFrontMatter } from '@opentiny/next-sdk'
import { modulesToTree, type SkillsTreeNode } from './utils/skills-tree'
import {
  getSkillsOverrides,
  setSkillOverride,
  removeSkillOverride,
  removeSkillOverrideRecursive,
  renameSkillFolder,
  renameSkillFile,
  hasBuiltInDescendants,
  isUserAddedPath
} from './utils/skills-storage'
import JSZip from 'jszip'
// TinyVue Icon 是函数，需执行后得到组件再使用
import {
  iconEdit,
  iconReplace,
  iconDel,
  iconAdd,
  iconFolder,
  iconFiletext,
  iconPlusSquare,
  iconDownload
} from '@opentiny/vue-icon'
// TinyVue Form 用于添加对话框的表单校验
import { Form as TinyForm } from '@opentiny/vue'

const IconEditComp = iconEdit()
const IconReplaceComp = iconReplace() // 重命名图标，与编辑区分
const IconDelComp = iconDel()
const IconAddComp = iconAdd()
const IconFolderComp = iconFolder()
const IconFiletextComp = iconFiletext()
const IconPlusSquareComp = iconPlusSquare()
const IconDownloadComp = iconDownload()

// 合并 built-in 与用户覆盖，用于构建树
const mergedModules = computed<Record<string, string>>(() => {
  const base = { ...skillMdModules }
  Object.assign(base, overrides.value)
  return base
})

// built-in 路径集合，用于判断是否为用户新增
const builtInPaths = computed(() => new Set(Object.keys(skillMdModules)))

// 用户覆盖的 skills（从 storage 加载）
const overrides = ref<Record<string, string>>({})

// 树形数据
const treeData = computed(() => modulesToTree(mergedModules.value))

// 当前选中的节点
const currentNodeKey = ref<string>('')

// 文件编辑对话框
const editDialogVisible = ref(false)
const editingNode = ref<SkillsTreeNode | null>(null)
const editContent = ref('')

// 重命名对话框
const renameDialogVisible = ref(false)
const renamingNode = ref<SkillsTreeNode | null>(null)
const renameFormData = reactive({ renameName: '' })
const renameFormRef = ref<{ validate: () => Promise<boolean>; clearValidate?: () => void } | null>(null)
const renameError = ref('') // 异步错误（如目标路径已存在）

// 添加 skill/子文件夹/文件 对话框
const addDialogVisible = ref(false)
const addParentNode = ref<SkillsTreeNode | null>(null)
const addType = ref<'file' | 'folder' | 'fileInFolder'>('file') // file=根skill, folder=子文件夹, fileInFolder=文件夹下添加文件
const addFormData = reactive({ addName: '' })
const addFormRef = ref<{ validate: () => Promise<boolean>; clearValidate?: () => void } | null>(null)

// 删除确认
const deleteDialogVisible = ref(false)
const deletingNode = ref<SkillsTreeNode | null>(null)

// 加载用户覆盖
async function loadOverrides() {
  overrides.value = await getSkillsOverrides()
}

// 导出备份：将 skills 打包为 zip，解压后即 skills 文件夹结构，避免清除缓存后丢失
async function downloadBackup() {
  const data = mergedModules.value
  const fileEntries = Object.entries(data).filter(([path]) => !path.endsWith('/'))
  if (fileEntries.length === 0) {
    alert('暂无数据可导出')
    return
  }
  const zip = new JSZip()
  for (const [path, content] of fileEntries) {
    const zipPath = path.replace(/^\.\//, '')
    zip.file(zipPath, content)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skills-backup-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

// 打开文件编辑
function openEditFile(node: SkillsTreeNode) {
  if (node.isFolder) return
  editingNode.value = node
  editContent.value = overrides.value[node.path] ?? node.content ?? ''
  editDialogVisible.value = true
}

// 保存文件内容到 storage
// 仅当为内置文件且内容恢复原样时移除 override；用户新增文件清空内容时仍保存，不删除
async function saveFileContent() {
  if (!editingNode.value) return
  const path = editingNode.value.path
  const isBuiltIn = Object.prototype.hasOwnProperty.call(skillMdModules, path)
  if (isBuiltIn && editContent.value === skillMdModules[path]) {
    await removeSkillOverride(path)
  } else {
    await setSkillOverride(path, editContent.value)
  }
  await loadOverrides()
  editDialogVisible.value = false
  editingNode.value = null
  notifyReload()
}

// 打开重命名对话框（文件夹或文件）
async function openRename(node: SkillsTreeNode) {
  if (!canRename(node)) {
    alert(node.isFolder ? '内置技能文件夹无法重命名' : '内置技能文件无法重命名，仅可重命名用户新增的文件')
    return
  }
  renamingNode.value = node
  renameFormData.renameName = node.label
  renameError.value = ''
  renameDialogVisible.value = true
  await nextTick()
  renameFormRef.value?.clearValidate?.()
}

// 重命名表单校验规则（根据节点类型动态生成）
const renameFormRules = computed(() => {
  if (renamingNode.value?.isFolder) {
    return {
      renameName: [
        { required: true, message: '请输入文件夹名称', trigger: 'blur' },
        {
          pattern: /^[a-zA-Z0-9_-]+$/,
          message: '文件夹名称只能包含字母、数字、下划线、中划线',
          trigger: 'blur'
        }
      ]
    }
  }
  return {
    renameName: [
      { required: true, message: '请输入文件名', trigger: 'blur' },
      {
        pattern: /^[a-zA-Z0-9_.-]+$/,
        message: '文件名只能包含字母、数字、下划线、中划线、点',
        trigger: 'blur'
      },
      {
        pattern: /\.\w+$/,
        message: '文件名必须带后缀名，如 .md、.json、.xml',
        trigger: 'blur'
      }
    ]
  }
})

// 执行重命名：先校验表单，通过后调用 storage 方法
async function saveRename() {
  const node = renamingNode.value
  if (!node) return
  const newName = renameFormData.renameName.trim()
  if (newName === node.label) {
    renameDialogVisible.value = false
    renamingNode.value = null
    return
  }
  try {
    await renameFormRef.value?.validate()
  } catch {
    return // 校验失败，表单会显示错误信息
  }
  renameError.value = ''
  try {
    if (node.isFolder) {
      await renameSkillFolder(node.path, newName)
    } else {
      await renameSkillFile(node.path, newName)
    }
  } catch (e: any) {
    renameError.value = e?.message || '重命名失败'
    return
  }
  await loadOverrides()
  renameDialogVisible.value = false
  renamingNode.value = null
  notifyReload()
}

// 判断节点是否可重命名
// 文件夹：仅无内置内容的用户文件夹可重命名
// 文件：仅用户新增的文件可重命名，但 SKILL.md 按规范不可重命名
function canRename(node: SkillsTreeNode): boolean {
  if (node.isFolder) {
    return !hasBuiltInDescendants(node.path, builtInPaths.value)
  }
  // SKILL.md 为规范命名，不允许重命名
  if (node.label === 'SKILL.md') return false
  return isUserAddedPath(node.path, builtInPaths.value)
}

// 添加表单校验规则（根据 addType 动态生成）
const addFormRules = computed(() => {
  if (addType.value === 'fileInFolder') {
    return {
      addName: [
        { required: true, message: '请输入文件名', trigger: 'blur' },
        {
          pattern: /^[a-zA-Z0-9_.-]+$/,
          message: '文件名只能包含字母、数字、下划线、中划线、点',
          trigger: 'blur'
        },
        {
          pattern: /\.\w+$/,
          message: '文件名必须带后缀名，如 .md、.json、.xml、.js',
          trigger: 'blur'
        }
      ]
    }
  }
  if (addType.value === 'folder') {
    return {
      addName: [
        { required: true, message: '请输入文件夹名称', trigger: 'blur' },
        {
          pattern: /^[a-zA-Z0-9_-]+$/,
          message: '名称只能包含字母、数字、下划线、中划线',
          trigger: 'blur'
        }
      ]
    }
  }
  return {
    addName: [
      { required: true, message: '请输入 Skill 名称', trigger: 'blur' },
      {
        pattern: /^[a-zA-Z0-9_-]+$/,
        message: '名称只能包含字母、数字、下划线、中划线',
        trigger: 'blur'
      }
    ]
  }
})

// 添加时显示错误（重复路径等）
function showAddError(msg: string) {
  alert(msg)
}

// 打开添加对话框
async function openAdd(parent: SkillsTreeNode | null, type: 'file' | 'folder' | 'fileInFolder') {
  addParentNode.value = parent
  addType.value = type
  addFormData.addName = ''
  addDialogVisible.value = true
  await nextTick()
  addFormRef.value?.clearValidate?.()
}

// 添加对话框确认（校验不通过不关闭弹窗，仅成功时关闭）
async function handleAddConfirm() {
  await saveAdd()
}

// 保存添加（先校验表单，通过后再执行；校验失败不关闭弹窗）
async function saveAdd() {
  try {
    await addFormRef.value?.validate()
  } catch {
    return // 校验失败，表单会显示错误信息
  }
  const name = addFormData.addName.trim()
  const parent = addParentNode.value

  if (addType.value === 'fileInFolder') {
    const basePath = parent?.isFolder ? parent.path.replace(/\/$/, '') : ''
    if (!basePath) return
    const filePath = `${basePath}/${name}`
    if (mergedModules.value[filePath] !== undefined) {
      showAddError('同名文件已存在')
      return
    }
    const content = name.toLowerCase().endsWith('.md')
      ? `---
name: ${name.replace(/\.md$/i, '')}
description: 请填写技能描述
---

# ${name.replace(/\.md$/i, '')}

请在此编写技能内容。
`
      : ''
    await setSkillOverride(filePath, content)
  } else if (addType.value === 'folder') {
    const basePath = parent?.isFolder ? parent.path.replace(/\/$/, '') : ''
    const folderPath = basePath ? `${basePath}/${name}` : `./${name}`
    const folderKey = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
    const prefix = folderPath.replace(/\/$/, '') + '/'
    if (Object.keys(mergedModules.value).some((p) => p === folderKey || p.startsWith(prefix))) {
      showAddError('同名文件夹已存在')
      return
    }
    await setSkillOverride(folderKey, '')
  } else {
    // 根级 skill：创建 SKILL.md
    const folderPath = `./${name}`
    const filePath = `${folderPath}/SKILL.md`
    if (mergedModules.value[filePath] !== undefined) {
      showAddError('该 Skill 已存在')
      return
    }
    const template = `---
name: ${name}
description: 请填写技能描述
---

# ${name}

请在此编写技能内容。
`
    await setSkillOverride(filePath, template)
  }
  await loadOverrides()
  addDialogVisible.value = false
  addParentNode.value = null
  notifyReload()
}

// 打开删除确认
function openDelete(node: SkillsTreeNode) {
  deletingNode.value = node
  deleteDialogVisible.value = true
}

// 执行删除
async function confirmDelete() {
  const node = deletingNode.value
  if (!node) return
  const path = node.path

  if (node.isFolder) {
    if (!hasBuiltInDescendants(path, builtInPaths.value)) {
      await removeSkillOverrideRecursive(path)
    } else {
      alert('内置技能文件夹无法删除，仅可删除其下用户新增的文件')
      deleteDialogVisible.value = false
      deletingNode.value = null
      return
    }
  } else {
    await removeSkillOverride(path)
  }
  await loadOverrides()
  deleteDialogVisible.value = false
  deletingNode.value = null
  notifyReload()
}

// 判断节点是否可删除
// 文件夹：仅无内置内容的用户文件夹可删（含子文件夹、子文件时递归删除，同 Windows）
// 文件：均可删（用户新增则移除，built-in 则还原）
function canDelete(node: SkillsTreeNode): boolean {
  if (node.isFolder) {
    return !hasBuiltInDescendants(node.path, builtInPaths.value)
  }
  return true
}

function notifyReload() {
  void browser.runtime.sendMessage({ type: 'reload-sidepanel' }).catch(() => {
    // 忽略 Promise 拒绝（如 sidepanel 未打开）
  })
}

onMounted(() => {
  loadOverrides()
})
</script>

<template>
  <div class="skills-tab">
    <div class="skills-header">
      <p class="skills-desc">管理 skills 目录下的技能文件。修改保存到本地缓存，建议定期导出备份。</p>
    </div>
    <div class="tree-toolbar">
      <TinyButton class="toolbar-btn" @click="openAdd(null, 'file')">
        <span class="toolbar-btn-inner">
          <component :is="IconAddComp" />
          <span>添加 skill</span>
        </span>
      </TinyButton>
      <TinyButton class="toolbar-btn" @click="downloadBackup">
        <span class="toolbar-btn-inner">
          <component :is="IconDownloadComp" />
          <span>导出备份</span>
        </span>
      </TinyButton>
    </div>
    <div class="tree-wrapper">
      <TinyTree
        v-if="treeData.length > 0"
        :data="treeData"
        :props="{ label: 'label', children: 'children' }"
        node-key="id"
        default-expand-all
        :highlight-current="true"
        :current-node-key="currentNodeKey"
        @node-click="(node: { data?: SkillsTreeNode }) => (currentNodeKey = node?.data?.id ?? '')"
      >
        <!-- 节点前置图标：文件夹用 folder，文件用 filetext -->
        <template #prefix="{ node }">
          <span class="tree-node-prefix-icon">
            <component :is="node?.data?.isFolder ? IconFolderComp : IconFiletextComp" />
          </span>
        </template>
        <template #operation="{ node }">
          <span v-if="node?.data" class="node-actions">
            <span
              v-if="node.data.isFolder"
              class="icon-btn"
              title="添加文件"
              @click.stop="openAdd(node.data, 'fileInFolder')"
            >
              <component :is="IconPlusSquareComp" />
            </span>
            <span
              v-if="node.data.isFolder"
              class="icon-btn"
              title="添加子文件夹"
              @click.stop="openAdd(node.data, 'folder')"
            >
              <component :is="IconFolderComp" />
            </span>
            <span v-if="canRename(node.data)" class="icon-btn" title="重命名" @click.stop="openRename(node.data)">
              <component :is="IconReplaceComp" />
            </span>
            <span v-if="!node.data.isFolder" class="icon-btn" title="编辑" @click.stop="openEditFile(node.data)">
              <component :is="IconEditComp" />
            </span>
            <span
              v-if="canDelete(node.data)"
              class="icon-btn icon-btn-danger"
              title="删除"
              @click.stop="openDelete(node.data)"
            >
              <component :is="IconDelComp" />
            </span>
          </span>
        </template>
      </TinyTree>
      <div v-else class="empty-tree">
        暂无 skills 文件，点击上方按钮添加，或在 <code>packages/next-wxt/skills/</code> 目录下添加 SKILL.md
      </div>
    </div>

    <!-- 文件编辑对话框 -->
    <TinyModal
      v-model="editDialogVisible"
      :title="editingNode ? `编辑 ${editingNode.label}` : '编辑文件'"
      width="720px"
      :append-to-body="true"
      :show-footer="true"
      @confirm="saveFileContent"
      @close="editDialogVisible = false"
    >
      <div class="edit-dialog-body">
        <div v-if="editingNode" class="skill-meta">
          <p><strong>技能名：</strong>{{ parseSkillFrontMatter(editContent)?.name }}</p>
          <p><strong>描述：</strong>{{ parseSkillFrontMatter(editContent)?.description }}</p>
        </div>
        <textarea
          v-model="editContent"
          class="skill-content-textarea"
          placeholder="文件内容（支持 Markdown）"
          spellcheck="false"
        />
      </div>
    </TinyModal>

    <!-- 重命名对话框（使用 TinyForm 校验，校验不通过不关闭；取消按钮可关闭） -->
    <TinyModal
      v-model="renameDialogVisible"
      :title="renamingNode?.isFolder ? '重命名文件夹' : '重命名文件'"
      width="400px"
      :append-to-body="true"
      :show-footer="true"
      @close="renameDialogVisible = false"
    >
      <div class="rename-dialog-body">
        <TinyForm ref="renameFormRef" :model="renameFormData" :rules="renameFormRules" label-position="top">
          <TinyFormItem :label="renamingNode?.isFolder ? '文件夹名称' : '文件名（含后缀）'" prop="renameName">
            <TinyInput
              v-model="renameFormData.renameName"
              :placeholder="renamingNode?.isFolder ? '字母、数字、下划线、中划线' : '如 guide.md、config.json'"
              clearable
            />
          </TinyFormItem>
        </TinyForm>
        <p v-if="renameError" class="rename-error">{{ renameError }}</p>
        <p class="rename-tip">
          注：重命名会更新本地缓存中的路径，仅对用户新增的{{ renamingNode?.isFolder ? '文件夹' : '文件' }}生效。
        </p>
      </div>
      <template #footer>
        <div class="rename-dialog-footer">
          <TinyButton @click="renameDialogVisible = false">取消</TinyButton>
          <TinyButton type="primary" @click="saveRename">确认</TinyButton>
        </div>
      </template>
    </TinyModal>

    <!-- 添加 skill/子文件夹/文件 对话框（使用 TinyForm 校验，校验不通过不关闭） -->
    <TinyModal
      v-model="addDialogVisible"
      :title="addType === 'folder' ? '添加子文件夹' : addType === 'fileInFolder' ? '添加文件' : '添加 skill'"
      width="520px"
      :append-to-body="true"
      :show-footer="true"
      @close="addDialogVisible = false"
    >
      <div class="add-dialog-body">
        <TinyForm ref="addFormRef" :model="addFormData" :rules="addFormRules" label-position="top">
          <TinyFormItem
            :label="
              addType === 'folder' ? '文件夹名称' : addType === 'fileInFolder' ? '文件名(必须带后缀名)' : 'Skill 名称'
            "
            prop="addName"
          >
            <TinyInput
              v-model="addFormData.addName"
              :placeholder="
                addType === 'folder'
                  ? '字母、数字、下划线、中划线'
                  : addType === 'fileInFolder'
                    ? '如 guide.md、config.json、data.xml'
                    : '字母、数字、下划线、中划线'
              "
              clearable
            />
          </TinyFormItem>
        </TinyForm>
        <p v-if="addType === 'fileInFolder'" class="add-file-tip">
          .md 文件会自动生成技能文档模板（name、description）
        </p>
      </div>
      <template #footer>
        <div class="add-dialog-footer">
          <TinyButton @click="addDialogVisible = false">取消</TinyButton>
          <TinyButton type="primary" @click="handleAddConfirm">确认</TinyButton>
        </div>
      </template>
    </TinyModal>

    <!-- 删除确认对话框 -->
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
        <p v-if="deletingNode">
          确定要删除「{{ deletingNode.label }}」{{ deletingNode.isFolder ? '及其子项' : '' }}吗？
        </p>
      </div>
    </TinyModal>
  </div>
</template>

<style scoped>
.skills-tab {
  padding: 0 4px;
}

.skills-header {
  margin-bottom: 12px;
}

.skills-desc {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

/* 工具栏主按钮：TinyButton 包裹，图标+文字上下居中 */
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

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #ecf5ff;
  color: #409eff;
}

.icon-btn-danger:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.tree-wrapper {
  min-height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

/* 节点前置图标：文件夹/文件区分 */
.tree-node-prefix-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 6px;
  color: #909399;
  font-size: 16px;
}

.node-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.8;
}

.node-actions:hover {
  opacity: 1;
}

.node-actions .icon-btn {
  width: 24px;
  height: 24px;
}

.empty-tree {
  padding: 32px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.empty-tree code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.edit-dialog-body,
.rename-dialog-body,
.add-dialog-body,
.delete-dialog-body {
  padding: 8px 0;
}

/* 添加/重命名对话框：表单 label 左对齐，避免大片空白 */
.add-dialog-body :deep([class*='form-item'] [class*='label']),
.rename-dialog-body :deep([class*='form-item'] [class*='label']) {
  text-align: left;
}

.skill-meta {
  margin-bottom: 12px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}

.skill-meta p {
  margin: 4px 0;
}

.skill-content-textarea {
  width: 100%;
  min-height: 280px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1.6;
  resize: vertical;
}

.skill-content-textarea:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.form-item {
  margin-bottom: 12px;
}

.form-item-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.rename-error {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  background: #fef0f0;
  color: #c45656;
  border: 1px solid #fbc4c4;
}

.rename-tip,
.add-file-tip,
.delete-dialog-body p {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
}

/* 添加/重命名对话框底部按钮 */
.add-dialog-footer,
.rename-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
