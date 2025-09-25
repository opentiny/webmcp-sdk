# 接入三方 AI 应用

<Info>
NEXT-SDKs 使用 MCP 标准远程通信协议，支持各类 AI 应用、Agent 开发平台通过连接 WebAgent 实现把企业应用当成 Agent 的 MCP 工具调用。
</Info>

## VSCode Copilot

1. 在 VSCode 软件中打开你的项目工程，在项目根目录增加 `.vscode` 文件夹，里面添加一个 `mcp.json` 文件，在该文件中加入以下内容。

```json
{
  "servers": {
    "my-app-mcp-server": {
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=stream06-1921-4f09-af63-51de410e9e09"
    }
  }
}
```

2. 配置完成之后点击 `my-app-mcp-server` 上方的启动按钮，这时你的前端应用的 MCP Server 就启动了。

![](../assets/images/vscode-copilot/1.png)

3. 然后使用快捷键 Ctrl + Alt + I 打开 VSCode Copilot AI 对话框，切换到 Agent 模式。

![](../assets/images/vscode-copilot/2.png)

4. 在输入框中输入需要操作的内容，这时 AI 就会调用你的前端应用中定义的 MCP 工具，操作你的前端应用，例如帮我选中 ID 为 6 的公司,就会调用定义的 MCP 工具，点击继续按钮。

![](../assets/images/vscode-copilot/4.png)

5. 查看是否调用 MCP 工具成功。

![](../assets/images/vscode-copilot/3.png)

## Cursor

