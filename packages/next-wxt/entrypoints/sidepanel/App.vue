<script lang="ts" setup>
import { type Ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './useBrowserExtensions'
import { EXCALIDRAW_PROMPT, OFFICE_PROMPT } from '@/utils/prompt'
import TinyUser from '@opentiny/vue-user'

const llmConfig = {
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_BASE_URL,
  providerType: import.meta.env.VITE_LLM_PROVIDER_TYPE,
  model: import.meta.env.VITE_LLM_MODEL,
  maxSteps: 15,
  providerOptions: {
    deepseek: {
      'prompt': {
        strategy: 'append',
        'id': '5ed1b9071c15d1ed59b5827ea5dcabd4',
        'params': {
          customComponents: [
            {
              name: '选择用户组件',
              description: '选择用户组件，用于选择用户，支持模糊搜索',
              component: 'TinyUser',
              schema: {
                properties: [
                  {
                    property: 'modelValue',
                    label: '用户绑定工号',
                    required: true,
                    description: '用户的工号，双向绑定值',
                    type: 'string'
                  },
                  {
                    property: 'valueField',
                    label: '值字段',
                    required: true,
                    description: '用户工号值的绑定字段',
                    type: 'string'
                  }
                ]
              }
            }
          ],
          customExamples: [
            {
              name: '选择用户示例',
              schema: {
                componentName: 'Page',
                state: {
                  reviewer: ''
                },
                children: [
                  {
                    componentName: 'h3',
                    props: {},
                    children: '输入用户名搜索工号并选择用户'
                  },
                  {
                    componentName: 'TinyUser',
                    props: {
                      modelValue: {
                        type: 'JSExpression',
                        model: true,
                        value: 'this.state.reviewer'
                      },
                      valueField: 'uid'
                    }
                  },
                  {
                    componentName: 'TinyButton',
                    props: {
                      text: '提交'
                    }
                  }
                ]
              }
            }
          ]
        }
      } as any
    }
  }
}

const remoterRef = ref() as Ref<InstanceType<typeof TinyRemoter>>
useBrowserExtensions(remoterRef)

const genUiComponents = shallowReactive({ TinyUser })
</script>

<template>
  <div>
    <TinyRemoter
      ref="remoterRef"
      mode="chat-dialog"
      :browserExtensions="useBrowserExtensions"
      show
      fullscreen
      title=""
      :llmConfig="llmConfig"
      :systemPrompt="`${OFFICE_PROMPT}${EXCALIDRAW_PROMPT}`"
      inBrowserExt
      gen-ui-able
      :gen-ui-components="genUiComponents"
    >
    </TinyRemoter>
  </div>
</template>

<style scoped>
:deep(.tr-container__header-operations) {
  .tr-icon-button {
    display: none;
  }

  .tr-icon-button:first-child,
  .tr-icon-button:nth-child(2) {
    display: flex;
  }
}

:deep(.tr-bubble__content-items) {
  p {
    font-size: 16px;
  }

  li {
    font-size: 14px;
    color: #555;
  }

  .tr-bubble__text {
    font-size: 16px;
  }
}
</style>
