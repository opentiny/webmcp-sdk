import type { SystemModelMessage } from 'ai'
import type { NextAgent } from '../next-agent'

export function usePromptManager(agent: NextAgent) {
  const finalPrompt: SystemModelMessage[] = []
  /** 固定系统提示词 */
  let staticPrompt = ''
  /** 元数据提示词。 一种策略：将skill的结果提升到系统提示词中，可能会增加权重。 这个不是必须的 */
  let skillMetaPrompt = ''
  /** 临时系统提示词，比如： get-skill-content的返回值 */
  let tempPrompt = ''

  /** 返回全量的提示词 */
  function getAll() {
    return `
${staticPrompt}
${skillMetaPrompt}
${tempPrompt}
`
  }

  /** 设置常驻提示词 */
  function setStatic(prompt: string) {
    staticPrompt = prompt
  }
  /** 设置技能元数据提示词 */
  function setSkillMeta(prompt: string) {
    skillMetaPrompt = prompt
  }
  /** 设置临时值， 清除时传入空字符串即可，不再提供clearTemp */
  function setTemp(prompt: string) {
    tempPrompt = prompt
  }

  /** 累增临时值，为多agent时预留 */
  function appendTemp(prompt: string) {
    tempPrompt += prompt
  }

  // 对话开始时，自动添加系统提示词。
  // ToolLoopAgent 没有system属性了， 且不允许同时设置 prompt, messages属性。 所以才手动拼接messages数组
  agent.on('chatStart', () => {
    finalPrompt.length = 0

    // 初始agent时的系统提示词
    const ins = agent.settings.instructions
    if (ins) {
      if (typeof ins === 'string') {
        finalPrompt.push({
          role: 'system',
          content: agent.settings.instructions as string
        })
      } else if ((ins as SystemModelMessage).role === 'system') {
        finalPrompt.push(ins as SystemModelMessage)
      } else if (Array.isArray(ins)) {
        finalPrompt.push(...ins)
      }
    }

    // 用户手工维护的系统词
    finalPrompt.push({
      role: 'system',
      content: getAll()
    })
  })

  return {
    finalPrompt,
    setStatic,
    setSkillMeta,
    setTemp,
    appendTemp,
    getAll
  }
}
