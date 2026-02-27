/**
 * Skills 统一读取入口
 * 合并：构建时注入的 skillMdModules + 用户在 Options 中的覆盖（storage）
 * TinyRemoter 应从此模块获取 skills，保证数据源一致
 */

import { skillMdModules } from '@/skills'
import { storage } from '@wxt-dev/storage'

const SKILLS_OVERRIDES_KEY = 'local:skills-overrides'

/** 合并后的 skills：built-in 优先，用户覆盖可覆盖同路径内容 */
export type UnifiedSkills = Record<string, string>

/**
 * 异步获取合并后的 skills（含用户覆盖）
 * Options 页保存后通过 reload-sidepanel 刷新 sidepanel，重新加载时即会读取最新覆盖
 */
export async function getUnifiedSkills(): Promise<UnifiedSkills> {
  const builtIn = { ...skillMdModules }
  try {
    const overrides = (await storage.getMeta(SKILLS_OVERRIDES_KEY)) as Record<string, string> | undefined
    if (overrides && typeof overrides === 'object') {
      Object.assign(builtIn, overrides)
    }
  } catch {
    // 忽略存储读取失败
  }
  return builtIn
}
