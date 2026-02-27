/**
 * Skills 覆盖存储
 * 浏览器插件无法写入扩展包内文件，用户修改的 skills 存入本地 storage
 * 供 TinyRemoter 统一读取时合并使用
 */

import { storage } from '@wxt-dev/storage'

/** 存储键：用户对 skills 的修改（覆盖/新增） */
export const SKILLS_OVERRIDES_KEY = 'local:skills-overrides'

/** 存储键：文件夹重命名映射，key 为旧路径，value 为新路径 */
export const SKILLS_RENAME_MAP_KEY = 'local:skills-rename-map'

export type SkillsOverrides = Record<string, string>

/**
 * 获取用户覆盖的 skills 内容
 */
export async function getSkillsOverrides(): Promise<SkillsOverrides> {
  try {
    const data = (await storage.getMeta(SKILLS_OVERRIDES_KEY)) as SkillsOverrides | undefined
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/**
 * 保存用户覆盖的 skills 内容
 */
export async function setSkillsOverrides(overrides: SkillsOverrides): Promise<void> {
  await storage.setMeta(SKILLS_OVERRIDES_KEY, overrides)
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
export async function removeSkillOverrideRecursive(
  folderPath: string,
  builtInPaths: Set<string>
): Promise<void> {
  const current = await getSkillsOverrides()
  const prefix = folderPath.replace(/\/$/, '') + '/'
  for (const p of Object.keys(current)) {
    if (p === folderPath || p.startsWith(prefix)) {
      delete current[p]
    }
  }
  await setSkillsOverrides(current)
}
