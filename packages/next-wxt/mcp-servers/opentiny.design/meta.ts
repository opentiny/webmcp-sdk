export default {
  name: 'opentiny.design',
  type: 'contentScriptMcpServer',
  url: 'https://opentiny.design',
  isAlwaysEnabled: false,
  modules: {
    'tiny-vue': {
      url: 'https://opentiny.design/tiny-vue/zh-CN/os-theme/overview',
      entry: 'tiny-vue/index.ts'
    },
    'tiny-robot': {
      url: 'https://opentiny.design/tiny-robot',
      entry: 'tiny-robot/index.ts'
    }
  },
  version: '1.0.0'
}
