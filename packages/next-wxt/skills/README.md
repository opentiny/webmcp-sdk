# Skill 系统使用指南

Skill 系统是一个类似 Claude Skill 的功能，允许你将系统提示词和 MCP 工具组合在一起，通过 `@专家名称` 的方式调用。

## 目录结构

```
packages/next-wxt/skills/
├── index.ts              # Skill 自动发现和加载逻辑
├── types.d.ts            # Skill 类型定义
├── skillManager.ts       # Skill 管理器（组合提示词和工具）
├── code-expert/          # 代码专家示例
│   ├── meta.ts          # Skill 元信息
│   ├── prompt.md        # 系统提示词
│   ├── tools.ts         # 该 skill 需要的 MCP 工具列表（可选）
│   └── index.ts         # Skill 导出
└── design-expert/        # 设计专家示例
    ├── meta.ts
    ├── prompt.md
    ├── tools.ts
    └── index.ts
```

## 创建新的 Skill

### 1. 创建 Skill 目录

在 `packages/next-wxt/skills/` 目录下创建一个新文件夹，例如 `my-expert/`。

### 2. 创建 meta.ts（元信息）

```typescript
export default {
  name: 'my-expert',                    // 唯一标识符
  label: '我的专家',                     // 显示名称（用于 @ 调用）
  aliases: ['my', 'expert', '我的'],    // 别名数组（支持多个 @ 名称）
  description: '这是一个示例专家',        // 描述信息
  icon: 'https://example.com/icon.svg', // 图标 URL（可选）
  category: 'custom'                    // 分类（可选）
}
```

### 3. 创建 prompt.md（系统提示词）

编写 Markdown 格式的系统提示词，描述该 skill 的角色和能力：

```markdown
# 角色

你是一位专业的...

# 核心能力

## 能力1
- 功能1
- 功能2

## 能力2
- 功能3
- 功能4
```

### 4. 创建 tools.ts（可选）

如果该 skill 需要特定的 MCP 工具，可以在这里列出：

```typescript
export default [
  'openUrl',      // 打开网址工具
  'takeSnapshot', // 获取页面快照工具
  'click',        // 点击工具
  // ... 其他工具名称
]
```

### 5. 创建 index.ts（导出）

```typescript
import meta from './meta'
import prompt from './prompt.md?raw'
import tools from './tools'

export default {
  meta,
  prompt,
  tools: tools || []
}
```

## 使用方式

### 在对话中使用

1. 在输入框中输入 `@` 符号
2. 系统会自动显示可用的 skill 列表
3. 选择或输入 skill 名称（支持别名）
4. 输入你的问题，系统会使用该 skill 的提示词和工具来回答

### 示例

```
@代码专家 帮我写一个排序函数
@design-expert 设计一个登录页面
@code 优化这段代码的性能
```

## 技术实现

### Skill 自动发现

系统使用 `import.meta.glob` 自动发现 `skills/` 目录下的所有 skill，无需手动注册。

### 提示词组合

当激活多个 skill 时，系统会自动组合它们的提示词：

- 单个 skill：直接使用该 skill 的提示词
- 多个 skill：组合为"多专家协作模式"，每个 skill 的提示词作为独立的专家部分

### 工具注册

Skill 需要的工具会自动注册到 MCP Server，确保该 skill 可以使用所需的工具。

### 通信机制

- **Sidepanel ↔ Remoter**：通过 `browser.runtime.sendMessage` 进行通信
- **Skill 激活**：Remoter 通知 Sidepanel 激活指定的 skills
- **提示词获取**：Remoter 从 Sidepanel 获取组合后的提示词

## API 参考

### getAllSkills()

获取所有已加载的 skill。

```typescript
import { getAllSkills } from '@/skills'

const skills = getAllSkills()
```

### getSkillByName(name: string)

根据名称获取 skill。

```typescript
import { getSkillByName } from '@/skills'

const skill = getSkillByName('code-expert')
```

### getSkillByAlias(alias: string)

根据别名获取 skill。

```typescript
import { getSkillByAlias } from '@/skills'

const skill = getSkillByAlias('code') // 通过别名查找
```

### combinePrompts(skillNames: string[])

组合多个 skill 的提示词。

```typescript
import { combinePrompts } from '@/skills/skillManager'

const prompt = combinePrompts(['code-expert', 'design-expert'])
```

### getToolsForSkills(skillNames: string[])

获取多个 skill 需要的所有工具列表（去重）。

```typescript
import { getToolsForSkills } from '@/skills/skillManager'

const tools = getToolsForSkills(['code-expert', 'design-expert'])
```

## 注意事项

1. **Skill 名称唯一性**：确保每个 skill 的 `name` 字段是唯一的
2. **工具可用性**：Skill 中列出的工具必须在 MCP Server 中已注册
3. **提示词格式**：建议使用 Markdown 格式编写提示词，便于阅读和维护
4. **性能考虑**：Skill 的提示词会在每次激活时加载，避免过大的提示词文件

## 示例 Skill

### code-expert（代码专家）

- **名称**：`code-expert`
- **别名**：`code`, `coder`, `编程专家`, `程序员`
- **描述**：擅长代码编写、调试、优化和代码审查
- **工具**：`openUrl`, `takeSnapshot`, `click`, `type`, `selectOption`

### design-expert（设计专家）

- **名称**：`design-expert`
- **别名**：`design`, `designer`, `设计师`, `UI专家`
- **描述**：擅长 UI/UX 设计、视觉设计和交互设计
- **工具**：`openUrl`, `takeSnapshot`, `click`, `type`, `selectOption`

