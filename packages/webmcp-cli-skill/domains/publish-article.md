# 自动化文章发布专家指南

本指南面向 AI Agent，详细说明如何使用 `webmcp-cli` 与浏览器交互，自动化地在各个技术与社交平台（首期支持掘金平台，预留小红书扩展）发布高质量文章。

---

## 核心任务要求

在撰写并发布文章时，必须严格遵守以下两条质量红线：

1. **文笔风格：幽默风趣**
   - 拒绝枯燥学术的陈述，多采用生动形象的日常比喻和调侃。
   - 适度自黑、加入程序员特有的幽默梗，让技术文章充满趣味性和可读性。
2. **技术质量：准确无误**
   - 涉及到的关键技术原理、API 接口和工具用法必须准确可靠，不能信口开河。
   - 贴出的代码段必须通过测试或保证逻辑无误，确保读者可以直接运行。

---

## 平台一：掘金 (Juejin) 发布指南

掘金文章编辑器网址：`https://juejin.cn/editor/drafts/new?v=2`

### 1. 核心挑战：CodeMirror 5 与 6 编辑器状态同步

> [!IMPORTANT]
> 掘金的富文本编辑器根据版本不同，底层可能使用的是 **CodeMirror 5**（如 ByteMD 编辑器，类名为 `.CodeMirror`）或 **CodeMirror 6**（类名为 `.cm-editor`）。页面上可见的 `<textarea>` 只是隐藏的代理元素。如果直接通过普通的 `fill` 操作向代理 `textarea` 填入内容，编辑器不会同步渲染，且无法触发掘金草稿的自动保存机制。
> **唯一正确的做法**：直接通过 `executeJavascript` 判断编辑器版本，并调用其底层的 `setValue` 或 `dispatch` 方法替换整个文档状态。

为了彻底规避 Markdown 文本中的换行符、双引号、中文等特殊字符在 **Shell → JSON → JS** 三层传递时导致的解析失败和乱码问题，我们必须采用 **Base64 编码注入方案**（Base64 只含 `A-Za-z0-9+/=`，对三层环境均完全安全，优于 URI 编码）。

**Agent 侧（Node.js）生成 Base64：**
```javascript
// 在构造 CLI 命令前，先将文章内容转为 Base64
const content = "# 你的文章内容\n包含中文和特殊字符..."
const base64Content = Buffer.from(content, 'utf-8').toString('base64')
// 将 base64Content 嵌入下方注入脚本模板
```

**核心 JavaScript 兼容注入脚本模板（Base64 版）：**
```javascript
(function() {
  // 注意：不能直接用 atob()，atob 只支持 Latin-1，中文需要两步解码
  const base64 = "<YOUR_BASE64_ENCODED_ARTICLE_CONTENT>";
  const content = decodeURIComponent(
    atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );

  // 1. CodeMirror 5 注入 (如 ByteMD)
  const cm5El = document.querySelector('.CodeMirror');
  if (cm5El && cm5El.CodeMirror) {
    cm5El.CodeMirror.setValue(content);
    return "cm5_success";
  }

  // 2. CodeMirror 6 注入
  const cm6View = document.querySelector('.cm-editor')?.cmView?.view;
  if (cm6View) {
    cm6View.dispatch({
      changes: { from: 0, to: cm6View.state.doc.length, insert: content }
    });
    return "cm6_success";
  }

  // 3. 兜底普通 textarea 写入
  const textarea = document.querySelector('.bytemd-editor textarea') || document.querySelector('textarea');
  if (textarea) {
    textarea.value = content;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return "textarea_fallback";
  }

  return "editor_not_found";
})()
```

### 2. 详细发布步骤

#### 第一步：打开编辑器并同步状态
使用 `tabs open` 命令进入新建草稿页，并必须立即调用 `state` 获取当前页面的 DOM 索引：
```bash
webmcp-cli tabs open "https://juejin.cn/editor/drafts/new?v=2"
webmcp-cli state
```

#### 第二步：填写文章标题
在 `state` 输出的 `content` 中，找到占位符为 `输入文章标题...` 的输入框元素。例如：
`[2]<input class="title-input" placeholder="输入文章标题..." />`
使用 `page-agent-tool` 的 `fill` 操作输入标题：
```bash
webmcp-cli run page-agent-tool '{"action": "fill", "index": 2, "text": "你的幽默风趣技术标题"}'
```

#### 第三步：注入文章正文
1. 在 Agent 侧（Node.js）将 Markdown 正文转为 Base64：`Buffer.from(content, 'utf-8').toString('base64')`
2. 将 Base64 字符串嵌入脚本模板，通过 `executeJavascript` 执行：
```bash
# 示例：正文 "# 标题\n内容" 的 Base64 为 "IyDmkJHpg6jKCuWGheWtlw=="
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "(function(){ var b=\"IyDmkJHpg6jKCuWGheWtlw==\"; var c=decodeURIComponent(atob(b).split(\"\").map(function(x){return \"%\"+x.charCodeAt(0).toString(16).padStart(2,\"0\")}).join(\"\")); var v=document.querySelector(\".cm-editor\")?.cmView?.view; if(v){v.dispatch({changes:{from:0,to:v.state.doc.length,insert:c}});return \"ok\";} var cm=document.querySelector(\".CodeMirror\"); if(cm&&cm.CodeMirror){cm.CodeMirror.setValue(c);return \"ok\";} return \"not_found\"; })()"}'
```

