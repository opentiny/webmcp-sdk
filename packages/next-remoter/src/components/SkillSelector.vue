<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

export interface SkillOption {
  label: string
  value: string
}

interface Props {
  visible: boolean
  skills: SkillOption[]
  position?: { top: number; left: number }
  filterText?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  skills: () => [],
  filterText: ''
})

const emit = defineEmits<{
  (e: 'select', skill: SkillOption): void
  (e: 'close'): void
}>()

const activeIndex = ref(0)

// 过滤技能列表
const filteredSkills = computed(() => {
  if (!props.filterText) {
    return props.skills
  }
  const searchText = props.filterText.toLowerCase()
  return props.skills.filter(
    (skill) => skill.label.toLowerCase().includes(searchText) || skill.value.toLowerCase().includes(searchText)
  )
})

// 重置选中索引
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      activeIndex.value = 0
    }
  }
)

watch(filteredSkills, () => {
  activeIndex.value = 0
})

// 选择技能
const selectSkill = (skill: SkillOption) => {
  emit('select', skill)
}

// 键盘导航
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.visible || filteredSkills.value.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % filteredSkills.value.length
      scrollToActive()
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value = (activeIndex.value - 1 + filteredSkills.value.length) % filteredSkills.value.length
      scrollToActive()
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
  }
}

const scrollToActive = () => {
  nextTick(() => {
    const activeEl = document.querySelector('.skill-selector__item--active')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  })
}

// 暴露键盘处理方法
defineExpose({
  handleKeyDown
})
</script>

<template>
  <Transition name="skill-selector-fade">
    <div
      v-if="visible && filteredSkills.length > 0"
      class="skill-selector"
      :style="{ top: `${position?.top || 0}px`, left: `${position?.left || 0}px` }"
    >
      <div class="skill-selector__list">
        <div
          v-for="(skill, index) in filteredSkills"
          :key="skill.label"
          class="skill-selector__item"
          :class="{ 'skill-selector__item--active': index === activeIndex }"
          @click="selectSkill(skill)"
          @mouseenter="activeIndex = index"
        >
          <div class="skill-selector__item-label">{{ skill.label }}</div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="less" scoped>
.skill-selector {
  position: fixed;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 300px;
  max-height: 300px;
  overflow: hidden;
}

.skill-selector__list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.skill-selector__item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover,
  &--active {
    background-color: #f0f0f0;
  }
}

.skill-selector__item-label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.skill-selector__item-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.skill-selector-fade-enter-active,
.skill-selector-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.skill-selector-fade-enter-from,
.skill-selector-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
