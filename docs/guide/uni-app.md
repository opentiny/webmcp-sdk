# uni-app 应用接入

<Info>
本文是介绍如何快速接入`@opentiny/next-sdk`, 并添加远端遥控的二维码等功能。
</Info>

## 1、 项目准备

首先，确保你的环境安装正确，比如 Nodejs , Npm , HBuilder X 等均能正常使用。
打开 HBuilder X 开发环境，通过 **文件 -> 新建 -> 项目** 菜单，创建一个标准的 Uniapp x 的应用，并确保能正常运行该项目。

## 2、 开发应用页面

参考 [ UniApp x ](https://doc.dcloud.net.cn/uni-app-x/) 官网开发应用的页面，并在 `pages.json` 中注册，以下示例注册了电商商场的3个页面：

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "电商商城--商品列表"
      }
    },
 {
   "path": "pages/cart/index",
   "style": {
     "navigationBarTitleText": "电商商城--购物车"
   }
 },
 {
   "path": "pages/qr"
 }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "uni-app x",
    "navigationBarBackgroundColor": "#F8F8F8",
    "backgroundColor": "#F8F8F8"
  },
  "uniIdRouter": {}
}

```

## 3、接入 next-sdk 包

在 `package.json`中添加项目依赖包，其中 `qrcode` 用于渲染二维码：

```json
{
  "dependencies": {
 "@opentiny/next": "^0.3.0",
    "@opentiny/next-sdk": "^0.1.0",
    "@modelcontextprotocol/sdk": "^1.16.0",
    "ajv": "^8.17.1",
 "qrcode":"1.5.1",
 "zod": "^3.23.8"
  }
}
```

根据 [全局变量与状态管理](https://doc.dcloud.net.cn/uni-app-x/tutorial/store.html) 的文档，可以在项目中定义一个模块来引入 next-sdk 包，比如创建 `next-sdk-store.uts` 模块：

```typescript

export const AGENT_ROOT = 'https://agent.opentiny.design/api/v1/webmcp-trial/'
export const ROMOTER_ROOT = 'https://ai.opentiny.design/'
export const webMcpServer = { value: null as any }  // 页面引入该对象，即引用了 server
export const webMcpClient = { value: null as any }   
export const webSessionId = { value: null as any }

const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 定义 MCP Server 的能力
const capabilities = {
 prompts: { listChanged: true },
 resources: { subscribe: true, listChanged: true },
 tools: { listChanged: true },
 completions: {},
 logging: {}
}

