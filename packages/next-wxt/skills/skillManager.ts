/**
 * Skill 管理器
 * 负责组合提示词、管理工具列表等功能
 */

import type { Skill } from './types'
import { getSkillsByNames } from './index'

/**
 * 组合多个 skill 的提示词
 * @param skillNames - Skill 名称或别名数组
 * @returns 组合后的提示词字符串
 */
export function combinePrompts(skillNames: string[]): string {
  const skills = getSkillsByNames(skillNames)

  if (skills.length === 0) {
    return ''
  }

  // 如果只有一个 skill，直接返回其提示词
  if (skills.length === 1) {
    return skills[0].prompt
  }

  // 多个 skill 时，组合提示词
  const prompts = skills.map((skill, index) => {
    const header = `## ${skill.meta.label}（专家 ${index + 1}）\n\n`
    return header + skill.prompt
  })

  const combinedHeader = `# 多专家协作模式\n\n你同时具备以下 ${skills.length} 位专家的能力，请根据用户需求选择合适的专家视角来回答问题：\n\n`
  return combinedHeader + prompts.join('\n\n---\n\n')
}

/**
 * 获取多个 skill 需要的所有工具列表（去重）
 * @param skillNames - Skill 名称或别名数组
 * @returns 工具名称数组（已去重）
 */
export function getToolsForSkills(skillNames: string[]): string[] {
  const skills = getSkillsByNames(skillNames)
  const toolSet = new Set<string>()

  for (const skill of skills) {
    if (skill.tools && Array.isArray(skill.tools)) {
      for (const tool of skill.tools) {
        toolSet.add(tool)
      }
    }
  }

  return Array.from(toolSet)
}

/**
 * 根据 skill 名称列表获取完整的 skill 信息
 * @param skillNames - Skill 名称或别名数组
 * @returns Skill 对象数组
 */
export function getSkillsInfo(skillNames: string[]): Skill[] {
  return getSkillsByNames(skillNames)
}

/**
 * 验证工具是否可用
 * @param toolName - 工具名称
 * @param availableTools - 可用的工具名称列表
 * @returns 是否可用
 */
export function isToolAvailable(toolName: string, availableTools: string[]): boolean {
  return availableTools.includes(toolName)
}

/**
 * 过滤出可用的工具
 * @param skillNames - Skill 名称或别名数组
 * @param availableTools - 可用的工具名称列表
 * @returns 可用的工具名称数组
 */
export function getAvailableToolsForSkills(skillNames: string[], availableTools: string[]): string[] {
  const requiredTools = getToolsForSkills(skillNames)
  return requiredTools.filter((tool) => isToolAvailable(tool, availableTools))
}
