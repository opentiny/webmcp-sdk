# SegmentFault 文章发布 Agent Skill

## 触发条件

当前页面 URL 包含 `segmentfault.com` 时加载。

## 前置条件

1. 用户已登录 SegmentFault（Cookie 由 webmcp-cli Chrome Profile 保持）
2. 如未登录，会跳转到 `/user/login`，需用户手动登录

## 核心特性

- **执行步骤**：单条指令完成导航 → 过引导 → 填标题 → 填正文 → 设类型 → 设范围 → 加标签 → 选分类 → 设版权 → 定时发布设置 → 自动保存草稿 → 提示审核
- **快速执行**：减少不必要的等待时间，标题正文快速填入，步骤间最小间隔
- **思否自动保存**：停止输入后约 4 秒自动保存草稿，工具等待 4.5 秒确保触发
- **定时发布支持**：可设置未来日期时间，思否将在指定时间自动发布
- **封面手动上传**：工具不处理文件上传，在流程中明确提示用户手动操作
- **审核后发布**：草稿保存后需用户审核，确认无误后执行正式发布
- **舍弃草稿**：支持一键清空编辑器所有内容

## 完整流程

```bash
# 单条命令，走完所有流程
webmcp-cli run segmentfault_publish_article '{"action": "publish_full_flow", "title": "文章标题", "content": "# 正文\n\n内容...", "category": "前端", "tags": ["前端", "AI"], "scheduled_time": "2026-07-01T10:00:00+08:00"}'
```

### 流程步骤

```
1. navigate_to_write       → 导航到引导页：https://segmentfault.com/howtowrite
2. click_howtowrite_continue → 点击"我已知晓，继续撰写"按钮，进入编辑器：https://segmentfault.com/write?freshman=1
3. set_title               → 快速填写标题
4. set_content             → 快速填写正文（CodeMirror 优先，触发 change 确保保存，以MD格式输入或者文本格式）
5. set_article_type        → 设置文章类型（默认原创，radio 单选）
6. set_publish_scope       → 设置发布范围（默认个人文章）
7. add_tags                → 添加标签（选项nav-tabs或者输入搜索前端、AI等，智能分类选中即可）
8. set_category            → 选择分类（发布分类select 下拉框，默认选中：个人文章）
9. set_copyright           → 注明版权（开关按钮，设置为 true）
10. set_scheduled_publish   → 设置定时发布（可选，开关按钮，若开启设置为 true）
11. 【提示】封面图需手动上传
12. 等待自动保存（4.5秒）
13. 【人工】用户审核草稿 → https://segmentfault.com/user/draft
14. publish → 正式发布（需 confirm: true）
```

## 可用 Action

| Action | 说明 | 必填参数 |
|--------|------|----------|
| `publish_full_flow` | **文章写入**：完整流程，单条指令走完 | `title`, `content`, `category` |
| `navigate_to_write` | 导航到写文章引导页 | - |
| `click_howtowrite_continue` | 点击引导页"继续"按钮 | - |
| `write_article` | 一键写入完整文章（不含定时发布和导航） | `title`, `content`, `category` |
| `set_title` | 设置标题 | `title` |
| `set_content` | 设置正文 | `content` |
| `set_article_type` | 设置文章类型 | `type` |
| `set_publish_scope` | 设置发布范围 | `scope` |
| `add_tags` | 添加标签 | `tags` |
| `set_category` | 设置分类 | `category` |
| `set_copyright` | 设置版权 | `enabled` |
| `set_scheduled_publish` | 设置定时发布 | `scheduled_time` |
| `discard_draft` | 舍弃草稿（清空编辑器） | - |
| `get_state` | 获取编辑器状态 | - |
| `publish` | 发布文章（需 `confirm: true`） | `confirm` |

## 各 Action 详细说明

### 1. publish_full_flow（文章写入流程）

单条指令完成从导航到保存草稿的完整流程。

