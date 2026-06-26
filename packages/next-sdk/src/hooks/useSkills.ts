import type { ToolSet } from 'ai'
import type { NextAgent } from '../next-agent'
import { createSkillTools } from '../tools/skills-tool'

export const useSkills = (agent: NextAgent) => {
  const tools: ToolSet = {}
  function set(skillMdModules: Record<string, string | (() => Promise<string>)>) {
    try {
      const skillTools = createSkillTools(skillMdModules)
      // 将技能工具合并到现有工具集中
      Object.assign(tools, skillTools)
    } catch (error) {
      console.error('Error setting skill:', error)
    }
  }

  function clear() {
    delete tools['get-skill-content']
  }

  return {
    set,
    clear,
    tools
  }
}
