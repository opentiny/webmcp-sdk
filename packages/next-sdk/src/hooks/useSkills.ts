import type { ToolSet } from 'ai'
import type { NextAgent } from '../next-agent'
import { createSkillTools, formatSkillsForSystemPrompt, getSkillOverviews, type SkillMeta } from '../tools/skills-tool'

const toolNameKey = 'get-skill-content'

/** Skills 管理器
 *
 */
export const useSkills = (agent: NextAgent) => {
  const tools: ToolSet = {}

  /** 传入skillsMd配置对象，自动生成get-skill-content工具和技能的系统提示词 */
  async function set(skillMdModules: Record<string, string | (() => Promise<string>)>) {
    try {
      // 1. 构建工具
      tools[toolNameKey] = createSkillTools(skillMdModules) as any

      // 2. 构建提示词
      const skillOverviews: SkillMeta[] = await getSkillOverviews(skillMdModules)
      const prompt = formatSkillsForSystemPrompt(skillOverviews)
      agent.$prompts.setSkillMeta(prompt)
    } catch (error) {
      console.error('Error setting skill:', error)
    }
  }

  /** 清除工具和提示词 */
  function clear() {
    delete tools[toolNameKey]
    agent.$prompts.setSkillMeta('')
  }

  return {
    set,
    clear,
    tools
  }
}
