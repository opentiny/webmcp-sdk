// TODO 未来版本不需要这些逻辑。 它会包含到tiny--robot库中
import { ref, watch, Ref } from 'vue'
import { SkillOption } from '../components/SkillSelector.vue'

/**
 * 事件中返回的Skill 结构体
 */
export interface EventSkill {
  type: 'mention'
  /** xx专家 */
  content: string
  /** 你是xx专家 */
  value: string
}

/**
 * 属性中传入的Skill 结构体
 */
export interface PropsSkill {
  /** xx专家 */
  label: string
  /** 你是xx专家 */
  value: string
  /** 该技能需要的工具列表 */
  tools?: string[]
}

/**
 * Skills 工具相关的 Composable
 * 用于处理技能与工具的关联、检查、提示词组合等逻辑
 */
export function useSkillWithTools(
  skills: Ref<PropsSkill[]>,
  systemPrompt: string,
  agent: any, // CustomAgentModelProvider 的 agent 实例
  customAgentProvider: any // CustomAgentModelProvider 实例
) {
  /**
   * 检查工具是否已加载和启用
   * @param toolName 工具名称
   * @returns 工具是否可用（已加载且已启用）
   */
  const isToolAvailable = (toolName: string): boolean => {
    // 检查工具是否存在于任何 mcpTools 中
    for (const serverName in agent.mcpTools) {
      const serverTools = agent.mcpTools[serverName]
      if (serverTools && serverTools[toolName]) {
        // 检查工具是否被禁用（在 ignoreToolnames 中）
        return !agent.ignoreToolnames.includes(toolName)
      }
    }
    return false
  }

  /**
   * 检查 skill 对应的工具是否已加载和启用
   * @param skillItems skill 项列表  content 对应 label(xxx专家) ， value对应value（我是xxx专家,......)
   * @returns Promise<boolean> 如果有缺失的工具，返回用户的选择：true 表示阻止发送，false 表示仍然发送；如果没有缺失工具，返回 false
   */
  const checkSkillToolsAvailability = async (skillItems: EventSkill[]): Promise<boolean> => {
    if (skillItems.length === 0) return false

    const missingTools: Array<{ skillLabel: string; toolNames: string[] }> = []

    for (const skillItem of skillItems) {
      // 从 skills 列表中查找完整的 skill 信息
      const fullSkill = skills.value.find((s) => s.label === skillItem.content)

      // 如果 skill 定义了需要的工具列表
      if (fullSkill?.tools && fullSkill.tools.length > 0) {
        const unavailableTools: string[] = []

        // 检查每个工具是否已加载和启用
        for (const toolName of fullSkill.tools) {
          if (!isToolAvailable(toolName)) {
            unavailableTools.push(toolName)
          }
        }

        // 如果有不可用的工具，记录到 missingTools
        if (unavailableTools.length > 0) {
          missingTools.push({
            skillLabel: skillItem.content || fullSkill.label,
            toolNames: unavailableTools
          })
        }
      }
    }

    // 如果有缺失的工具，显示确认对话框
    if (missingTools.length > 0) {
      const toolMessages = missingTools
        .map((item) => {
          return `${item.skillLabel} 需要以下工具：${item.toolNames.join('、')}`
        })
        .join('\n')

      try {
        await showConfirmDialog({
          title: '工具未准备好',
          message: `无法发送消息：\n${toolMessages}\n\n请先加载或启用对应的工具。\n\n是否仍然发送？`,
          confirmButtonText: '仍然发送',
          cancelButtonText: '确定',
          showCancelButton: true
        })
        // 用户点击了"仍然发送"，返回 false 表示不阻止发送
        return false
      } catch {
        // 用户点击了"确定"或关闭对话框，返回 true 表示阻止发送
        return true
      }
    }

    return false
  }

  /**
   * 从 skillItems 中提取提示词数组
   * @param skillItems skill 项列表
   * @returns 提示词字符串数组
   */
  const extractSkillPrompts = (skillItems: EventSkill[]): string[] => {
    return skillItems
      .map((item) => item.value)
      .filter((prompt) => prompt && typeof prompt === 'string' && prompt.length > 0)
  }

  /**
   * 组合基础提示词和 skill 提示词,然后设置到customAgentProvider.systemPrompt
   * @param skillPrompts skill 提示词数组
   * @param skillItems skill 项列表（用于获取 label）
   */
  const combineSystemPrompt = (skillPrompts: string[], skillItems: EventSkill[]): void => {
    if (skillPrompts.length > 0) {
      // 组合多个 skill 的提示词
      let combinedSkillPrompt = ''
      if (skillPrompts.length === 1) {
        // 单个 skill，直接使用其提示词
        combinedSkillPrompt = skillPrompts[0]
      } else {
        // 多个 skill，组合为多专家协作模式
        const skillLabels = skillItems.map((item) => item.content)
        combinedSkillPrompt = `# 多专家协作模式\n\n你同时具备以下 ${skillPrompts.length} 位专家的能力，请根据用户需求选择合适的专家视角来回答问题：\n\n`
        skillPrompts.forEach((prompt, index) => {
          combinedSkillPrompt += `## ${skillLabels[index]}（专家 ${index + 1}）\n\n${prompt}\n\n---\n\n`
        })
      }

      // 组合基础提示词和 skill 提示词
      const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${combinedSkillPrompt}` : combinedSkillPrompt
      customAgentProvider.systemPrompt = finalPrompt
    } else {
      // 没有有效的 skill 提示词，使用基础提示词
      customAgentProvider.systemPrompt = systemPrompt
    }
  }

  /**
   * 处理输入消息中的 @ 技能提及
   * @param inputValue 输入的消息内容
   * @returns Promise<{ shouldBlock: boolean; skillItems: EventSkill[] }> shouldBlock 为 true 表示阻止发送
   */
  const processSkillMentions = async (
    inputValue: string
  ): Promise<{ shouldBlock: boolean; skillItems: EventSkill[] }> => {
    // 匹配输入消息中 @ 提及的技能
    const matchedSkills = skills.value.filter((s) => inputValue.includes('@' + s.label))

    if (matchedSkills.length === 0) {
      return { shouldBlock: false, skillItems: [] }
    }

    // 构建 skill 项列表
    const skillItems: EventSkill[] = matchedSkills.map((s) => ({
      type: 'mention',
      content: s.label,
      value: s.value
    }))

    // 检查 skill 对应的工具是否已加载和启用
    const shouldBlock = await checkSkillToolsAvailability(skillItems)

    if (!shouldBlock) {
      // 提取并组合 skill 提示词
      const skillPrompts = extractSkillPrompts(skillItems)
      combineSystemPrompt(skillPrompts, skillItems)
    }

    return { shouldBlock, skillItems }
  }

  return {
    isToolAvailable,
    checkSkillToolsAvailability,
    extractSkillPrompts,
    combineSystemPrompt,
    processSkillMentions
  }
}

/**
 * Skills UI 相关的 Composable（原有逻辑保持不变）
 * 用于处理技能选择器的 UI 交互
 */
export function useSkill(inputMessage: any, senderRef: any, props: any) {
  const templateData = ref<any[]>([]) // 模板数据
  const showSkillSelector = ref(false) // 是否显示选择角色
  const skillSelectorPosition = ref({ top: 0, left: 0 }) // 角色的定位
  const filterText = ref('') // 过滤角色

  const handleTriggerChar = (char: string, position: { top: number; left: number }) => {
    if (props.skills.length == 0) return

    if (char === '@') {
      showSkillSelector.value = true
      skillSelectorPosition.value = position
      filterText.value = ''
    }
  }

  const selectSkill = (skill: SkillOption) => {
    showSkillSelector.value = false
    filterText.value = ''

    // 构建完整的 skill 数据，包含 prompt 字段
    const skillData: any = {
      type: 'skill',
      label: skill.label,
      value: skill.value
    }
    // 如果 skill 对象包含 prompt 字段，也保存它
    if ((skill as any).prompt) {
      skillData.prompt = (skill as any).prompt
    }

    if (templateData.value.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newData: any[] = []
      if (inputMessage.value) {
        const atIndex = inputMessage.value.lastIndexOf('@')
        const beforeAt = atIndex !== -1 ? inputMessage.value.substring(0, atIndex) : inputMessage.value
        if (beforeAt) newData.push({ type: 'text', content: beforeAt })
      }
      newData.push(skillData)
      newData.push({ type: 'text', content: ' ' })
      templateData.value = newData
      inputMessage.value = ''
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sender = senderRef.value as any
        sender?.$refs?.templateEditorRef?.focusToEnd?.()
      }, 100)
      return
    }

    const lastItem = templateData.value[templateData.value.length - 1]
    if (lastItem?.type === 'text') {
      const atIndex = lastItem.content.lastIndexOf('@')
      if (atIndex !== -1) {
        const beforeAt = lastItem.content.substring(0, atIndex)
        const newData = [...templateData.value]
        if (beforeAt) {
          newData[newData.length - 1] = { type: 'text', content: beforeAt }
        } else {
          newData.pop()
        }
        newData.push(skillData)
        templateData.value = newData
      }
    }

    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sender = senderRef.value as any
      sender?.$refs?.templateEditorRef?.focusToEnd?.()
    }, 100)
  }
  const closeSkillSelector = () => {
    showSkillSelector.value = false
    filterText.value = ''
  }

  const skillSelectorRef = ref(null)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showSkillSelector.value && skillSelectorRef.value) {
      e.stopPropagation()
      skillSelectorRef.value.handleKeyDown(e)
    }
  }

  const canTriggerSkillSelector = (text: string, atIndex: number): boolean => {
    if (atIndex === 0) return true
    if (atIndex > 0 && text[atIndex - 1] === ' ') return true
    return false
  }
  watch(
    templateData,
    (newData) => {
      if (!showSkillSelector.value || newData.length === 0) {
        showSkillSelector.value = false
        filterText.value = ''
        return
      }

      const lastItem = newData[newData.length - 1]
      if (lastItem?.type === 'text') {
        const content = lastItem.content || ''
        const atIndex = content.lastIndexOf('@')

        if (atIndex !== -1 && canTriggerSkillSelector(content, atIndex)) {
          const textAfterAt = content.substring(atIndex + 1)
          if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
            showSkillSelector.value = false
            filterText.value = ''
          } else {
            filterText.value = textAfterAt
          }
        } else {
          showSkillSelector.value = false
          filterText.value = ''
        }
      } else {
        showSkillSelector.value = false
        filterText.value = ''
      }
    },
    { deep: true }
  )

  return {
    templateData,
    showSkillSelector,
    skillSelectorPosition,
    filterText,
    skillSelectorRef,

    handleTriggerChar,
    selectSkill,
    closeSkillSelector,
    handleKeyDown
  }
}
