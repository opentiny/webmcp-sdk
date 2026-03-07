# TinyRemoter Skills 技能配置指南

本文档详细介绍如何在 `TinyRemoter` 组件中配置和使用 Skills 技能系统。

> **关于 Skills 协议**：Skills 系统遵循业界标准的 Skills 协议规范，使用标准的 `SKILL.md` 格式定义技能入口。AI 助手会自动识别用户意图并调用合适的技能，无需手动唤起。

## 什么是 Skills？

Skills（技能）是一种结构化的知识包，用于为 AI 赋予特定的专业角色和能力。每个技能由一个**入口文件 `SKILL.md`** 和若干**参考资料文件**组成：

- **`SKILL.md`**：技能入口，包含元数据（技能名称、描述）和角色提示词。AI 根据此文件判断何时激活该技能。
- **参考资料文件**：支持任意格式（`.md`、`.json`、`.xml`、`.txt` 等），作为技能的附属知识库，AI 可按需读取。

当用户提问时，AI 会先读取 `SKILL.md` 了解技能概况，再根据需要按需加载参考资料文件，从而给出精准回答。

## Skills 目录结构

推荐在项目 `src` 目录下创建独立的 `skills` 目录。每个技能是一个**子目录**，目录名即为技能 ID，目录内包含 `SKILL.md` 及所有参考资料文件。

```text
src/
├── App.vue
├── main.ts
└── skills/                              # 技能根目录
    ├── product-guide/                   # 技能：商品管理指南
    │   ├── SKILL.md                     # 技能入口（必须）
    │   └── reference/                   # 参考资料目录（可选）
    │       ├── product-listing.md      # 参考文档：商品上架流程
    │       ├── inventory-rules.json     # 参考数据：库存规则配置
    │       └── category-schema.xml      # 参考数据：类目结构
    ├── code-review-expert/              # 技能：代码审查专家
    │   ├── SKILL.md                     # 技能入口（必须）
    │   └── reference/
    │       ├── code-standards.md        # 参考文档：代码规范
    │       └── review-checklist.json    # 参考数据：审查清单
    └── month-report-expert/             # 技能：月报生成专家
        └── SKILL.md                     # 仅有入口，无额外参考资料
```

**目录约定：**

| 层级 | 说明 |
|------|------|
| `skills/<技能ID>/` | 第一级子目录，目录名即技能 ID |
| `skills/<技能ID>/SKILL.md` | 技能入口文件，**必须存在**，大小写敏感 |
| `skills/<技能ID>/reference/` | 参考资料目录，**可选**，可自由命名 |
| `skills/<技能ID>/reference/*` | 参考文件，支持 `.md`、`.json`、`.xml`、`.txt` 等任意文本格式 |

## SKILL.md 文件格式

`SKILL.md` 由 **YAML Front Matter**（元数据）和 **Markdown Body**（角色提示词）两部分组成：

```markdown
---
name: product-guide
description: 商品管理指南技能包。提供商品管理相关的搜索和查询功能。当用户询问商品创建、库存管理、价格设置等问题时使用。
---

# Product Guide Skills

这是一个商品管理指南技能包，包含多个子技能。

## 子技能

商品上架管理：具体的商品上架参考文档 './product-guide/reference/product-listing.md'
```

| 字段 | 位置 | 说明 |
|------|------|------|
| `name` | YAML Front Matter | 技能唯一标识，建议与目录名保持一致 |
| `description` | YAML Front Matter | 技能描述，AI **依赖此字段**判断何时激活该技能，请尽量详细 |
| Markdown Body | `---` 之后的内容 | 角色提示词，定义 AI 的角色、能力及如何引用参考资料 |

> **提示**：在 Markdown Body 中，可以用文件相对路径（如 `'./product-guide/reference/product-listing.md'`）告知 AI 哪些参考文件可用，AI 会通过内置的 `get_skill_content` 工具按需读取。

## 分步配置教程

### 第一步：创建 Skills 目录结构

在项目 `src` 目录下创建技能根目录和第一个技能：

```bash
# 创建技能目录（含参考资料子目录）
mkdir -p src/skills/product-guide/reference
```

### 第二步：编写 SKILL.md 入口文件

在技能目录中创建 `SKILL.md`，定义技能的元数据和提示词：

```markdown
---
name: product-guide
description: 商品管理指南技能包。提供商品管理相关的搜索和查询功能。当用户询问商品创建、库存管理、价格设置等问题时使用。
---

# 商品管理指南

这是一个商品管理指南技能包。

## 可用参考资料

- 商品上架流程：'./product-guide/reference/product-listing.md'
- 库存规则配置：'./product-guide/reference/inventory-rules.json'
```

### 第三步：添加参考资料文件

在 `reference/` 目录中放置各类参考文件，支持 `.md`、`.json`、`.xml` 等任意文本格式：

**`reference/product-listing.md`**（操作指南类）：