1. 在 [Cursor](https://cursor.com/cn) 官网下载软件。

![](../assets/images/cursor/1.png)

2. 在 Cursor 使用快捷键 Ctrl + L 弹出 AI 对话框，点击设置按钮进行设置 MCP Server。

![](../assets/images/cursor/2.png)

3. 按照下面的步骤手动进行手动添加。

```json
{
  "mcpServers": {
    "my-app-mcp-server": {
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=stream06-1921-4f09-af63-51de410e9e09"
    }
  }
}
```

4. 查看 MCP 是否配置成功并且进行验证。

![](../assets/images/cursor/4.png)

5. 新建会话，切换到 Agent 模式，在输入框中输入需要操作的内容，这时 AI 就会调用你的前端应用中定义的 MCP 工具，操作你的前端应用。

![](../assets/images/cursor/5.png)

6. 查看是否调用 MCP 工具成功。

![](../assets/images/cursor/7.png)


## Windsurf
1. 在 [Windsurf](https://windsurf.com/) 官网下载软件。

![](../assets/images/windsurf/1.png)

2. 在 Windsurf 中使用快捷键 Ctrl + L 弹出 AI 对话框，点击设置按钮进行设置 MCP Server。

![](../assets/images/windsurf/2.png)
![](../assets/images/windsurf/3.png)

3. 配置 `mcp_config.json` 文件，格式如下。

```json
{
  "mcpServers": {
    "my-app-mcp-server": {
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=stream06-1921-4f09-af63-51de410e9e09"
    }
  }
}
```
![](../assets/images/windsurf/7.png)

4. 点击 Refresh 会出现我们的 MCP Servers 是否成功。

![](../assets/images/windsurf/4.png)

5. 新建会话，切换到 Chat 模式，在输入框中输入需要操作的内容，这时 AI 就会调用你的前端应用中定义的 MCP 工具，操作你的前端应用。

![](../assets/images/windsurf/5.png)

## Trae
1. 在 [Trae](https://www.trae.cn/ide/download) 官网下载软件。

![](../assets/images/trae/8.png)

2. 在 Trae 使用快捷键 Ctrl + U 弹出 AI 对话框，点击设置按钮进行设置 MCP Servers。

![](../assets/images/trae/2.png)

3. 继续按照下面的步骤手动添加 MCP Servers ，格式如下：

```json
{
  "mcpServers": {
    "my-app-mcp-server": {
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=34a49b60-3368-467d-b9a0-1f067dd9d2ce"
    }
  }
}
```
![](../assets/images/trae/3.png)

4. 查看 MCP Server 是否配置成功。

![](../assets/images/trae/4.png)

5. 新建会话，在输入框中输入需要操作的内容，这时 AI 就会调用你的前端应用中定义的 MCP 工具，操作你的前端应用。

![](../assets/images/trae/5.png)

![](../assets/images/trae/6.png)

6. 查看是否调用 MCP 工具成功。

![](../assets/images/trae/7.png)

## Cherry Studio
1. 在 [Cherry Studio](https://www.cherry-ai.com/) 官网下载软件。

![](../assets/images/cherry-studio/1.png)

2. 选择助手

![](../assets/images/cherry-studio/2.png)

3.在 Cherry Studio 配置 MCP Servers。

```json
{
  "mcpServers": {
    "my-app-mcp-server": {
      "type": "streamableHttp",
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=f7e8e829-7eeb-4f10-816e-746253961237"
    }
  }
}
```

![](../assets/images/cherry-studio/4.png)

![](../assets/images/cherry-studio/5.png)

![](../assets/images/cherry-studio/6.png)


4. 查看 MCP Server 是否配置成功。

![](../assets/images/cherry-studio/7.png)


5. 新建会话，在输入框中输入需要操作的内容，选择定义的 MCP 工具，点击发送按钮。

![](../assets/images/cherry-studio/9.png)

6. 查看是否调用 MCP 工具成功。

![](../assets/images/cherry-studio/8.png)

## Cline

1. Vscode 下载 Cline 插件。

![](../assets/images/cline/1.png)

2. 用 github 账号进行登录并且在 Cline 中配置 MCP Servers。

![](../assets/images/cline/2.png)

3. 配置好后会自动生成下面的文件。

```json
{
  "mcpServers": {
    "my-app-mcp-server": {
      "autoApprove": [],
      "disabled": false,
      "timeout": 60,
      "type": "streamableHttp",
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=64b25d93-381d-4c6b-b43c-c5cf2f49445d"
    }
  }
}
```

![](../assets/images/cline/3.png)

4. 查看 MCP Server 是否配置成功。

![](../assets/images/cline/4.png)

5. 新建会话，在输入框中输入需要操作的内容，点击发送按钮。

![](../assets/images/cline/5.png)

6. 查看是否调用 MCP 工具成功。

![](../assets/images/cline/6.png)

## 通义灵码

1. 在 [通义灵码](https://lingma.aliyun.com/) 官网下载软件。

![](../assets/images/lingma/1.png)


2. 在通义灵码 IDE 使用快捷键 Ctrl + Shift + L  弹出 AI 对话框，点击设置按钮进行设置 MCP Server。

![](../assets/images/lingma/4.png)

3. 继续按照下面的步骤手动添加 MCP Servers。

![](../assets/images/lingma/5.png)

4. 手动配置格式如图。

![](../assets/images/lingma/6.png)

5. 查看 MCP Server 是否配置成功。

![](../assets/images/lingma/7.png)

6. 新建会话，选择智能体，输入需要操作的内容，点击发送按钮。

![](../assets/images/lingma/8.png)

7. 查看是否调用 MCP 工具成功。

![](../assets/images/lingma/9.png)


## Dify

1. 在 [Dify](https://dify.ai/) 官网进行登录

![](../assets/images/dify/1.png)

2.创建 Chatflow 空白应用。

![](../assets/images/dify/2.png)

![](../assets/images/dify/3.png)

3. 新建 Agent 智能体。

![](../assets/images/dify/4.png)

4. 设置 Agent 策略。

![](../assets/images/dify/5.png)

![](../assets/images/dify/6.png)

![](../assets/images/dify/7.png)

5. 设置模型。

![](../assets/images/dify/8.png)

![](../assets/images/dify/13.png)

![](../assets/images/dify/9.png)

![](../assets/images/dify/10.png)

6. MCP 服务配置中输入配置信息。

```json
{
  "my-app-mcp-server": {
    "transport": "streamable_http",
    "url": "https://ai.opentiny.design/sse?sessionId=df8f46fd-84a2-4079-88b9-b3dfef176f15"
  }
}
```
![](../assets/images/dify/11.png)

7. 查看运行是否成功。

![](../assets/images/dify/15.png)

8. 预览这个编排任务并且在输入框中输入需要操作的内容验证这个任务。

![](../assets/images/dify/12.png)

9. 查看是否调用 MCP 工具成功。

![](../assets/images/dify/19.png)


## Coze
1. 进入 [Coze](https://www.coze.cn/) 官网，登录后点击打开网页版。

![](../assets/images/coze/1.png)

2. 在 Coze 中配置 MCP Servers ，先添加管理工具。

![](../assets/images/coze/2.png)

3. 添加自定义管理工具。

```json
{
  "mcpServers": {
    "my-app-mcp-server": {
      "type": "streamableHttp",
      "url": "https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=64b25d93-381d-4c6b-b43c-c5cf2f49445d"
    }
  }
}
```

![](../assets/images/coze/3.png)

![](../assets/images/coze/4.png)

4. 查看 MCP Server 是否配置成功。

![](../assets/images/coze/5.png)

5. 新建会话，选择智能体，输入需要操作的内容，点击发送按钮。

![](../assets/images/coze/6.png)

6. 查看是否调用 MCP 工具成功。
