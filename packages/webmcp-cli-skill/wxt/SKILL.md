---
name: webmcp-cli-wxt
description: 面向第三方 AI Agent 的 WXT 扩展桥接模式执行指南：通过 Tiny Robot 扩展 WebSocket 桥接操控用户真实浏览器，复用登录态/Cookie，支持双向本地 Bash 协同与高层自主 Agent 委托。
license: MIT
metadata:
  author: opentiny
  version: '2.0.0'
---

# WebMCP CLI (WXT 扩展桥接模式) Skill

本 Skill 指导 AI Agent 如何通过 `@opentiny/webmcp-cli --mode wxt` 与用户正在使用的真实 Chrome 浏览器（通过 Tiny Robot 扩展）进行双向通信与操控。

## 适用场景与特征

- **复用真实用户数据**：直接在用户正在使用的浏览器窗口中工作，**完美继承用户的登录态、Cookie、企业内网 SSO 会话、已有标签页**，告别验证码和重新登录。
- **扩展与本地双向协同**：
  - 本地 Agent 可直接操控浏览器中的网页；
  - 浏览器扩展在遇到需本地环境的任务时，可通过 WebSocket 桥接安全请求本地执行 bash 指令或选择目录。
- **高层子代理委托 (`agent run`)**：除了单步交互，可直接将高层任务整包委托给扩展内的 Tiny Robot 自主多轮执行。
- **标识特征**：
  - 必须携带模式参数：`webmcp-cli --mode wxt <command>`（或在终端设置环境变量 `export WEBMCP_MODE=wxt`）；
  - Tab ID 格式为 **纯数字**（Chrome Tab ID，如 `1024`）；
  - 依赖用户已安装并启用 Tiny Robot 扩展。

## 安装

当 shell 终端提示找不到工具时执行：

```bash
npm install -g @opentiny/webmcp-cli
```

---

## 快速准备与前置排查

### 1. 认证 Token 与配对

CLI 与扩展之间通过 Token 进行安全鉴权，默认保存在 `~/.robot-wxt/bridge-token`。

```bash
# 查看当前本地 Token（若扩展未连接，可将输出的 Token 配置到扩展设置中）
webmcp-cli --mode wxt token

# 将已有的扩展 Token 同步到本地
webmcp-cli --mode wxt token set <你的Token>
```

### 2. 后台守护进程（Daemon）

无需手动启动服务，执行任何 WXT 命令时 CLI 会**自动拉起**后台 WebSocket 桥接进程（监听 `127.0.0.1:18999`）。
如需手动释放端口或停止后台服务：

```bash
webmcp-cli --mode wxt stop
```

### 3. 连接异常排查

若执行命令报连接超时或等待扩展连接，请指导用户：
1. 检查 Chrome 右上角是否已安装并启用 Tiny Robot 扩展；
2. 确认扩展弹窗中的 Bridge Token 是否与 `webmcp-cli --mode wxt token` 一致。

---

## 交互模式一：高层子代理委托 (`agent run`) — 推荐

对于复杂、跨步骤的开放式任务（如“帮我查一下上个月的订单并导出报表”、“把该商品加入购物车”），**优先整包委托扩展自主执行**，无需本地逐行编写点击代码：

```bash
# 委托扩展内的 Tiny Robot 自主执行
webmcp-cli --mode wxt agent run "帮我把购物车中的第一个商品结算"

# 限制最大步数自主执行
webmcp-cli --mode wxt agent run --max-steps 10 "搜索最新的 TinyVue 实战教程"

# 针对指定页签执行
webmcp-cli --mode wxt agent run --tab 1024 "审批当前页面的加班申请，意见填同意"
```

---

## 交互模式二：细粒度自主交互（标准流程）

### 1. 状态感知与标签页管理

```bash
# 查询当前活跃标签页与可用工具
webmcp-cli --mode wxt state

# 查询指定标签页（注意：WXT 模式下 Tab ID 必须为纯数字）
webmcp-cli --mode wxt state --tab 1024

# 标签页操作
webmcp-cli --mode wxt tabs open "https://console.cloud.example.com"
webmcp-cli --mode wxt tabs switch 1024
webmcp-cli --mode wxt tabs close 1024
webmcp-cli --mode wxt tabs back
webmcp-cli --mode wxt tabs forward
```

### 2. 页面元素感知与操作 `page-agent-tool`

每个页面均会自动注入该工具。支持动作：
`browserState`、`searchTree`、`click`、`fill`、`select`、`scroll`、`executeJavascript`。

#### (1) 终端 JSON 参数转义规则
- **bash / zsh 终端**：单引号包裹 JSON：`webmcp-cli --mode wxt run page-agent-tool '{"action": "click", "index": 0}'`
- **cmd 终端**：双引号包裹，内部双引号转义：`"{\"action\": \"click\", \"index\": 0}"`
- **PowerShell 终端**：单引号包裹，内部双引号反斜杠转义：`'{\"action\": \"click\", \"index\": 0}'`

#### (2) `searchTree` 优先决策树（降低 80%+ Token）

```
已知要找的元素类型或文字（如“搜索”、“立即购买”、“button”）？
    ↓ 是
    → 先用 searchTree 搜索
        ↓ 找到了？
            是 → 直接使用命中的 #N 索引操作（click / fill 等）
            否 → 再用 browserState(full) 获取全量树兜底
    ↓ 否（初次进入未知页面或探索全局结构）
    → 用 browserState(full) 抓取完整树
```

**示例：**
```bash
# 精准按关键词搜索元素并获取 #N 索引
webmcp-cli --mode wxt run page-agent-tool '{"action": "searchTree", "query": "提交"}'
webmcp-cli --mode wxt run page-agent-tool '{"action": "searchTree", "query": "button"}'
```

#### (3) 获取页面无障碍树

```bash
# 抓取完整无障碍树
webmcp-cli --mode wxt run page-agent-tool '{"action": "browserState", "responseMode": "full"}'
```

无障碍树节点格式：`- role #N [tokens] "accessible name"`
- `#N` 为唯一操作索引，每次交互后重新分配，严禁复用历史旧索引。

#### (4) 交互操作（自动返回 diff 增量）

```bash
# 点击指定索引
webmcp-cli --mode wxt run page-agent-tool '{"action": "click", "index": 12}'

# 输入文本
webmcp-cli --mode wxt run page-agent-tool '{"action": "fill", "index": 15, "text": "华为商城"}'

# 下拉选择
webmcp-cli --mode wxt run page-agent-tool '{"action": "select", "index": 8, "value": "option_val"}'

# 滚动
webmcp-cli --mode wxt run page-agent-tool '{"action": "scroll", "direction": "down", "amount": 400}'
```

> **提示**：操作完成后工具会自动返回最新界面的 diff 增量，优先分析 diff 决定下一步，无需重复抓取全局树。

---

## 业务技能探索 (`skills`)

查看扩展当前已载入的业务技能说明（例如企业内部价保审核、商品销售分析规则等）：

```bash
# 列出扩展已同步的所有业务技能
webmcp-cli --mode wxt skills list

# 查看指定技能的业务流程与规则说明书
webmcp-cli --mode wxt skills get price-protection
```


---

## 启动为标准 MCP 服务

可在 Cursor、Antigravity 或 Claude Desktop 中挂载 WXT 桥接模式：

```bash
# 细粒度操作工具暴露
webmcp-cli --mode wxt mcp

# 高层子代理委托模式（暴露 browser_state 与 browser_sub_agent_run 工具，将任务托付给扩展自主规划执行）
webmcp-cli --mode wxt mcp --agent
```
