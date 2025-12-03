/**
 * Skill 桥接工具
 * 用于在 sidepanel 和 remoter 之间传递 skill 相关信息
 */

import { combinePrompts } from '@/skills/skillManager'
import { getSkillByAlias } from '@/skills'

/**
 * 从 remoter 获取 skill 列表
 * @returns Promise<Skill[]> skill 列表
 */
export async function getSkillsListFromSidepanel(): Promise<
  Array<{
    label: string
    value: string
    aliases?: string[]
    description?: string
    icon?: string
    category?: string
  }>
> {
  return new Promise((resolve) => {
    // 发送消息到 sidepanel 获取 skill 列表
    browser.runtime.sendMessage(
      {
        type: 'get-skills-list',
        direction: 'side->side',
        data: {}
      },
      (response: any) => {
        if (browser.runtime.lastError) {
          console.error('[Skill Bridge] 获取 skill 列表失败:', browser.runtime.lastError)
          resolve([])
        } else {
          resolve(response?.skills || [])
        }
      }
    )
  })
}

/**
 * 激活指定的 skills
 * @param skillNames skill 名称或别名数组
 */
export async function activateSkills(skillNames: string[]): Promise<void> {
  // 将别名转换为实际的 skill name
  const actualSkillNames: string[] = []
  for (const nameOrAlias of skillNames) {
    const skill = getSkillByAlias(nameOrAlias)
    if (skill) {
      actualSkillNames.push(skill.meta.name)
    }
  }

  // 发送消息到 sidepanel 激活 skills
  browser.runtime.sendMessage(
    {
      type: 'activate-skills',
      direction: 'side->side',
      data: { skillNames: actualSkillNames }
    },
    (response: any) => {
      if (browser.runtime.lastError) {
        console.error('[Skill Bridge] 激活 skills 失败:', browser.runtime.lastError)
      } else {
        console.log('[Skill Bridge] Skills 激活成功:', actualSkillNames)
      }
    }
  )
}

/**
 * 根据 skill 名称列表获取组合后的提示词
 * @param skillNames skill 名称或别名数组
 * @param basePrompt 基础提示词
 * @returns 组合后的提示词
 */
export function getCombinedPrompt(skillNames: string[], basePrompt: string = ''): string {
  if (skillNames.length === 0) {
    return basePrompt
  }

  const skillPrompt = combinePrompts(skillNames)
  return basePrompt ? `${basePrompt}\n\n${skillPrompt}` : skillPrompt
}