**参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | ✅ | - | 文章标题，5-100字符 |
| `content` | string | ✅ | - | 文章正文，支持 Markdown |
| `category` | string | ✅ | - | 分类名称，如"前端" |
| `tags` | string[] | ❌ | ["前端", "AI"] | 标签数组，最多5个 |
| `type` | string | ❌ | "original" | 文章类型：original/repost/translate |
| `scope` | string | ❌ | "personal" | 发布范围：personal |
| `copyright` | boolean | ❌ | true | 版权开关 |
| `scheduled_time` | string | ❌ | - | 定时发布时间，ISO 8601格式，如 `2026-07-01T10:00:00+08:00` |

**执行流程：**

```
1. 检测当前页面状态
   - 如未登录 → 返回错误，提示手动登录
   - 如在编辑器 → 跳过导航和引导
   - 如在引导页 → 跳过导航，直接过引导
   - 其他 → 导航到 /howtowrite

2. 过引导页（如需要）
   - 查找"我已知晓"/"继续撰写"按钮并点击
   - 等待进入编辑器（最多 6 秒）
   - 进入后等待 800ms 让编辑器初始化

3. 确认编辑器就绪
   - 等待标题输入框出现

4. 快速填写标题
   - 定位标题输入框
   - 模拟输入，间隔 100ms

5. 快速填写正文
   - 优先 CodeMirror 编辑器
   - 其次 textarea
   - 最后富文本编辑器

6. 设置文章类型（默认原创）
   - 查找原创单选按钮并选中
   - 如已选中则跳过

7. 设置发布范围（默认个人文章）
   - 查找个人文章单选按钮并选中

8. 添加标签（默认前端、AI）
   - 逐个输入标签
   - 从下拉建议中选择匹配项
   - 无匹配则按 Enter 创建新标签
   - 每个标签最多重试 3 次

9. 选择分类
   - 从下拉框中选择对应分类

10. 设置版权（默认开启）
    - 勾选版权开关

11. 设置定时发布（如提供 scheduled_time）
    - 点击定时发布选项
    - 选择日期和时间

12. 提示封面上传
    - 输出提示：封面图需用户手动上传

13. 等待自动保存
    - 思否停止输入4秒后自动保存
    - 工具等待4.5秒确保触发

14. 返回结果
    - 成功：提示前往草稿箱审核
    - 失败：返回具体错误
```

**返回示例：**

```json
{
  "success": true,
  "data": {
    "steps_completed": 10,
    "draft_url": "https://segmentfault.com/user/draft",
    "scheduled": false,
    "cover_upload_needed": true
  },
  "message": "✅ 文章写入完成！文章已保存至草稿箱\n\n[步骤详情]\n\n🔍 请前往草稿箱审核: https://segmentfault.com/user/draft\n✅ 审核通过后回复\"确认发布\"执行发布"
}
```

### 2. navigate_to_write

导航到 SegmentFault 写文章引导页（`https://segmentfault.com/howtowrite`）。

**返回：**
- 已在编辑器 → `page_type: editor`
- 在登录页 → `error: NOT_LOGGED_IN`
- 在引导页 → `page_type: howtowrite`
- 导航中 → `page_type: navigating`

### 3. click_howtowrite_continue

点击引导页"继续"按钮（"我已知晓，继续撰写"），进入编辑器（`https://segmentfault.com/write?freshman=1`）。

**返回：**
- 成功进入编辑器 → `success: true`
- 不在引导页 → `error: NOT_HOWTOWRITE`
- 未找到按钮 → `error: BUTTON_NOT_FOUND`

### 4. write_article

一键写入完整文章（不含定时发布，不含导航）。

**参数：** `title`, `content`, `category`, `tags`, `type`, `scope`, `copyright`

**说明：** 依次调用 set_title → set_content → set_article_type → set_publish_scope → add_tags → set_category → set_copyright，最后等待4.5秒自动保存。

