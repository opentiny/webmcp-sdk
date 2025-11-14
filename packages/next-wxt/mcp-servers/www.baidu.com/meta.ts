export default {
  name: 'www.baidu.com',
  type: 'contentScriptMcpServer',
  url: 'https://www.baidu.com',
  isAlwaysEnabled: true,
  toolsJumpLinks: {
    'get-page-title': 'https://www.baidu.com/s?wd=get-page-title'
  },
  version: '1.0.0'
}
