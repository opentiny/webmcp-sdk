export const GENUI_CONFIG: Record<string, any> = {
  deepseek: {
    'prompt': {
      strategy: 'append',
      'id': '53e8f602ffc54527192aabd17465442e',
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
        ],
        customActions: [
          {
            name: 'continueChat',
            description: '继续对话， 用于表单的提交按钮等',
            parameters: {
              type: 'object' as const,
              properties: {
                message: {
                  type: 'string',
                  description: '对话消息,可以是按钮文本等，也可以是其他内容'
                }
              }
            }
          }
        ]
      }
    }
  }
}
