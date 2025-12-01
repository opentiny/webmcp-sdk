// TODO 未来版本不需要这些逻辑。 它会包含到tiny--robot库中
import { ref, watch } from 'vue'
import { SkillOption } from '../components/SkillSelector.vue'

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

    if (templateData.value.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newData: any[] = []
      if (inputMessage.value) {
        const atIndex = inputMessage.value.lastIndexOf('@')
        const beforeAt = atIndex !== -1 ? inputMessage.value.substring(0, atIndex) : inputMessage.value
        if (beforeAt) newData.push({ type: 'text', content: beforeAt })
      }
      newData.push({ type: 'skill', label: skill.label, value: skill.value })
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
        newData.push({ type: 'skill', label: skill.label, value: skill.value })
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
