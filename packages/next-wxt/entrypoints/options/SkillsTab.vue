<script setup lang="ts">
/**
 * Skills 管理标签页
 * 使用 TinyVue Tree + Icon 展示 skills 目录树
 * 支持：编辑、重命名、添加 skill、添加子文件夹、删除
 * 使用 next-sdk 的 parseSkillFrontMatter 解析并展示技能 meta
 */
import { ref, computed, onMounted } from 'vue'
import { skillMdModules } from '@/skills'
import { parseSkillFrontMatter } from '@opentiny/next-sdk'
import { modulesToTree, type SkillsTreeNode } from './utils/skills-tree'
import {
  getSkillsOverrides,
  setSkillOverride,
  removeSkillOverride,
  removeSkillOverrideRecursive,
  isUserAddedPath
} from './utils/skills-storage'
// TinyVue Icon 是函数，需执行后得到组件再使用
import { iconEdit, iconDel, iconAdd, iconFolder, iconFiletext } from '@opentiny/vue-icon'

const IconEditComp = iconEdit()
const IconDelComp = iconDel()
const IconAddComp = iconAdd()
const IconFolderComp = iconFolder()
const IconFiletextComp = iconFiletext()

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

// 文件夹重命名对话框
const renameDialogVisible = ref(false)
const renamingNode = ref<SkillsTreeNode | null>(null)
const renameValue = ref('')

// 添加 skill/子文件夹对话框
const addDialogVisible = ref(false)
const addParentNode = ref<SkillsTreeNode | null>(null)
const addType = ref<'file' | 'folder'>('file')
const addName = ref('')

// 删除确认
const deleteDialogVisible = ref(false)
const deletingNode = ref<SkillsTreeNode | null>(null)

// 加载用户覆盖
async function loadOverrides() {
  overrides.value = await getSkillsOverrides()
}

// 打开文件编辑
function openEditFile(node: SkillsTreeNode) {
  if (node.isFolder) return
  editingNode.value = node
  editContent.value = overrides.value[node.path] ?? node.content ?? ''
  editDialogVisible.value = true
}

// 保存文件内容到 storage
async function saveFileContent() {
  if (!editingNode.value) return
  const path = editingNode.value.path
  if (editContent.value === (skillMdModules[path] ?? '')) {
    await removeSkillOverride(path)
  } else {
    await setSkillOverride(path, editContent.value)
  }
  await loadOverrides()
  editDialogVisible.value = false
  editingNode.value = null
  notifyReload()
}

// 打开文件夹重命名
function openRenameFolder(node: SkillsTreeNode) {
  if (!node.isFolder) return
  renamingNode.value = node
  renameValue.value = node.label
  renameDialogVisible.value = true
}

async function saveRenameFolder() {
  renameDialogVisible.value = false
  renamingNode.value = null
}

// 打开添加对话框
function openAdd(parent: SkillsTreeNode | null, type: 'file' | 'folder') {
  addParentNode.value = parent
  addType.value = type
  addName.value = ''
  addDialogVisible.value = true
}

// 保存添加
async function saveAdd() {
  const name = addName.value.trim()
  if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    alert('名称只能包含字母、数字、下划线、中划线')
    return
  }
  const parent = addParentNode.value
  const basePath = parent?.isFolder ? parent.path.replace(/\/$/, '') : ''
  const folderPath = basePath ? `${basePath}/${name}` : `./${name}`

  if (addType.value === 'folder') {
    // 子文件夹：仅创建空文件夹节点，不生成任何文件；用于 reference 等存放 md/json/xml/js 等
    const folderKey = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
    await setSkillOverride(folderKey, '')
  } else {
    // 根级 skill：创建 SKILL.md
    const filePath = `${folderPath}/SKILL.md`
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
    if (isUserAddedPath(path, builtInPaths.value)) {
      await removeSkillOverrideRecursive(path, builtInPaths.value)
    } else {
      alert('内置技能文件夹无法删除，仅可删除其下用户新增的文件')
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
// 文件夹：仅用户新增的整个文件夹可删
// 文件：均可删（用户新增则移除，built-in 则还原）
function canDelete(node: SkillsTreeNode): boolean {
  if (node.isFolder) {
    return isUserAddedPath(node.path, builtInPaths.value)
  }
  return true
}

function notifyReload() {
  try {
    browser.runtime.sendMessage({ type: 'reload-sidepanel' })
  } catch {
    // 忽略
  }
}

onMounted(() => {
  loadOverrides()
})
</script>

<template>
  <div class="skills-tab">
    <div class="skills-header">
      <p class="skills-desc">
        管理 skills 目录下的技能文件。使用 next-sdk 的 getSkillOverviews、getSkillMdContent 查看技能。修改保存到本地缓存。
      </p>
    </div>
    <div class="tree-toolbar">
      <span class="icon-btn" title="添加根级 skill" @click="openAdd(null, 'file')">
        <component :is="IconAddComp" />
      </span>
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
              title="添加子文件夹"
              @click.stop="openAdd(node.data, 'folder')"
            >
              <component :is="IconFolderComp" />
            </span>
            <span
              v-if="node.data.isFolder"
              class="icon-btn"
              title="重命名"
              @click.stop="openRenameFolder(node.data)"
            >
              <component :is="IconEditComp" />
            </span>
            <span v-else class="icon-btn" title="编辑" @click.stop="openEditFile(node.data)">
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
        暂无 skills 文件，点击上方图标添加，或在 <code>packages/next-wxt/skills/</code> 目录下添加 SKILL.md
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
        <div v-if="editingNode && parseSkillFrontMatter(editContent)" class="skill-meta">
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

    <!-- 文件夹重命名对话框 -->
    <TinyModal
      v-model="renameDialogVisible"
      title="重命名文件夹"
      width="400px"
      :append-to-body="true"
      :show-footer="true"
      @confirm="saveRenameFolder"
      @close="renameDialogVisible = false"
    >
      <div class="rename-dialog-body">
        <div class="form-item">
          <label class="form-item-label">文件夹名称</label>
          <TinyInput v-model="renameValue" placeholder="请输入新名称" />
        </div>
        <p class="rename-tip">注：浏览器插件无法修改扩展包内文件路径，重命名仅影响显示。</p>
      </div>
    </TinyModal>

    <!-- 添加 skill/子文件夹对话框 -->
    <TinyModal
      v-model="addDialogVisible"
      :title="addType === 'folder' ? '添加子文件夹' : '添加 skill'"
      width="400px"
      :append-to-body="true"
      :show-footer="true"
      @confirm="saveAdd"
      @close="addDialogVisible = false"
    >
      <div class="add-dialog-body">
        <div class="form-item">
          <label class="form-item-label">{{ addType === 'folder' ? '文件夹名称' : 'Skill 名称' }}</label>
          <TinyInput v-model="addName" placeholder="字母、数字、下划线、中划线" />
        </div>
      </div>
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
  gap: 8px;
  margin-bottom: 12px;
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

.rename-tip,
.delete-dialog-body p {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