### 5. set_title

设置文章标题。

**参数：** `title`（5-100字符）

**实现：**
- 查找标题输入框（`input[placeholder*="标题"]`、`input[name="title"]` 等）
- 使用原生 setter 设置值，模拟 focus/input/change/blur 事件
- 验证最终值是否匹配

### 6. set_content

设置文章正文。

**参数：** `content`（支持 Markdown）

**实现优先级：**
1. **CodeMirror 5**：通过 `.CodeMirror` 实例 `setValue()`，并触发 `change` 事件 + 隐藏 textarea 的 `input` 事件，确保思否自动保存感知
2. **CodeMirror 6**：通过 `cm-editor` view dispatch changes
3. **Textarea**：模拟输入事件
4. **富文本编辑器**：设置 `innerHTML`

### 7. set_article_type

设置文章类型。

**参数：** `type`（"original" | "repost" | "translate"，默认 "original"）

**实现：** 查找对应 radio 单选按钮，如已选中则跳过，否则点击 label 或 input 并触发 change 事件。

### 8. set_publish_scope

设置发布范围。

**参数：** `scope`（默认 "personal"）

**实现：** 查找个人文章 radio 并选中。

### 9. add_tags

添加文章标签。

**参数：**
- `tags`: string[]（标签数组，默认 ["前端", "AI"]）
- `clear_existing`: boolean（是否清空已有标签，默认 false）

**实现：**
- 定位标签输入框
- 如需清空，先点击所有移除按钮
- 逐个输入标签文本
- 等待下拉建议出现，点击匹配项
- 无匹配时按 Enter 创建
- 每个标签最多重试 3 次
- 最多支持5个标签

### 10. set_category

选择文章分类。

**参数：** `category`（分类名称，如 "前端"）

**实现：** 从 `select[name="category"]` 中查找匹配 option，设置 value 并触发 change。

### 11. set_copyright

设置版权开关。

**参数：** `enabled`（boolean，默认 true）

**实现：** 查找版权 checkbox，如状态不符则点击关联 label 切换。

### 12. set_scheduled_publish

设置定时发布。

**参数：** `scheduled_time`（ISO 8601 格式，如 `2026-07-01T10:00:00+08:00`）

**实现：**
- 查找定时发布选项/按钮（如"定时发布"、"scheduled"相关元素）
- 点击展开日期时间选择器
- 根据 `scheduled_time` 解析年月日时分
- 尝试 `datetime-local` 输入框直接设置
- 点击确认

**注意：** 如不提供 `scheduled_time`，则使用立即发布。

### 13. discard_draft

舍弃草稿，清空编辑器所有内容。

**实现逻辑：**
1. **优先点击"舍弃草稿"按钮**：查找 `button:contains("舍弃草稿")`、`[class*="discard"]` 等，点击后处理确认弹窗
2. **兜底手动清空**：如找不到按钮，手动执行：
   - 标题输入框设为空
   - CodeMirror/textarea 内容清空
   - 移除所有已选标签
   - 重置分类选择

**警告：** 舍弃草稿不可逆，清空后无法恢复！

### 14. get_state

获取编辑器当前状态，用于检查是否可以发布。

**返回数据：**

| 字段 | 说明 |
|------|------|
| `page_type` | 当前页面类型 |
| `title` | 当前标题 |
| `title_valid` | 标题是否有效（5-100字符） |
| `content_length` | 正文长度 |
| `content_valid` | 正文是否非空 |
| `tags` | 已选标签数组 |
| `tags_valid` | 标签是否有效（1-5个） |
| `category` | 当前分类 |
| `category_valid` | 是否已选分类 |
| `copyright` | 版权开关状态 |
| `can_publish` | 是否满足发布条件 |
| `errors` | 不满足条件的错误列表 |
| `draft_url` | 草稿箱链接 |

### 15. publish

正式发布文章。

