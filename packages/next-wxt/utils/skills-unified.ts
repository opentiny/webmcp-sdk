/**
 * Skills 统一读取入口
 * 合并：构建时注入的 skillMdModules + 用户在 Options 中的覆盖（storage）
 * TinyRemoter 应从此模块获取 skills，保证数据源一致
 */

import { skillMdModules } from '@/skills'
import { getSkillsOverrides } from '@/entrypoints/options/utils/skills-storage'

/** 合并后的 skills：built-in 优先，用户覆盖可覆盖同路径内容 */
export type UnifiedSkills = Record<string, string>

/**
 * 异步获取合并后的 skills（含用户覆盖）
 * Options 页保存后通过 reload-sidepanel 刷新 sidepanel，重新加载时即会读取最新覆盖
 */
export async function getUnifiedSkills(): Promise<UnifiedSkills> {
  // 过滤 built-in 中的空文件夹占位（路径以 / 结尾），与 overrides 处理一致
  const builtIn = Object.fromEntries(
    Object.entries(skillMdModules).filter(([k]) => !k.endsWith('/'))
  )
  try {
    const overrides = await getSkillsOverrides()
    if (overrides && Object.keys(overrides).length > 0) {
      // 排除空文件夹占位（路径以 / 结尾），仅用于树展示，不作为 skill 传给 Remoter
      const filtered = Object.fromEntries(Object.entries(overrides).filter(([k]) => !k.endsWith('/')))
      Object.assign(builtIn, filtered)
    }
  } catch {
    // 忽略存储读取失败
  }
  return builtIn
}
