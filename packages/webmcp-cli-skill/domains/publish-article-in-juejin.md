# 自动化掘金文章发布专家指南

本指南面向 AI Agent，详细说明如何使用 `webmcp-cli` 与浏览器交互，在掘金发布文章

---

### 1. 详细发布步骤

#### 第一步：打开编辑器并同步状态

使用`state` 命令查询当前激活的标签，如果已经打开了https://juejin.cn/editor/drafts/new?v=2 页面，则进入一下步。

```bash
webmcp-cli state
```

否则使用 `tabs open` 命令进入新建草稿页，并必须立即调用 `state` 获取当前页面的 DOM 索引：

```bash
webmcp-cli tabs open "https://juejin.cn/editor/drafts/new?v=2"
webmcp-cli state
```

#### 第二步：填写文章标题

网页上已经存在create_article的页面工具，将标题和正文的base64编码传递进去。

```bash
webmcp-cli run create_article '{"title":"文章标题"， "content":"正文的base64编码"}'
```

#### 第三步：点击发布按钮

为了保存并更新 DOM 状态，注入正文后**必须**重新执行 `state` 命令：

```bash
webmcp-cli state
```

在输出中找到包含文本为 `发布` 的按钮，例如：
`[5]<button class="publish-btn">发布</button>`
执行 `click`：

```bash
webmcp-cli run page-agent-tool '{"action": "click", "index": 5}'
```

#### 第五步：处理发布设置弹窗

点击右上角发布后，页面会弹出“发布文章”的设置窗口。在该窗口中，有 **三项红星必填项（分类、添加标签、编辑摘要）** 必须正确填写，否则“确定并发布”按钮将处于禁用状态或无法成功发布。

此时需要再次运行 `state` 刷新弹窗内的元素索引：

```bash
webmcp-cli state
```

请依次完成以下三项必填设置：

##### 1. 选择分类（必填 `*`）

定位到分类按钮区域（如 `前端`、`后端`、`Android`、`iOS`、`人工智能`、`开发工具` 等），对目标分类执行 `click` 操作。例如，选择“前端”分类（假设其索引为 12）：

```bash
webmcp-cli run page-agent-tool '{"action": "click", "index": 12}'
```

##### 2. 添加标签（必填 `*`）

必须添加一个标签。总结文章所讲述的对象确定为标签名。 然后定位到 `请搜索添加标签` 输入框（通常是一个 input 元素，假设其索引为 14），使用 `fill` 写入标签名称后触发回车：

```bash
webmcp-cli run page-agent-tool '{"action": "fill", "index": 14, "text": "TypeScript"}'
```

##### 3. 编辑摘要（必填 `*`）

总结文章所讲述的内容，生成 100 字以内的文章简要概述。

- 寻找 `编辑摘要` 下方的 `<textarea>` 输入框（该文本框是原生 HTML 元素，无需 CodeMirror 特殊处理，假设其索引为 18）。
- 使用 `fill` 填入摘要文本：
  ```bash
  webmcp-cli run page-agent-tool '{"action": "fill", "index": 18, "text": "这是一篇关于 WebMCP 自动化工具的实战教程，用幽默风趣的语言带你玩转浏览器自动化控制..."}'
  ```

---

#### 第六步：确定并发布

完成上述三个必填项的填写与确认后：

1. 再次执行 `state` 确认页面元素状态。
2. 找到弹窗右下角的 `确定并发布` 按钮（假设其索引为 22）。
3. 执行 `click` 完成最终发布：
   ```bash
   webmcp-cli run page-agent-tool '{"action": "click", "index": 22}'
   ```

---

## 三、 高级实战避坑与优化指南

基于真实发布流程的调试，在开发其他发布平台或进行复杂 DOM 交互时，**必须**遵循以下优化准则：

### 1. 规避 Shell/JSON 转义地狱的“黄金法则”

向调用 create_article 工具时，标题中不要有特殊字符，因为它是通过json传递给cli 命令程序的参数的，如果有特殊的引号之类的，容易造成cli 命令解析失败。
文章的正文需要要 base64 编码之后再传入。

### 2. 突破框架（Vue/React）表单“双向绑定”防线

在许多现代单页应用中，如果直接通过 JS 修改 `input.value`，由于绕过了框架的 Synthetic Event 机制，底层的 Vue/React State 无法感知数据变化，导致提交时仍被拦截并报错（例如提示“至少添加一个标签”）。

- **最佳交互方案**：分步模拟真实用户操作：
  1. 第一步：先调用 `click` 点击激活输入框（如标签搜索框），使页面弹出下拉选项或触发焦点事件。
  2. 第二步：必须立即调用一次 `state` 获取最新的 DOM content，定位到下拉框中渲染出来的真实项（如带 `role="button"` 的选项）。
  3. 第三步：对该真实的选项元素执行 `click` 动作。只有这样，才能确保完美触发底层的组件数据同步。
