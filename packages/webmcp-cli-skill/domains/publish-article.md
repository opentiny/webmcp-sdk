# 自动化文章发布专家指南

本指南面向 AI Agent，使用 `webmcp-cli` 自动化发布文章到各技术平台。

---

## 核心质量要求

发布文章时必须遵守以下质量红线：

1. **文笔风格：幽默风趣** — 拒绝枯燥陈述，多用日常比喻和调侃，加入程序员幽默梗。
2. **技术质量：准确无误** — 关键技术原理、API 用法必须准确；代码段须保证逻辑无误，可直接运行。

---

## 平台指南

| 平台 | 状态 | 详细文档 |
|------|------|---------|
| 掘金 (Juejin) | ✅ 已支持 | [publish-article-in-juejin.md](./publish-article-in-juejin.md) |
| CSDN | ✅ 已支持 | [publish-article-in-csdn.md](./publish-article-in-csdn.md) |
| 开源中国 (OSChina) | ✅ 已支持 | [publish-article-in-oschina.md](./publish-article-in-oschina.md) |
| 思否 (SegmentFault) | ✅ 已支持 | [publish-article-in-segmentfault.md](./publish-article-in-segmentfault.md) |
| 小红书 (XiaoHongShu) | 🚧 规划中 | 见下方"平台扩展规划" |
| 思否（SegmentFault）| ✅ 已支持 | [publish-article-in-segmentfault.md](./publish-article-in-segmentfault.md) |
| 知乎 (Zhihu) | ✅ 已支持 | [publish-article-in-zhihu.md](./publish-article-in-zhihu.md) |
---

## 通用避坑准则

以下规则适用于所有平台，在操作任何复杂 DOM 交互前**必须**遵守。

### 1. 规避 Shell/JSON 转义地狱的黄金法则

向页面注入长文本（含中文、换行、双引号、反斜杠）时，**禁止**直接拼接文本。

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Base64（首选）** | 只含 `A-Za-z0-9+/=`，对 Shell/JSON/JS 三层均安全；中文绝不乱码 | 需 Agent 侧预处理 |
| URI 编码 | 可读性稍好 | 部分终端仍可能乱码，不如 Base64 彻底 |
| 直接拼接 | 无需预处理 | 极易因引号/换行导致解析失败，**禁止使用** |

**标准做法：**
```javascript
// Agent 侧（Node.js）编码
const base64 = Buffer.from(content, 'utf-8').toString('base64')

// 浏览器侧（JS）解码 —— ⚠️ 不能直接 atob()，中文需两步处理
const content = decodeURIComponent(
  atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
);
```

**当参数过长时，使用 `-f` 选项读取文件：**
```bash
# 将 JSON 参数写入文件，避免命令行超长
webmcp-cli run page-agent-tool -f ./args.json
```

### 2. 突破框架（Vue/React）表单"双向绑定"防线

直接通过 JS 修改 `input.value` 会绕过框架的 Synthetic Event 机制，导致提交时报错（如"至少添加一个标签"）。

**正确操作顺序：**
1. `click` 激活输入框（触发焦点/下拉事件）
2. 立即调用 `state` 获取最新 DOM，定位下拉框中渲染出的真实选项
3. 对真实选项元素执行 `click`

### 3. index: 0 的 falsy 判断陷阱

旧版 `page-agent-tool` 中曾有 `!args.index` 作为校验的 Bug，导致 `index: 0` 时报错"缺少索引"。遇到此问题时改用 `executeJavascript` 操作首个元素，或升级到已修复的版本。

---

## 平台扩展规划

### 小红书 (XiaoHongShu)

创作者后台：`https://creator.xiaohongshu.com/publish/publish`

- **输入机制**：常规 DOM，无需 CodeMirror dispatch，直接 `fill`。
  - 标题：查找 `placeholder="填写标题"` 的 input
  - 正文：查找描述区域的编辑器元素
- **媒体上传**（扩展中）：小红书强制要求图片/视频，后续版本将支持通过 WebMCP 的文件选择器代理工具上传。
- **话题**：在正文内填充 `#话题名称#`，或查找带 `#` 标识的话题按钮点击。
- **发布**：定位页面底部"发布"按钮，执行 `click`。