```markdown
---
title: 商品上架
tags: [商品管理, 上架, 库存]
---

# 商品上架

## 基本流程

1. 进入商品管理，找到待上架商品
2. 补全必填项：主图、标题、类目、价格、库存
3. 自检：类目是否正确、是否有违禁词
4. 提交上架，在前台确认商品已展示
```

**`reference/inventory-rules.json`**（结构化数据类）：

```json
{
  "minStock": 1,
  "warnThreshold": 10,
  "rules": [
    { "condition": "stock === 0", "action": "禁止上架" },
    { "condition": "stock < 10", "action": "触发库存预警" }
  ]
}
```

当前目录结构：

```text
src/skills/
└── product-guide/
    ├── SKILL.md                        ✅ 技能入口
    └── reference/
        ├── product-listing.md         ✅ 操作指南
        └── inventory-rules.json        ✅ 规则数据
```

### 第四步：在组件中配置 skills 属性

使用 Vite 的 `import.meta.glob` **导入 skills 目录下的所有文件**，并将结果传入 `TinyRemoter` 的 `skills` 属性：

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="llmConfig"
    :skills="skills"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10
}

// 导入 skills 目录下的【所有文件】，包括 SKILL.md 及所有参考资料（.md/.json/.xml 等）
// key 为文件相对路径，value 为文件原始文本内容
const skills = import.meta.glob('./skills/**/*', {
  query: '?raw',      // 以原始文本形式导入，不经过模块解析
  import: 'default',  // 取模块的 default 导出（即文件内容字符串）
  eager: true         // 同步加载，避免异步等待
}) as Record<string, string>
</script>
```

> **为什么要导入所有文件？**
>
> 技能的知识库不只有 `SKILL.md`，还包含参考资料目录下的 `.md`、`.json`、`.xml` 等文件。使用 `./skills/**/*` 可以一次性加载整个技能目录的所有内容，AI 通过内置的 `get_skill_content` 工具按需读取任意文件，而无需在代码层面手动维护文件列表。

### 第五步：添加更多技能

新增技能时，只需在 `skills` 目录下创建新的子目录，无需修改任何代码，`import.meta.glob` 会自动扫描并加载：

```bash
mkdir -p src/skills/code-review-expert/reference
```

```text
src/skills/
├── product-guide/
│   ├── SKILL.md
│   └── reference/
│       ├── product-listing.md
│       └── inventory-rules.json
└── code-review-expert/                 ✅ 新增技能
    ├── SKILL.md
    └── reference/
        ├── code-standards.md
        └── review-checklist.json
```

### 第六步：验证技能是否生效

1. 启动开发服务器（Vite 会自动热更新新增的文件）
2. 打开 TinyRemoter 对话框
3. 向 AI 提问与技能相关的问题，例如："商品怎么上架？"
4. AI 会自动激活「商品管理指南」技能，并按需读取参考资料回答问题

## 完整示例

**目录结构：**

```text
src/
├── App.vue
├── main.ts
└── skills/
    ├── product-guide/
    │   ├── SKILL.md
    │   └── reference/
    │       ├── product-listing.md
    │       └── inventory-rules.json
    ├── code-review-expert/
    │   ├── SKILL.md
    │   └── reference/
    │       └── code-standards.md
    └── month-report-expert/
        └── SKILL.md
```

**App.vue：**

```vue
<template>
  <div>
    <button @click="show = true">打开 AI 助手</button>
    <TinyRemoter
      v-model:show="show"
      sessionId="your-session-id"
      title="我的AI助手"
      :llmConfig="llmConfig"
      :skills="skills"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10
}

// 导入 skills 目录下所有文件（SKILL.md + 所有参考资料）
const skills = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>
</script>
```

## 常见问题

### 技能未被 AI 识别？

- 检查 `SKILL.md` 文件名大小写（必须完全匹配 `SKILL.md`）
- 确认 YAML Front Matter 中的 `description` 字段已填写且描述清晰——AI 正是依赖此字段判断何时激活该技能
- 检查 glob 路径是否正确，使用 `./skills/**/*` 而非 `./skills/**/SKILL.md`

### 如何确认所有文件已被正确加载？

在控制台打印 `skills` 对象，查看所有已加载的文件路径：

```js
const skills = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

// 打印已加载的所有文件路径
console.log('已加载技能文件：', Object.keys(skills))
// 输出示例：
// [
//   './skills/product-guide/SKILL.md',
//   './skills/product-guide/reference/product-listing.md',
//   './skills/product-guide/reference/inventory-rules.json',
//   './skills/code-review-expert/SKILL.md',
// ]
```

### 参考资料文件支持哪些格式？

支持任意**文本类**文件：`.md`、`.json`、`.xml`、`.txt`、`.yaml`、`.csv` 等。AI 会将文件内容作为纯文本读取，因此不建议放置图片、音视频等二进制文件。
