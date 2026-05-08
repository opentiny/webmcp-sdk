import { computed, watchEffect, shallowRef, type Ref } from 'vue'
import { getSkillOverviews, formatSkillsForSystemPrompt, createSkillTools, type SkillMeta } from '@opentiny/next-sdk'

export interface UseSkillWithToolsOptions {
  /** 用户层传入的 skill .md 模块（key 路径，value 内容），由 next-sdk 处理；大模型通过 get_skill_content 自动识别并加载技能 */
  skillsRef?: Ref<Record<string, string> | undefined>
  /** CustomAgentModelProvider 实例，用于写 systemPrompt、合并 extraTools */
  customAgentProvider: any
}

/**
 * Skills 与工具组合 Composable（仅最新方案）
 * 基于 skills + next-sdk：拼入 systemPrompt 技能说明、注入 get_skill_content 工具，无 @ 提及
 */
export function useSkillWithTools(options: UseSkillWithToolsOptions) {
  const { skillsRef, customAgentProvider } = options

  // 注意：computed 不支持 async，改为 shallowRef + watchEffect 异步加载
  const skillOverviews = shallowRef<SkillMeta[]>([])

  watchEffect(async () => {
    const mod = skillsRef?.value
    skillOverviews.value = mod ? await getSkillOverviews(mod) : []
  })

  /** 用于拼进 systemPrompt 的「可用技能」说明（含「请用 get_skill_content 获取详情」） */
  const skillPromptPart = computed(() => {
    const list = skillOverviews.value
    return list.length > 0 ? formatSkillsForSystemPrompt(list) : ''
  })

  /** 内置技能工具（get_skill_content），供 remoter 合并进 extraTools */
  const skillTools = computed(() => {
    const mod = skillsRef?.value
    return mod ? createSkillTools(mod) : {}
  })

  // 监听变化，并更新当前的提示词和skillTool
  watchEffect(() => {
    customAgentProvider.promptManager.setSkillMeta(skillPromptPart.value)

    if (customAgentProvider.llmConfig) {
      const extra = customAgentProvider.llmConfig.extraTools ?? {}
      customAgentProvider.llmConfig.extraTools = { ...extra, ...skillTools.value }
    }
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
