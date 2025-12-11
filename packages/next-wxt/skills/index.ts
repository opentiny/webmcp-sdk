/**
 * Skill 自动发现和加载逻辑
 * 使用 import.meta.glob 自动发现所有 skill 目录
 */

import type { Skill, SkillMeta } from './types'
import { storage } from '@wxt-dev/storage'

// 自动发现所有 skill 目录下的 index.ts
const skillModules = import.meta.glob('./*/index.ts', { eager: true })

/**
 * 所有已加载的 skill 列表
 */
const skills: Skill[] = []

// 遍历所有模块，加载 skill
for (const [path, module] of Object.entries(skillModules)) {
  try {
    // 从路径中提取 skill 名称：'./code-expert/index.ts' -> 'code-expert'
    const skillNameMatch = path.match(/^\.\/(.+)\/index\.ts$/)
    if (skillNameMatch) {
      const skillName = skillNameMatch[1]
      const skillExport = (module as any).default || module

      // 验证 skill 导出格式
      if (skillExport && skillExport.meta && skillExport.prompt) {
        skills.push({
          meta: skillExport.meta,
          prompt: skillExport.prompt,
          tools: skillExport.tools || []
        })
        console.log(`[Skill System] ✓ Skill 加载成功: ${skillExport.meta.label} (${skillName})`)
      } else {
        console.warn(`[Skill System] ✗ Skill 格式错误: ${skillName}`, skillExport)
      }
    }
  } catch (error) {
    console.error(`[Skill System] ✗ Skill 加载失败: ${path}`, error)
  }
}

// 将对象转换为数组（处理存储时数组被转换为对象的情况）
function normalizeToArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value
  }
  // 如果是对象，检查是否有数字键，如果有则转换为数组
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    // 检查是否所有键都是数字（类似数组索引）
    const isArrayLike = keys.length > 0 && keys.every((key) => /^\d+$/.test(key))
    if (isArrayLike) {
      return Object.values(value)
    }
  }
  return []
}

// 遍历所有用户自定义prompt
try {
  const storageData = (await storage.getMeta('local:ai-extension-configs')) || { list: [] }
  // 确保 customConfig 是数组类型，处理对象格式的数据
  const customConfig = normalizeToArray(storageData?.list)
  customConfig.forEach((skill) => {
    const { name, label, description, prompts, requireDomains, tools } = skill
    skills.push({
      meta: { name, label, description, requiredDomains: requireDomains },
      prompt: prompts,
      tools: tools || []
    })
  })
} catch (error) {
  console.error('[Skill System] ✗ 加载自定义配置失败:', error)
}

/**
 * 获取所有 skill
 * @returns 所有 skill 的列表
 */
export function getAllSkills(): Skill[] {
  return skills
}

/**
 * 根据名称获取 skill
 * @param name - Skill 的唯一标识符
 * @returns 匹配的 skill，如果没有找到则返回 null
 */
export function getSkillByName(name: string): Skill | null {
  return skills.find((skill) => skill.meta.name === name) || null
}

/**
 * 根据别名获取 skill
 * @param alias - Skill 的别名或显示名称
 * @returns 匹配的 skill，如果没有找到则返回 null
 */
export function getSkillByAlias(alias: string): Skill | null {
  const lowerAlias = alias.toLowerCase()
  return (
    skills.find(
      (skill) =>
        skill.meta.name.toLowerCase() === lowerAlias ||
        skill.meta.label.toLowerCase() === lowerAlias ||
        skill.meta.aliases?.some((a) => a.toLowerCase() === lowerAlias)
    ) || null
  )
}

/**
 * 根据名称列表获取多个 skill
 * @param names - Skill 名称或别名数组
 * @returns 匹配的 skill 列表
 */
export function getSkillsByNames(names: string[]): Skill[] {
  const result: Skill[] = []
  for (const name of names) {
    const skill = getSkillByAlias(name)
    if (skill) {
      result.push(skill)
    }
  }
  return result
}

/**
 * 获取所有 skill 的元信息列表（用于选择器）
 * @returns Skill 元信息列表
 */
export function getAllSkillMetas(): SkillMeta[] {
  return skills.map((skill) => skill.meta)
}

// 导出默认的 skill 列表
export default skills
