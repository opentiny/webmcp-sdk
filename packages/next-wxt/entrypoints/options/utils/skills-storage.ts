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
 * 删除路径及其所有子路径（用于删除文件夹）
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