**参数：** `confirm`（必须传 `true`）

**流程：**
1. 检查 `confirm` 是否为 `true`，否则返回提示审核草稿
2. 调用 `get_state()` 检查发布条件
3. 条件不满足 → 返回错误及原因
4. 条件满足 → 点击发布按钮
5. 处理可能的确认弹窗
6. 检测 URL 是否变为文章页（`/a/`）
7. 返回发布结果及文章链接

## 完整发布流程（分步版）

如需分步执行，按以下顺序：

```bash
# 步骤1：导航到引导页
webmcp-cli run segmentfault_publish_article '{"action":"navigate_to_write"}'

# 步骤2：过引导（如需要）
webmcp-cli run segmentfault_publish_article '{"action":"click_howtowrite_continue"}'

# 步骤3：写入（自动保存草稿）
webmcp-cli run segmentfault_publish_article '{"action": "publish_full_flow", "title": "我的文章标题", "content": "# 正文\n\n这是文章内容...", "category": "前端", "tags": ["前端", "AI", "Vue"], "scheduled_time": "2026-07-01T10:00:00+08:00"}'

# 步骤4：【人工】用户手动上传封面图

# 步骤5：【人工】用户前往草稿箱审核内容
# https://segmentfault.com/user/draft

# 步骤6：正式发布（需确认）
webmcp-cli run segmentfault_publish_article '{"action":"publish","confirm":true}'
```

## 注意事项

1. **无需手动保存**：思否自动保存机制完善，所有写入操作后等待 4.5 秒确保自动保存触发
2. **封面图需手动上传**：工具不处理文件上传，会在流程中明确提示用户
3. **定时发布可选**：不提供 `scheduled_time` 则使用立即发布；提供则设置定时发布
4. **发布需人工确认**：必须先审核草稿（https://segmentfault.com/user/draft），再传入 `confirm: true` 发布
5. **舍弃草稿不可逆**：清空后无法恢复，请谨慎使用
6. **标签默认前端+AI**：可通过 `tags` 参数自定义，最多5个
7. **文章类型默认原创**：可通过 `type` 参数改为 repost/translate
8. **版权默认开启**：可通过 `copyright: false` 关闭

## 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `NOT_LOGGED_IN` | 未登录 | 手动登录 SegmentFault |
| `NOT_HOWTOWRITE` | 不在引导页 | 检查当前页面 |
| `NOT_EDITOR` | 不在编辑器 | 先执行 navigate_to_write |
| `EDITOR_NOT_READY` | 编辑器未完全加载 | 刷新页面重试 |
| `NAV_TIMEOUT` | 页面导航超时 | 检查网络连接 |
| `GUIDE_FAILED` | 引导页处理失败 | 检查按钮是否存在 |
| `EMPTY` | 参数为空 | 检查必填参数 |
| `TOO_SHORT` | 标题过短 | 标题至少5字符 |
| `TOO_LONG` | 标题过长 | 标题最多100字符 |
| `TOO_MANY` | 标签过多 | 最多5个标签 |
| `NOT_FOUND` | 元素未找到 | 页面结构可能变化 |
| `SET_FAILED` | 设置失败 | 重试或检查页面状态 |
| `EDITOR_NOT_FOUND` | 未找到编辑器 | 检查编辑器是否加载 |
| `INVALID_TYPE` | 无效文章类型 | 使用 original/repost/translate |
| `INVALID_TIME` | 时间格式错误 | 使用 ISO 8601 格式 |
| `PAST_TIME` | 定时时间为过去 | 设置未来时间 |
| `CANNOT_PUBLISH` | 不满足发布条件 | 查看 errors 列表 |
| `NOT_CONFIRMED` | 未确认发布 | 先审核草稿，再传 confirm:true |
| `UNKNOWN_ACTION` | 未知操作 | 检查 action 参数 |
| `EXEC_ERROR` | 执行异常 | 查看具体错误信息 |
