# AI-Extension：让 AI 真的「看得到、动得了」你的浏览器

> 你有没有想过，有一天 AI 不只是帮你写代码、聊天，而是能直接帮你操作网页——点按钮、填表单、跨页面完成任务，甚至让你用手机远程指挥电脑上的浏览器？
>
> AI-Extension，就是干这件事的。

---

## 一、它是什么？

**AI-Extension** 是一个基于 [WXT](https://wxt.dev/) 框架构建的智能浏览器扩展插件。它把 **MCP（Model Context Protocol）协议**「塞进」了浏览器，让任意网页都能变成可被 AI 智能体操控的应用；同时内置 **Skills 技能系统**，通过一个 `SKILL.md` 文件即可为 AI 定义专业角色，让它自动识别意图、以领域专家身份响应。

安装完成，打开侧边栏，AI 就住进了你的浏览器。

它的核心思路非常直接：**不改你的应用一行代码，却能让 AI 理解并操作你的任何网页**。听起来像魔法？其实是工程。

---

## 二、八大核心亮点

### 1. 零侵入，插上即用

不需要改现有应用的代码，不需要对接任何 SDK，不需要申请什么特别权限。Chrome/Edge 装上扩展，开启 User Scripts 权限，AI 就能开始工作。对业务代码的侵入程度：**零**。

### 2. 标准 MCP 协议，接 Cursor 还是 Coze 都行

基于业界标准的 MCP 协议构建，天然兼容各类 AI 主机——Cursor、CodeMate、Coze……你用哪个 AI，它就跟哪个对话。不绑厂商，不锁生态，想换就换。

### 3. 两种执行环境，深浅自由选

工具可以跑在两个地方：

- **主世界（Main World）**：直接访问页面的 JavaScript 内存和变量，能读 React/Vue 组件状态，能调页面内部方法——想深度集成，选这个；
- **Content Script 隔离环境**：安全隔离，只碰 DOM，不影响页面原有逻辑——只要操作个按钮，选这个。

两种模式，一个 `type` 字段搞定。

### 4. 内置无障碍树 + 视觉模型，AI 自己「看」页面

插件内置了类 Chrome DevTools MCP 的无障碍树操作能力。AI 不是盲操作——它会先调用 `takeSnapshot` 获取页面结构快照，给每个可交互节点分配唯一 UID，然后精确执行点击（`click`）、输入（`fill`）、选择（`selectOption`）等操作，操作完还会自动刷新快照确认结果。

不仅如此，插件还支持接入**视觉模型**，直接对页面截图进行理解与分析。对于那些无障碍树难以描述的复杂页面，视觉模型能凭「看一眼」就识别出元素位置和页面状态，让 AI 的操作能力覆盖更多真实场景。

用人话讲：**AI 既有结构化的「X 光眼」，也有视觉模型的「肉眼」，两套感知能力随场景切换**。

### 5. 远程控制，手机扫码操作电脑

页面里会出现一个浮动按钮，扫码或输入 Session ID，手机就能远程指挥电脑浏览器里的 AI 干活。PC 端、移动端、Web 页面——三端都支持，通过 WebMCP Proxy 代理服务器中转 MCP 协议消息，延迟低、连接稳。

出门在外想操作公司电脑？扫一下就行。

### 6. 多域名工具协同，跨页面任务一气呵成

每个域名可以注册自己的专属工具，工具间支持 `toolsJumpLinks` 跳转映射和 `preOpenUrls` 依赖页面预加载。AI 可以：先在 A 网站取数据，跳到 B 网站处理，再到 C 网站提交——全程自动，一条指令走完。

### 7. Skills 技能系统，AI 秒变领域专家

在 `skills/` 目录下放一个 `SKILL.md` 文件，写上角色定义和行为规则，AI 就能自动识别用户意图并以对应专家身份响应。内置的「画图专家」已经能操作 Excalidraw 绘制专业架构图——无需任何手动触发。

新建一个技能：创建文件夹 + 写 `SKILL.md`，两步完事。

### 8. 生成式 UI，对话即界面

支持从大模型返回的文本流中动态解析并渲染 UI——动态表单、交互式卡片、流式更新，对话过程本身就是界面。告别"只能看文字"的 AI 对话体验。

---

## 三、它能用来做什么？

| 场景 | 能干啥 |
| --- | --- |
| **网页自动化** | AI 帮你填表、点按钮、提交表单，把重复劳动全包了 |
| **跨页面工作流** | 从 A 网站取数据 → B 网站处理 → C 网站提交，一条指令跑完 |
| **专属 AI 助手** | 给任意网站定制专属工具，AI 深度理解该网站的业务逻辑 |
| **移动端远程操控** | 手机扫码，远程控制 PC 浏览器里的 AI 帮你干活 |
| **领域专家角色** | 画图、写月报、处理出差申请……写个 SKILL.md 就能给 AI 换脑子 |
| **云端工具集成** | 通过 MCP 市场接入云端工具，本地能力 + 云端能力无缝结合 |

---

## 四、上手有多简单？

### 第一步：安装扩展

```bash
# 下载扩展压缩包
# https://docs.opentiny.design/download/extension-0.0.6.zip
```

1. 解压下载的 ZIP 文件
2. 浏览器地址栏输入 `chrome://extensions/`，打开扩展管理页
3. 右上角开启**开发者模式**
4. 点击「加载已解压的扩展程序」，选择解压后的文件夹
5. 在扩展详情页找到「User Scripts」并开启

### 第二步：打开侧边栏，开始对话

点击浏览器工具栏的扩展图标，侧边栏弹出，直接输入你的需求即可。AI 会自动分析当前页面，调用对应工具完成任务。

四步，五分钟，**AI 住进浏览器**。

---

### 进阶：定制 MCP 工具 & Skills 技能

想亲手给 AI 扩充能力？无论是给某个网站注册专属工具，还是为 AI 定义一个领域专家角色，都只需 Fork 仓库、添加几个文件就搞定。

**第一步：Fork 并 Clone 仓库**

```bash
# 将仓库 Fork 到自己的 GitHub 账号后，克隆到本地
git clone https://github.com/YOUR_USERNAME/next-sdk.git
cd next-sdk

# 安装依赖
npm install -g pnpm
pnpm install
```

---

#### 添加 MCP 工具

给某个网站注册专属工具，在 `packages/next-wxt/mcp-servers/` 下操作：

**第二步：创建域名目录**

```bash
mkdir packages/next-wxt/mcp-servers/your-site.com
```

**第三步：编写 `meta.ts`**，声明域名和执行环境

```typescript
// mcp-servers/your-site.com/meta.ts
export default {
  name: 'your-site.com',
  type: 'contentScriptMcpServer', // 或 'pageMcpServer'（需访问页面 JS 状态时使用）
  url: 'https://your-site.com',
  isAlwaysEnabled: true,
  version: '1.0.0'
}
```

**第四步：编写 `index.ts`**，注册工具逻辑

```typescript
// mcp-servers/your-site.com/index.ts
export default ({ server, z }) => {
  server.registerTool(
    'my-tool',
    {
      title: '我的工具',
      description: '工具的功能描述，AI 根据这里判断何时调用',
      inputSchema: { text: z.string().describe('输入文本') }
    },
    async ({ text }) => ({
      content: [{ type: 'text', text: `处理完成: ${text}` }]
    })
  )
}
```

**第五步：打包并重新加载插件**，访问对应域名，AI 就能调用你的工具了。

```bash
pnpm build:wxt
# 在 chrome://extensions/ 中重新加载 packages/next-wxt/.output/chrome-mv3-open-prod 目录
```

---

#### 添加 Skills 专家技能

想让 AI 在特定场景下以「专家」身份响应？在 `packages/next-wxt/skills/` 下操作：

**第二步：创建技能目录**

```bash
mkdir packages/next-wxt/skills/my-expert
```

**第三步：创建 `SKILL.md`**，定义专家角色

```markdown
---
name: my-expert
description: 擅长处理某类专业任务，当用户提到相关需求时自动激活
---

# 我的专家

你是一位专业的[角色名称]，擅长……

## 核心能力

- 能力 1
- 能力 2

## 工作规则

1. 规则 1
2. 规则 2
```

**第四步：保存文件**，Vite 热更新自动生效，无需重启。

**第五步：验证效果**——在侧边栏直接描述相关需求（如"帮我画一个流程图"），AI 会自动识别意图并以对应专家身份响应，全程无需手动干预。

> **提示**：`description` 字段是关键，它决定了 AI 在什么时机激活该技能，写得越准确，匹配越精准。

---

## 五、未来愿景

AI-Extension 想做的事，不只是「帮你点几个按钮」。

我们相信，**浏览器是 AI Agent 最天然的工作台**。几十亿人每天在浏览器里完成绝大多数数字化工作——查信息、填数据、审批流程、协作沟通。这些工作，AI 都应该能参与、能协助、甚至能自主完成。

未来，我们希望：

- **每一个 Web 应用**都能通过一个 `mcp-servers/` 目录，轻松拥有属于自己的 AI 操控能力；
- **每一个工作场景**都能通过一个 `SKILL.md`，召唤出对应领域的 AI 专家；
- **每一个用户**无论在 PC 前还是手机上，都能随时随地让 AI 替自己完成繁琐的网页操作；
- **每一个开发者**都能用极低的成本，把 AI 能力嫁接到任意现有的 Web 系统上，而不是从零重建。

从工具定义到 AI 操控，从本地能力到云端扩展，从单页操作到跨站工作流——**AI-Extension 的目标，是让 AI 真正成为你浏览器里最得力的伙伴**，而不只是一个会聊天的文本框。

---

> **立即体验** → [下载 AI-Extension v0.0.6](https://docs.opentiny.design/download/extension-0.0.6.zip)
>
> **参与共建** → [github.com/opentiny/next-sdk](https://github.com/opentiny/next-sdk)
