# WXT + Vue 3

wxt: https://wxt.dev/

webext-bridge: https://serversideup.net/open-source/webext-bridge/docs/guide/concepts

1、所有的消息，在 .wxt/types/bridge.d.ts 中，添加 参数/返回值的 ts 声明

- sendMessage(messageId, data, target)  
  :target= 'devtools@devtoolId' | 'background' | 'popup' | 'options' | 'content-script@tabid' | 'window'

- onMessage(messageId, ({sender,data,timestamp})=>{})  
  2、![bridge导出变量](./public/webext-bridge包的导出说明.png)