export async function initMcpClient() {
 const client = new WebMcpClient(
  { name: 'mcp-web-client', version: '1.0.0' },
  { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
 )
 webMcpClient.value = client
 await client.connect(clientTransport)

 const { sessionId } = await client.connect({
  url: AGENT_ROOT + 'mcp',
  sessionId: 'stream06-1921-4f09-af63-uniappx',
  agent: true,
  onError: (error : Error) => {
   console.error('Connect proxy error:', error)
  }
 })

 webSessionId.value = sessionId
}

export async function initMcpServer() {
 const server = new WebMcpServer({ name: 'base-config', version: '1.0.0' },
  { capabilities: capabilities })

 webMcpServer.value = server
    // ------- 在此可以注册业务的 tools

 serverTransport.onerror = (error) => {
  console.error(`ServerTransport error:`, error)
 }
 await server.connect(serverTransport)

 return server
}


```

 在上面 `next-sdk-store.uts` 模块中，暴露了2个关键函数： `initMcpClient` 和 `initMcpServer` 分别用于初始化服务端和客户端。在初始化客户端时，使用到的 `sessionId` 可以固定一个字符串，也可以不传入，让框架随机生成一个  `sessionId` ，详细说明请参考 [WebMcpClient 类](api-client)。

 在 `App.uvue` 文件是管理项目 app 的生命周期的文件，我们可以在这里引入上面2个函数来接入 `next-sdk` ：

 ```javascript
 import { initMcpClient, initMcpServer } from './next-sdk-store'

 let firstBackTime = 0
 export default {
  onLaunch: function () {
  // 在此接入
   initMcpServer()
   initMcpClient()
  },
  onShow: function () {
  },
  onHide: function () {
  },
  onLastPageBackPress: function () {
  },
  onExit: function () { },
 }

 ```

## 4、为应用编写工具

 项目还需要编写一些业务相关的 Mcp Tool 工具来实现智能化操作，这些工具可以写在 `initMcpServer` 函数内部，也可以写在任意模块中，比如 创建新模块`register-tools.uts`，并添加一组电商类的 Tool:

 ```typescript
import { webMcpServer } from "./next-sdk-store"

export function registerTools(){
    const server = webMcpServer.value;

     server.registerTool(
  'get-products',
  {
   description: '查询所有的商品列表信息',
   inputSchema: {}
  },
  async () => {
   return {
    content: [{ type: 'text', text: JSON.stringify(appData.products) }]
   }
  }
 )

 server.registerTool(
  'get-carts',
  {
   description: '查询购物车中商品信息，包含商品对象和数量',
   inputSchema: {}
  },
  async () => {
   return {
    content: [{ type: 'text', text: JSON.stringify(appData.cart) }]
   }
  }
 )

    
 server.registerTool(
  'get-totalCost',
  {
   description: '查询购物车中商品信息的总价',
   inputSchema: {}
  },
  async () => {
   return {
    content: [{ type: 'text', text: JSON.stringify(cartTotal()) }]
   }
  }
 )

 server.registerTool(
  'pay-for-cart',
  {
   description: '购买购物车中商品',
   inputSchema: {}
  },
  async () => {
   payCart()
   return {
    content: [{ type: 'text', text: 'success' }]
   }
  }
 )
 
 server.registerTool(
  'add-product-to-cart',
  {
   description: '往购物车中添加商品,参数为商品的 id 和商品的数量',
   inputSchema: {
    productId:z.number().describe("商品 ID "),
    quantity:z.number().default(1).describe("商品数量"),
   }
  },
  async ({productId, quantity=1}) => {
   addToCartById(productId,quantity)
   return {
    content: [{ type: 'text', text: 'success' }]
   }
  }
 )
}


 ```

 至此，当前应用已经支持智能化遥控了。

## 5、添加远端遥控工具

 远端遥控工具的原理是：在创建 `WebMcpClient` 时，会生成一个 `sessionId`, 它对应一个固定的远端访问地址用于遥控网页，该地址为： `https://ai.opentiny.design/next-remoter?sessionId=${sessionId}`。 如果在其它电脑或手机浏览器上访问该地址，就能看到一个可以通过文字来遥控当前应用的管理页面。

 为了在应用中简单就能访问上面地址，可以添加一个按钮或浮动元素，给它添加点击事件，触发一个二维码弹窗，这样手机扫码即可打开该地址，打开二维码弹窗如下：

 ```typescript
uni.openDialogPage({
    url: "/pages/qr",  // 注册一个全局的 qr 弹出窗的页面，并在这里打开 
})
 ```

```html
<template>
 <view class="qr-page">
  <view class="qr-wrapper">
   <text>请扫码控制页面</text>
   <canvas id="qr-canvas"></canvas>
   <button @click="closeDialog">关闭</button>
  </view>
 </view>
</template>

<script>
 import { webSessionId } from 'next-sdk-store';
    import QRCode from "qrcode"

 export default {
  data() {
   return {
    url: getQrUrl()
   }
  },
  methods: {
   closeDialog() {
    uni.closeDialogPage()
   }
  },
  onReady() {
   const canvas = this.$page.getElementById("qr-canvas") as UniCanvasElement
            const url = `https://ai.opentiny.design/next-remoter?sessionId=${webSessionId.value}`
            
            QRCode.toCanvas(canvasDom, url, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                small: true,
                margin: 4,
                color: {
                    dark: "#007AFF",
                    light: "#ffffff00"
                }
            })
  }
 }
</script>

<style>
 .qr-page{
  background-color: #0000006c;
  height: 100%;
 }
 .qr-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 40px;
  padding: 24px;
  background-color: #fff;
 }
</style>
```
