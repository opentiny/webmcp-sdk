# skills 技能开发指南

本文档将详细介绍如何在 AI Extension 浏览器扩展中开发 skills 技能，包括技能元信息配置、系统提示词编写、工具列表定义以及技能注册方法。

## 概述

skills（技能）是 AI Extension 浏览器扩展的专家系统功能模块，它允许你为 AI 助手定义专业角色和能力。当用户在对话中输入 `@` 符号时，可以选择并激活特定的技能，AI 助手将根据技能的系统提示词和工具列表，以专业专家的身份响应用户需求。

### 核心特性

- **专家角色定义**：通过系统提示词定义 AI 的专业角色和行为模式
- **工具自动关联**：技能可以声明需要的 MCP 工具，系统会自动检查工具可用性
- **多专家协作**：支持同时激活多个技能，实现多专家协作模式
- **灵活调用**：通过 `@` 符号快速激活技能，支持别名匹配

## 前置准备

在开始开发 skills 技能之前，你需要先获取项目代码并完成环境配置。

### Fork 仓库

1. 访问 [next-sdk 仓库](https://github.com/opentiny/next-sdk)
2. 点击右上角的 "Fork" 按钮，将仓库 Fork 到你的 GitHub 账号

### Clone 仓库

Fork 完成后，将仓库克隆到本地：

```bash
# 克隆你 Fork 的仓库（将 YOUR_USERNAME 替换为你的 GitHub 用户名）
git clone https://github.com/YOUR_USERNAME/next-sdk.git

# 或者使用 SSH（如果你配置了 SSH 密钥）
git clone git@github.com:YOUR_USERNAME/next-sdk.git

# 进入项目目录
cd next-sdk
```

### 安装依赖

项目使用 pnpm 作为包管理器，请先确保已安装 pnpm：

```bash
# 如果未安装 pnpm，可以使用 npm 安装
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 配置上游仓库（可选）

为了保持与主仓库同步，建议添加上游仓库：

```bash
# 添加上游仓库
git remote add upstream https://github.com/opentiny/next-sdk.git

# 验证远程仓库配置
git remote -v
```

完成以上步骤后，你就可以开始开发 skills 技能了。

## 目录结构

skills 技能位于 `packages/next-wxt/skills/` 目录下，每个技能对应一个子目录：

```text
packages/next-wxt/skills/
├── index.ts              # 技能自动发现和加载逻辑
├── types.d.ts            # TypeScript 类型定义
├── skillManager.ts       # 技能管理器（组合提示词、工具列表等）
├── office-expert/        # 办公专家技能示例
│   ├── meta.ts          # 技能元信息配置
│   ├── prompt.md         # 系统提示词内容
│   ├── tools.ts          # 工具列表定义
│   └── index.ts         # 技能导出文件
├── drawer-expert/        # 画图专家技能示例
│   ├── meta.ts
│   ├── prompt.md
│   ├── tools.ts
│   └── index.ts
└── utils/                # 工具函数
    └── getToolsByDomains.ts
```

## 创建新的 skill 技能

### 步骤一：创建技能目录

在 `packages/next-wxt/skills/` 目录下创建以技能名称命名的文件夹，例如：

```bash
mkdir -p packages/next-wxt/skills/my-expert
```

**命名规范**：

- 使用小写字母和连字符，遵循 kebab-case 命名规范
- 名称应该清晰描述技能的专业领域，例如 `code-expert`、`design-expert`、`data-analyst` 等

### 步骤二：创建 meta.ts 配置文件

在新建的目录中创建 `meta.ts` 文件，用于定义技能的元信息。

### 步骤三：创建 prompt.md 提示词文件

创建 `prompt.md` 文件，编写技能的系统提示词内容。

### 步骤四：创建 tools.ts 工具列表文件（可选）

如果需要声明技能需要的 MCP 工具，创建 `tools.ts` 文件。

### 步骤五：创建 index.ts 导出文件

创建 `index.ts` 文件，导出技能的完整配置。

## meta.ts 配置文件详解

`meta.ts` 文件用于配置 skill 的基本信息和元数据。以下是所有可用字段的详细说明：

### 完整配置示例

```typescript
export default {
  name: 'my-expert',                    // 必填：技能唯一标识符
  label: '我的专家',                    // 必填：显示名称（用于 @ 调用）
  aliases: ['my', 'expert', '我的'],   // 可选：别名数组（支持多个 @ 名称）
  description: '擅长处理特定领域的专业问题', // 可选：描述信息
  icon: 'https://example.com/icon.png', // 可选：图标 URL
  category: 'general',                 // 可选：分类（用于分组）
  requiredDomains: ['example.com']     // 可选：需要的域名列表
}
```

### 字段说明

#### name（必填）

- **类型**：`string`
- **说明**：技能的唯一标识符，必须与目录名称一致
- **示例**：`'office-expert'`、`'drawer-expert'`、`'code-expert'`
- **注意**：此字段用于系统内部识别技能，必须与目录名称匹配

```typescript
name: 'my-expert'
```

#### label（必填）

- **类型**：`string`
- **说明**：技能的显示名称，用于在技能选择器中展示，也是用户通过 `@` 调用时的主要名称
- **示例**：`'办公专家'`、`'画图专家'`、`'代码专家'`
- **建议**：使用简洁、清晰的名称，便于用户理解和记忆

```typescript
label: '我的专家'
```

#### aliases（可选）

- **类型**：`string[]`
- **说明**：技能的别名数组，支持多个 `@` 调用名称
- **用途**：当用户输入 `@` 后输入别名时，也能匹配到此技能
- **示例**：

```typescript
aliases: ['office', 'office-expert', '办公', '办公专家']
```

**使用场景**：

- 支持中英文别名，提高用户体验
- 支持简写形式，例如 `office` 可以匹配 `office-expert`
- 支持多个同义词，例如 `'画图'`、`'绘图'`、`'设计'` 都可以匹配画图专家

#### description（可选）

- **类型**：`string`
- **说明**：技能的描述信息，用于在技能选择器中展示，帮助用户了解技能的能力范围
- **示例**：`'擅长通过工具调用帮助用户管理日程、处理出差申请和规划行程'`

```typescript
description: '擅长处理特定领域的专业问题'
```

#### icon（可选）

- **类型**：`string`
- **说明**：技能的图标 URL，用于在技能选择器中展示图标
- **格式**：支持完整的 URL 或相对路径
- **示例**：`'https://example.com/icon.png'`

```typescript
icon: 'https://example.com/icon.png'
```

#### category（可选）

- **类型**：`string`
- **说明**：技能的分类，用于在技能选择器中分组展示
- **示例**：`'office'`、`'drawer'`、`'code'`、`'general'`
- **用途**：帮助用户快速找到相关技能

```typescript
category: 'general'
```

#### requiredDomains（可选）

- **类型**：`string[]`
- **说明**：技能需要的域名列表，当用户访问这些域名时，技能才会被推荐或可用
- **示例**：`['excalidraw.com']`、`['github.com', 'gitlab.com']`
- **用途**：某些技能只在特定网站上有意义，例如画图专家只在 Excalidraw 网站上可用

```typescript
requiredDomains: ['example.com']
```

**注意**：如果不设置此字段，技能在所有场景下都可用。

### meta.ts 完整示例

```typescript
// packages/next-wxt/skills/office-expert/meta.ts
export default {
  name: 'office-expert',
  label: '办公专家',
  aliases: ['office', 'office-expert', '办公专家'],
  description: '擅长通过工具调用帮助用户管理日程、处理出差申请和规划行程。',
  category: 'office'
}
```

## prompt.md 提示词文件详解

`prompt.md` 文件包含技能的系统提示词内容，定义了 AI 助手在激活该技能时的行为模式、专业能力和工作方式。

### 文件格式

- **文件类型**：Markdown 格式（`.md` 文件）
- **编码**：UTF-8
- **内容**：使用 Markdown 语法编写，支持标题、列表、代码块等格式

### 提示词编写指南

#### 1. 角色定义

首先明确技能的专业角色：

```markdown
# 办公助手

你是一个办公助手，擅长通过工具调用帮助用户管理日程、处理出差申请和规划行程。
```

#### 2. 核心原则

定义技能的核心工作原则：

```markdown
# 核心原则

## 理解意图

- 准确把握用户的真实需求，而非机械执行字面请求
- 识别隐含的任务依赖关系
- 主动考虑用户可能忽略的细节

## 智能决策

<thinking>
在响应前，始终思考：
1. 用户的核心目标是什么？
2. 需要哪些工具来完成？
3. 最优的执行顺序是什么？
4. 有哪些潜在问题需要预防？
</thinking>
```

#### 3. 工作方式

描述技能的具体工作方式：

```markdown
# 工作方式

## 时间处理

- 默认年份：2025年
- 默认地点：深圳
- 工作日：周一至周五，8:00-17:30
- 智能理解相对时间表达（明天、下周、月底等）
- 自动处理跨周、节假日等特殊情况
```

#### 4. 交互风格

定义技能的交互风格：

```markdown
## 交互风格

- **简洁高效**：直达重点，避免冗余
- **主动智能**：预见需求，提供建议
- **友好专业**：保持亲和力的同时确保准确性
- **上下文感知**：记住对话历史，减少重复确认
```

#### 5. 示例对话

提供示例对话，帮助 AI 理解期望的行为：

```markdown
# 示例对话

<example>
用户："下周去北京出差"

助手思考：需要确定具体日期、完成出差申请流程、可能需要交通安排和出差攻略

助手："我来帮您安排下周的北京出差。

正在处理：
✓ 确认日期：9月8日-12日（周一至周五）
✓ 申请外出公干
✓ 添加日程安排  
✓ 提交出差申请

完成！需要我帮您：
1. 查询深圳到北京的火车票吗？
2. 生成一份北京出差攻略PDF吗？"
</example>
```

### prompt.md 完整示例

参考 `packages/next-wxt/skills/office-expert/prompt.md` 文件，查看完整的提示词示例。

### 提示词编写最佳实践

1. **清晰的结构**：使用 Markdown 标题组织内容，层次分明
2. **具体的行为描述**：避免模糊的表述，提供具体的行为指导
3. **示例驱动**：通过示例对话展示期望的行为模式
4. **工具使用指导**：明确说明何时使用工具、如何使用工具
5. **错误处理**：定义如何处理异常情况和错误
6. **边界情况**：考虑边界情况，提供处理方案

## tools.ts 工具列表文件详解

`tools.ts` 文件用于声明技能需要的 MCP 工具名称列表。当用户激活技能时，系统会自动检查这些工具是否可用。

### 文件格式

```typescript
/**
 * 技能需要的 MCP 工具列表
 * 这些工具将在激活该 skill 时自动注册
 */
export default [
  'openUrl',        // 打开代码仓库或文档
  'takeSnapshot',   // 获取页面快照，查看代码结构
  'click',          // 点击页面元素
  'type',           // 输入代码或文本
  'selectOption'    // 选择下拉选项
]
```

### 工具名称说明

工具名称必须与 MCP 工具的实际名称一致。常见的工具包括：

- **内置工具**：
  - `takeSnapshot`：获取页面无障碍树快照
  - `click`：点击页面元素
  - `fill`：输入文本
  - `selectOption`：选择下拉选项
  - `getPageInfomation`：提取页面文本信息
  - `openUrl`：打开新网址

- **自定义工具**：
  - 来自 `mcp-servers` 目录中注册的工具名称
  - 来自云端 MCP 服务的工具名称

### 工具检查机制

当用户激活技能时，系统会：

1. **检查工具可用性**：验证 `tools.ts` 中声明的工具是否已加载和启用
2. **提示用户**：如果有工具不可用，会显示确认对话框，询问用户是否继续
3. **阻止发送**：如果用户选择取消，会阻止消息发送，等待工具准备就绪

### tools.ts 完整示例

```typescript
// packages/next-wxt/skills/office-expert/tools.ts
export default [
  'openUrl',        // 打开相关页面
  'takeSnapshot',   // 获取页面状态
  'click',          // 点击按钮或链接
  'fill',           // 填写表单
  'selectOption'    // 选择下拉选项
]
```

**注意**：如果技能不需要特定的工具，可以不创建 `tools.ts` 文件，或在 `index.ts` 中不导出 `tools` 字段。

## index.ts 导出文件详解

`index.ts` 文件是技能的入口文件，负责导入并导出技能的完整配置。

### 文件格式

```typescript
/**
 * 技能导出文件
 */
import meta from './meta'
import prompt from './prompt.md?raw'
import tools from './tools'

export default {
  meta,
  prompt,
  tools
}
```

### 导入说明

#### meta

- **来源**：`./meta.ts` 文件
- **类型**：`SkillMeta` 对象
- **说明**：技能的元信息配置

#### prompt

- **来源**：`./prompt.md?raw` 文件
- **类型**：`string`（原始文本内容）
- **说明**：使用 `?raw` 后缀导入 Markdown 文件为字符串
- **注意**：必须使用 `?raw` 后缀，否则会导入为模块对象

#### tools

- **来源**：`./tools.ts` 文件（可选）
- **类型**：`string[]`（工具名称数组）
- **说明**：技能需要的 MCP 工具列表
- **注意**：如果技能不需要工具，可以不导入或设置为空数组

### 导出格式

导出的对象必须符合 `SkillExport` 接口：

```typescript
interface SkillExport {
  meta: SkillMeta      // 必填：技能元信息
  prompt: string       // 必填：系统提示词内容
  tools?: string[]     // 可选：工具名称列表
}
```

### index.ts 完整示例

```typescript
// packages/next-wxt/skills/office-expert/index.ts
import meta from './meta'
import prompt from './prompt.md?raw'
import tools from './tools'

export default {
  meta,
  prompt,
  tools
}
```

**无工具版本**：

```typescript
// packages/next-wxt/skills/general-expert/index.ts
import meta from './meta'
import prompt from './prompt.md?raw'

export default {
  meta,
  prompt
  // 不导出 tools，或设置为空数组
}
```

## 技能自动发现机制

系统使用 `import.meta.glob` 自动发现并加载所有技能：

```typescript
// packages/next-wxt/skills/index.ts
const skillModules = import.meta.glob('./*/index.ts', { eager: true })
```

### 加载流程

1. **自动扫描**：系统扫描 `packages/next-wxt/skills/` 目录下所有子目录的 `index.ts` 文件
2. **验证格式**：检查导出的对象是否包含 `meta` 和 `prompt` 字段
3. **注册技能**：将验证通过的技能添加到技能列表
4. **错误处理**：如果技能格式错误或加载失败，会在控制台输出警告信息

### 技能匹配规则

当用户输入 `@` 后输入文本时，系统会：

1. **精确匹配**：首先匹配 `label` 字段
2. **别名匹配**：然后匹配 `aliases` 数组中的别名
3. **模糊匹配**：支持部分匹配，例如输入 `@off` 可以匹配 `office-expert`
4. **分类过滤**：如果设置了分类，可以按分类过滤技能

## 技能使用方式

### 用户端使用

用户在对话中输入 `@` 符号时，会触发技能选择器：

1. **触发选择器**：输入 `@` 后，显示技能列表
2. **选择技能**：通过键盘上下键或鼠标选择技能
3. **激活技能**：选择后，技能会被添加到消息中
4. **发送消息**：发送消息时，系统会组合技能的系统提示词

### 多技能协作

用户可以同时激活多个技能：

```text
@办公专家 @画图专家 帮我创建一个出差计划并画一个流程图
```

系统会：

1. **组合提示词**：将多个技能的系统提示词组合成多专家协作模式
2. **合并工具列表**：合并所有技能需要的工具，去重后检查可用性
3. **智能协作**：AI 会根据不同专家的能力，选择合适的视角回答问题

### 技能提示词组合格式

当激活多个技能时，系统会生成如下格式的组合提示词：

```markdown
# 多专家协作模式

你同时具备以下 2 位专家的能力，请根据用户需求选择合适的专家视角来回答问题：

## 办公专家（专家 1）

[办公专家的提示词内容]

---

## 画图专家（专家 2）

[画图专家的提示词内容]
```

## 最佳实践

### 1. 技能命名

- 使用有意义的名称，例如 `office-expert` 而不是 `skill1`
- 使用小写字母和连字符，遵循 kebab-case 命名规范
- 名称应该清晰描述技能的专业领域

### 2. 元信息配置

- **label**：使用简洁、清晰的名称，便于用户理解
- **aliases**：提供多个别名，包括中英文、简写形式
- **description**：详细描述技能的能力范围，帮助用户选择
- **category**：合理分类，便于用户查找

### 3. 提示词编写

- **结构清晰**：使用 Markdown 标题组织内容
- **行为具体**：提供具体的行为指导，避免模糊表述
- **示例丰富**：通过示例对话展示期望的行为模式
- **工具指导**：明确说明何时使用工具、如何使用工具

### 4. 工具声明

- **按需声明**：只声明技能真正需要的工具
- **工具名称准确**：确保工具名称与 MCP 工具的实际名称一致
- **考虑可用性**：考虑工具可能不可用的情况，在提示词中提供降级方案

### 5. 错误处理

- **友好提示**：在提示词中定义如何处理错误情况
- **降级方案**：提供工具不可用时的替代方案
- **用户引导**：当工具不可用时，引导用户如何准备工具

### 6. 性能优化

- **提示词精简**：保持提示词简洁，避免冗余内容
- **工具最小化**：只声明必要的工具，减少检查开销
- **分类合理**：合理设置分类，提高查找效率

## 常见问题

### Q1: 技能加载失败怎么办？

**A**: 检查以下几点：

1. 确保 `index.ts` 文件存在且格式正确
2. 确保导出的对象包含 `meta` 和 `prompt` 字段
3. 检查 `prompt.md` 文件是否存在且可读
4. 查看浏览器控制台的错误信息

### Q2: 如何测试技能？

**A**: 

1. 重启浏览器扩展
2. 打开 Sidepanel
3. 在输入框中输入 `@`，查看技能是否出现在列表中
4. 选择技能并发送消息，验证提示词是否正确组合

### Q3: 技能的工具检查失败怎么办？

**A**: 

1. 确保工具名称正确，与 MCP 工具的实际名称一致
2. 检查工具是否已注册和启用
3. 如果工具来自 `mcp-servers`，确保对应的域名工具已加载
4. 如果工具来自云端 MCP 服务，确保服务已连接

### Q4: 如何实现技能的条件激活？

**A**: 

使用 `requiredDomains` 字段：

```typescript
export default {
  name: 'drawer-expert',
  label: '画图专家',
  requiredDomains: ['excalidraw.com']
}
```

这样，只有当用户访问 `excalidraw.com` 时，技能才会被推荐或可用。

### Q5: 如何实现技能的动态工具列表？

**A**: 

目前工具列表是静态的，在 `tools.ts` 中定义。如果需要动态工具列表，可以在 `index.ts` 中根据条件生成：

```typescript
import meta from './meta'
import prompt from './prompt.md?raw'

// 根据条件生成工具列表
const tools = getCurrentDomain() === 'example.com' 
  ? ['tool1', 'tool2'] 
  : ['tool3', 'tool4']

export default {
  meta,
  prompt,
  tools
}
```

## 总结

通过本文档，你应该已经了解了如何开发 skills 技能：

1. 创建技能目录和配置文件（`meta.ts`）
2. 编写系统提示词（`prompt.md`）
3. 声明工具列表（`tools.ts`，可选）
4. 创建导出文件（`index.ts`）
5. 系统自动发现并加载技能
6. 用户通过 `@` 符号激活技能

skills 系统为 AI Extension 提供了强大的专家角色定义能力，通过合理的技能设计和提示词编写，可以让 AI 助手在不同场景下表现出专业的能力和行为模式。

如果你在开发过程中遇到问题，可以参考项目中的示例代码（`office-expert`、`drawer-expert`），或查看浏览器控制台的错误信息。

