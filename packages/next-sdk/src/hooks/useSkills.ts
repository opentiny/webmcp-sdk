import type { ToolSet } from 'ai'
import type { NextAgent } from '../next-agent'
import { createSkillTools, formatSkillsForSystemPrompt, getSkillOverviews, type SkillMeta } from '../tools/skills-tool'

/** Skills 管理器
 * 传入skillsMd配置对象，自动生成get-skill-content工具和技能的系统提示词
 */
export const useSkills = (agent: NextAgent) => {
  const tools: ToolSet = {}
  async function set(skillMdModules: Record<string, string | (() => Promise<string>)>) {
    try {
      Object.assign(tools, createSkillTools(skillMdModules))

      const skillOverviews: SkillMeta[] = await getSkillOverviews(skillMdModules)
      const prompt = formatSkillsForSystemPrompt(skillOverviews)
      agent.$prompts.setSkillMeta(prompt)
    } catch (error) {
      console.error('Error setting skill:', error)
    }
  }

  function clear() {
    delete tools['get-skill-content']
    agent.$prompts.setSkillMeta('')
  }

  return {
    set,
    clear,
    tools
  }
}
