# webmcp-cli 的命令

# 1、 list 命令

list命令第一步： 
向当前打开的网页，注入脚本，注入成功后记录  window.__webmcpcli_init=true.

注入脚本中，先判断window.__webmcpcli_init为true， 则直接返回
window.__webmcpcli_init不存在，则注入以下逻辑：

```javascript
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import { PageController } from '@page-agent/page-controller'

// 让网页兼容最新的 webmcp api
initializeWebMCPPolyfill()


// 去操作网页， 比如 browserState click  fill select scroll 
window.__webmcpcli_pageController = new PageController({ enableMask: true, viewportExpansion: -1 })




// 立即收集一次页面所有的工具
navigator.modelContextTesting.registerToolsChangedCallback(async () => {
    // 把当前页面所有的工具，更新到 window.__webmcpcli_tools下面
});
  ```
list命令第二步： 
返回当前页面状态为json
```json
{
    currTab:{
        url:  当前url
        content: pageController.getBrowserState,
        tabId: 当前标签面的tabId
        tools:[
            window.__webmcpcli_tools 的值
        ]
    },
    otherTabs:[
        {url,title,tabId}
    ]
}

```

2. run 命令

run 命令就是执行一些网页命令，它分为3种
1  是执行当前页面  navigator.modelContext 注册的tools
比如用户注册了改变颜色的工具：
```js
navigator.modelContext.registerTool({
  name: "change-color",
  description: "改变当前颜色",
  inputSchema: { type: "object", properties: {"color": { "type": "string" },} },
  async execute({color}) {
    document.body.style.background=color
    return {
      content: [
        {
          type: "text",
          text: `当前红色, from buildin-modelcontext`,
        },
      ],
    };
  },
});

```
那我们就可以执行它：
  `webmcp-cli run  change-color #110000`

2 是执行 page-agent 工具中的命令

如果是 webmcp-cli run  ,则表示执行page-agent命令

page-agent 子命令有

| --子命令-- | --参数--  | -动作- | -说明- |
|-----|-----|-----|
| browserState |  无  |   await pageController.getBrowserState()   |  查询当前整个页面的浏览器状态;返回页面的标题、URL、HTML内容 |
| click |  index  |  await pageController.clickElement(args.index)   |  根据元素索引点击 |
| fill |   index  text |  await pageController.inputText(args.index, args.text)   | 根据元素索引填写文本 |
| select |  index  text  |  await pageController.selectOption(args.index, args.text)   | 根据元素索引选择下拉框选项 |

比如：  `webmcp-cli run  page-agent  browserState `
        `webmcp-cli run  page-agent  click #35 `
3是 执行tabs 操作

管理整个浏览器的tabs
| --子命令-- | --参数--  |  -说明- |
|-----|-----|-----|
| open |  url |  打开url |
| close |  tabid  |  关闭标签 |
| switch |  tabid| 激活指定tabid |

比如：  `webmcp-cli run  tabs open https://baidu.com`
