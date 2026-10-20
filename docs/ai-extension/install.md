---
outline: [2, 3]
---

# 安装指南

**TinyRobot AI助手** 以「已解压扩展」包的形式分发：无需从源码构建，下载解压后即可在浏览器「开发者模式」中加载，全程约 2 分钟。

## 前置要求

- **浏览器**：Chrome、Microsoft Edge 或其他 Chromium 内核浏览器，版本 >= 120（扩展依赖侧边栏、动态脚本注入等浏览器能力）。
- **安装目录**：将压缩包解压到一个**固定的文件夹**。浏览器直接从该目录读取扩展文件，安装后请勿移动、重命名或删除它。
- **Node.js（可选）**：仅在使用「CLI WebSocket 桥接」功能时需要（见步骤五），常规安装无需准备。

## 步骤一：下载并解压

1. 访问 [下载地址](https://docs.opentiny.design/download/extension-0.0.7.zip) 下载扩展压缩包。
2. 将其解压到一个固定文件夹，例如 `D:\extensions\tiny-robot`。

::: warning
安装目录被移动或删除后，扩展会立即失效。更新版本时建议先将新包解压覆盖原目录（或解压到新目录），再到扩展管理页点击「重新加载」。
:::

## 步骤二：开启开发者模式

1. 在地址栏输入 `chrome://extensions/`（Edge 为 `edge://extensions/`），打开扩展管理页面。
2. 开启右上角的**开发者模式**开关。

![开启开发者模式](../assets/images/extension/develop-switch.png)

## 步骤三：加载扩展

1. 点击左上角的**加载已解压的扩展程序**按钮。
2. 在弹窗中选择步骤一解压出来的文件夹（即包含 `manifest.json` 的那一层目录）并确认。
3. 加载成功后，扩展列表中会出现 **TinyRobot AI助手**；若浏览器弹出权限确认，请允许——扩展需要读取页面内容并注入页面工具，才能提供 AI 操作能力。

![加载已解压的扩展程序](../assets/images/extension/ext-folder.png)

## 步骤四：验证安装成功

1. 点击浏览器工具栏中的 TinyRobot 图标（可先通过工具栏的拼图图标将其固定），展开侧边栏。
2. 看到侧边栏首页与左下角的**登录**入口，说明扩展已正常运行。
3. 打开任意网页，页面右侧会出现可拖动的**悬浮球**，它是页面内的快捷入口。

![安装成功后的侧边栏首页](../assets/images/extension/install-success.png)

::: tip
安装完成后，请前往 [快速入门](./quick-start.md) 登录领取免费额度，并完成第一次网页操作。
:::

## 步骤五（可选）：连接本地 CLI

如需让侧边栏操作本地工作目录（生成 PPT、运行本地命令等），或让 Claude Desktop、Cursor 等第三方 Agent 遥控浏览器，可开启本地 WebSocket 桥接：

1. 点击侧边栏左下角的设置图标进入配置页，在**功能管理**中开启 **CLI WebSocket 桥接** 开关。
2. 点击侧边栏顶部的 **WS 待连接** 徽章展开桥接面板，点击**复制 CLI 设置命令**。
3. 在本地终端执行复制的命令（形如 `npx @opentiny/webmcp-cli --mode wxt token set <Token>`），命令会自动拉起 `127.0.0.1:18999` 的桥接服务并完成配对。
4. 徽章与面板变为 **WS 已连接** 即连接成功；面板中的**复制 MCP 配置**可用于把桥接作为 MCP Server 添加给第三方 Agent。

![在功能管理中开启 CLI WebSocket 桥接](../assets/images/extension/install-cli-websocket.png)

![桥接面板：等待连接并复制 CLI 设置命令](../assets/images/extension/cli-start.png)

![桥接已连接](../assets/images/extension/cli-success.png)

::: warning 安全提示
桥接接通后可在本地目录执行命令，请仅在受信任的开发环境开启，并妥善保管 Token。
:::

## 常见问题

- **找不到「加载已解压的扩展程序」按钮**：开发者模式未开启，返回步骤二。
- **加载失败并提示缺少 manifest**：选择的不是解压根目录，请选择直接包含 `manifest.json` 的目录。
- **扩展突然失效或图标变灰**：安装目录可能被移动或删除；恢复目录后在扩展卡片上点击**重新加载**，或按步骤三重新加载。
- **悬浮球不出现**：可能在**悬浮球设置**中关闭了悬浮球，或当前站点被加入黑名单；修改配置后刷新页面。

## 下一步

- [快速入门](./quick-start.md)：登录、第一次对话、悬浮球与右键菜单。
- [注册与登录](./usage/register-login.md)：账号与免费额度。
- [功能管理](./setting/plugin-config.md)：按域名开启或关闭内置插件。