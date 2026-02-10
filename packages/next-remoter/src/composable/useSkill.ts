// 技能逻辑：仅采用 skillMdModules + next-sdk（list_skills / get_skill_content），无 props.skills 与输入框 @ 提及
import { ref, watch, computed, type Ref } from 'vue'
import { SkillOption } from '../components/SkillSelector.vue'
import {
  getSkillOverviews,
  formatSkillsForSystemPrompt,
  createSkillTools,
  type SkillMeta
} from '@opentiny/next-sdk'

export interface UseSkillWithToolsOptions {
  /** 用户层传入的 skill .md 模块（key 路径，value 内容），由 next-sdk 处理；大模型通过 list_skills / get_skill_content 自动识别并加载技能 */
  skillMdModulesRef?: Ref<Record<string, string> | undefined>
  /** 基础系统提示词 */
  systemPrompt: string
  /** CustomAgentModelProvider 的 agent 实例 */
  agent: any
  /** CustomAgentModelProvider 实例，用于写 systemPrompt、合并 extraTools */
  customAgentProvider: any
}

/**
 * Skills 与工具组合 Composable（仅最新方案）
 * 基于 skillMdModules + next-sdk：拼入 systemPrompt 技能说明、注入 list_skills / get_skill_content 工具，无 @ 提及
 */
export function useSkillWithTools(options: UseSkillWithToolsOptions) {
  const { skillMdModulesRef, systemPrompt, agent, customAgentProvider } = options

  const skillOverviews = computed<SkillMeta[]>(() => {
    const mod = skillMdModulesRef?.value
    return mod ? getSkillOverviews(mod) : []
  })

  /** 用于拼进 systemPrompt 的「可用技能」说明（含「请用 get_skill_content 获取详情」） */
  const skillPromptPart = computed(() => {
    const list = skillOverviews.value
    return list.length > 0 ? formatSkillsForSystemPrompt(list) : ''
  })

  /** 内置技能工具（list_skills、get_skill_content），供 remoter 合并进 extraTools */
  const skillTools = computed(() => {
    const mod = skillMdModulesRef?.value
    return mod ? createSkillTools(mod) : {}
  })

  /** 发送前占位：已不再处理 @ 提及，直接不拦截 */
  const processSkillMentions = async (): Promise<{ shouldBlock: boolean; skillItems: never[] }> => {
    return { shouldBlock: false, skillItems: [] }
  }

  return {
    processSkillMentions,
    skillPromptPart,
    skillTools,
    skillOverviews
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
    if (!props.skills?.length) return

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
