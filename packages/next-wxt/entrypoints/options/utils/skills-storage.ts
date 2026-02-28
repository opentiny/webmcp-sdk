/**
 * Skills 覆盖存储
 * 浏览器插件无法写入扩展包内文件，用户修改的 skills 存入本地 storage
 * 供 TinyRemoter 统一读取时合并使用
 */

import { storage } from '@wxt-dev/storage'

/** 存储键：用户对 skills 的修改（覆盖/新增） */
export const SKILLS_OVERRIDES_KEY = 'local:skills-overrides'

export type SkillsOverrides = Record<string, string>

/**
 * 获取用户覆盖的 skills 内容
 * 使用 getItem 而非 getMeta：setMeta 会合并属性，删除时无法真正移除项
 * 兼容旧版：若 getItem 为空但 getMeta 有数据，则迁移到 getItem
 */
export async function getSkillsOverrides(): Promise<SkillsOverrides> {
  try {
    let data = (await storage.getItem(SKILLS_OVERRIDES_KEY)) as SkillsOverrides | undefined
    if (!data || typeof data !== 'object') {
      const legacy = (await storage.getMeta(SKILLS_OVERRIDES_KEY)) as SkillsOverrides | undefined
      if (legacy && typeof legacy === 'object' && Object.keys(legacy).length > 0) {
        await storage.setItem(SKILLS_OVERRIDES_KEY, legacy)
        data = legacy
      } else {
        data = {}
      }
    }
    return data
  } catch {
    return {}
  }
}

/**
 * 保存用户覆盖的 skills 内容
 * 使用 setItem 完全替换，确保删除操作能生效
 */
export async function setSkillsOverrides(overrides: SkillsOverrides): Promise<void> {
  await storage.setItem(SKILLS_OVERRIDES_KEY, overrides)
}

/**
 * 设置单个文件的覆盖内容
 */
export async function setSkillOverride(path: string, content: string): Promise<void> {
  const current = await getSkillsOverrides()
  current[path] = content
  await setSkillsOverrides(current)
}

/**
 * 删除单个文件的覆盖（或用户新增的文件）
 * 若路径仅在 overrides 中（非 built-in），删除后该路径将不再出现在树中
 */
export async function removeSkillOverride(path: string): Promise<void> {
  const current = await getSkillsOverrides()
  delete current[path]
  await setSkillsOverrides(current)
}

/**
 * 检查路径是否为用户新增（仅存在于 overrides，不在 built-in 中）
 */
export function isUserAddedPath(path: string, builtInPaths: Set<string>): boolean {
  return !builtInPaths.has(path)
}

/**
 * 检查文件夹是否包含内置文件（任一 built-in 路径在该文件夹下）
 * 用于判断文件夹是否可删除/重命名：仅无内置内容的用户文件夹可操作
 */
export function hasBuiltInDescendants(folderPath: string, builtInPaths: Set<string>): boolean {
  const prefix = folderPath.replace(/\/$/, '') + '/'
  for (const p of builtInPaths) {
    if (p.startsWith(prefix)) return true
  }
  return false
}

/**
 * 删除路径及其所有子路径（用于删除文件夹，含子文件夹、子文件时递归删除，同 Windows）
 * 仅删除 overrides 中的项
 */
export async function removeSkillOverrideRecursive(folderPath: string): Promise<void> {
  const current = await getSkillsOverrides()
  const prefix = folderPath.replace(/\/$/, '') + '/'
  for (const p of Object.keys(current)) {
    if (p === folderPath || p.startsWith(prefix)) {
      delete current[p]
    }
  }
  await setSkillsOverrides(current)
}

/**
 * 重命名文件夹（仅影响 overrides 中的路径）
 * 将 oldFolderPath 及其所有子路径（子文件夹、子文件）替换为新文件夹名，同 Windows
 * @param oldFolderPath 原文件夹路径，如 ./parent/child 或 ./parent/child/
 * @param newLabel 新文件夹名称
 */
export async function renameSkillFolder(oldFolderPath: string, newLabel: string): Promise<void> {
  const current = await getSkillsOverrides()
  const oldBase = oldFolderPath.replace(/\/$/, '')
  const oldPrefix = oldBase + '/'

  // 计算新路径前缀：将路径最后一段替换为 newLabel
  const parts = oldBase.replace(/^\.\//, '').split('/').filter(Boolean)
  parts[parts.length - 1] = newLabel
  const newPathPrefix = './' + parts.join('/')

  const updates: Array<[string, string]> = []
  const toDelete: string[] = []

  for (const p of Object.keys(current)) {
    if (p === oldBase || p.startsWith(oldPrefix)) {
      const suffix = p === oldBase ? '' : p.slice(oldPrefix.length)
      // 空文件夹的 key 以 / 结尾，重命名后需保留尾斜杠
      const newPath = suffix ? `${newPathPrefix}/${suffix}` : (p.endsWith('/') ? `${newPathPrefix}/` : newPathPrefix)
      updates.push([newPath, current[p]])
      toDelete.push(p)
    }
  }

  // 先写入新路径，再删除旧路径
  for (const [newPath, content] of updates) {
    current[newPath] = content
  }
  for (const p of toDelete) {
    delete current[p]
  }
  await setSkillsOverrides(current)
}

/**
 * 重命名文件（仅影响 overrides 中的路径）
 * 将 oldFilePath 重命名为新文件名 newFileName（同目录下）
 * @param oldFilePath 原文件路径，如 ./folder/file.md
 * @param newFileName 新文件名（含后缀），如 new-file.md
 */
export async function renameSkillFile(oldFilePath: string, newFileName: string): Promise<void> {
  const current = await getSkillsOverrides()
  const content = current[oldFilePath]
  if (content === undefined) return
  // 计算新路径：同目录下替换文件名
  const lastSlash = oldFilePath.lastIndexOf('/')
  const parentDir = lastSlash >= 0 ? oldFilePath.slice(0, lastSlash + 1) : './'
  const newPath = parentDir + newFileName
  current[newPath] = content
  delete current[oldFilePath]
  await setSkillsOverrides(current)
}