#### 第四步：点击发布按钮
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
必须至少添加一个标签。你可以通过以下两种方式之一进行操作：
- **方式 A（推荐）**：直接点击弹窗中推荐的热门标签。在 `state` 输出中找到如 `JavaScript`、`前端`、`Vue.js` 等标签按钮的索引，执行 `click`。例如点击“JavaScript”标签（假设其索引为 15）：
  ```bash
  webmcp-cli run page-agent-tool '{"action": "click", "index": 15}'
  ```
- **方式 B**：定位到 `请搜索添加标签` 输入框（通常是一个 input 元素，假设其索引为 14），使用 `fill` 写入标签名称后触发回车：
  ```bash
  webmcp-cli run page-agent-tool '{"action": "fill", "index": 14, "text": "TypeScript"}'
  ```

##### 3. 编辑摘要（必填 `*`）
在摘要文本域中必须填入 100 字以内的文章简要概述。
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

### 1. 规避 Shell/JSON 转义地狱与中文乱码的"黄金法则"
当需要向页面注入长文本（如包含中文、换行、双引号、反斜杠的 Markdown）时，直接拼接文本极易导致 CLI 工具解析失败或中文乱码。

**推荐等级（从高到低）：**

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Base64（首选）** | 只含 `A-Za-z0-9+/=`，对 Shell/JSON/JS 三层均安全；中文绝对不会乱码 | 需要 Agent 侧预处理一步 |
| URI 编码 | 可读性稍好 | 中文编码为 `%E6%B1%89` 等长串，部分终端或工具仍可能乱码；不如 Base64 彻底 |
| 直接拼接 | 无需预处理 | 极易因引号/换行/反斜杠导致解析失败，**禁止使用** |

**Base64 标准做法：**
- **Agent 侧（Node.js）编码**：`Buffer.from(content, 'utf-8').toString('base64')`
- **浏览器侧（JS）解码**：
  ```javascript
  // ⚠️ 不能直接用 atob()！atob 只支持 Latin-1，中文必须两步处理
  const content = decodeURIComponent(
    atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  );
  ```

### 2. 突破框架（Vue/React）表单“双向绑定”防线
在许多现代单页应用中，如果直接通过 JS 修改 `input.value`，由于绕过了框架的 Synthetic Event 机制，底层的 Vue/React State 无法感知数据变化，导致提交时仍被拦截并报错（例如提示“至少添加一个标签”）。
- **最佳交互方案**：分步模拟真实用户操作：
  1. 第一步：先调用 `click` 点击激活输入框（如标签搜索框），使页面弹出下拉选项或触发焦点事件。
  2. 第二步：必须立即调用一次 `state` 获取最新的 DOM content，定位到下拉框中渲染出来的真实项（如带 `role="button"` 的选项）。
  3. 第三步：对该真实的选项元素执行 `click` 动作。只有这样，才能确保完美触发底层的组件数据同步。

### 3. page-agent-tool 的 0 值索引（index: 0）判定避坑
- 在旧版本的 `page-agent-tool.ts` 实现中，曾存在将 `!args.index` 作为参数校验的 Bug（导致 `index: 0` 时被错误识别为 `falsy` 值并报错说缺少索引）。
- **优化建议**：在使用 CLI 编写工具时，如果遇到 index 为 0 无法操作的问题，应优先使用 `executeJavascript` 来选择并操作首个元素，或者使用较新修复了该 Bug 的组件版本。

---

## 平台二：小红书 (XiaoHongShu) 扩展规划

小红书创作者后台发布网址：`https://creator.xiaohongshu.com/publish/publish`

针对小红书平台的自动化发布，主要交互流规划如下：

### 1. 元素输入机制
小红书发布页面采用常规的 DOM 元素输入，无需类似 CodeMirror 6 的复杂 dispatch 机制。可以直接使用 `webmcp-cli` 的 `fill` 命令对标题和正文进行输入：
- **标题输入框**：查找 `placeholder="填写标题"` 的 input 元素，执行 `fill`。
- **正文输入框**：查找包含描述信息或类似 `class="post-content"` 的编辑器区域，执行 `fill`。

### 2. 媒体文件上传（扩展中）
小红书发布强制要求上传图片或视频。后续版本中，将支持利用 WebMCP 的拖拽/文件选择器代理工具，定位到 `type="file"` 的 input 元素，并将本地图片路径填入以触发上传。

### 3. 发布操作
1. **添加话题**：查找带有 `#` 标识的话题按钮，或在正文内填充 `#话题名称#`。
2. **提交发布**：定位到页面最下方的“发布”按钮，执行 `click` 完成发布。
