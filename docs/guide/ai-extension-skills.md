# Skills 技能开发指南

本文档介绍如何在 AI Extension 浏览器扩展中开发 Skills 技能。

> **重要提示**：我们的 Skills 系统完全遵循**业界标准的 Skills 协议规范**。这意味着与业界通用的 Skill 定义方式一致，你可以使用标准的 `SKILL.md` 格式定义技能。且无需任何显式唤起（如输入 `@`），AI 助手会自动识别用户的意图并调用合适的技能来解决问题。

## 概述

Skills（技能）是 AI Extension 赋予大模型专业知识的核心机制。通过采用**渐进式披露（Progressive Disclosure）**设计，我们避免了一次性给大模型塞入所有 API 约束导致 Token 爆炸或产生幻觉。

- 系统仅会在初始上下文中透出所有技能的“大纲”。
- AI 分析用户意图后，会通过 `view_file` 自主查阅特定技能的详细开发守则和参考资料（按需读取）。

## 目录结构

所有技能文件位于 `packages/next-wxt/skills/` 目录下。每个技能是一个独立的子目录，其中包含**入口文件 `SKILL.md`** 及可选的**参考资料文件**（支持 `.md`、`.json`、`.xml` 等文本格式）。

```text
packages/next-wxt/skills/
├── index.ts              # 自动加载逻辑（使用 import.meta.glob 导入所有文件）
├── drawer-expert/        # 示例：画图专家
│   ├── SKILL.md          # 技能入口（必须）
│   └── reference/        # 参考资料目录（可选）
│       ├── flow-chart.md # 流程图规范
│       └── templates.json
└── month-report-expert/  # 示例：月报专家
    └── SKILL.md          # 仅有入口，无额外参考资料
```

> **说明**：系统通过 `import.meta.glob('./**/*')` 导入 skills 目录下的**所有文件**，AI 可按需通过 `get_skill_content` 工具读取任意参考资料。

## 开发流程

在 AI Extension 中添加一个新技能，通常需要以下步骤：

### 1. 创建技能目录

在 `packages/next-wxt/skills/` 下创建一个新的文件夹，名称即为技能的唯一标识（ID）。

```bash
mkdir packages/next-wxt/skills/my-expert
# 若需参考资料，可创建 reference 子目录
mkdir -p packages/next-wxt/skills/my-expert/reference
```

### 2. 创建 SKILL.md 入口文件

在目录下创建 `SKILL.md` 文件。该文件遵循**业界标准的 Skill 协议**，由 **YAML Front Matter**（元数据）和 **Markdown Body**（提示词）组成。

**文件内容示例**：

```markdown
---
name: my-expert
description: 这是一个示例专家，擅长...
---

# 角色定义

你是一个专业的[角色名称]...

## 能力

- 能力 1
- 能力 2

## 规则

1. 规则 1...
```

> **提示**：关于 Skill 协议的详细规范（如元数据字段定义、提示词编写技巧等），请参考业界标准的 Skills 协议文档，此处不再赘述。

### 3. （可选）添加参考资料文件

在技能目录下创建 `reference/` 子目录，放置 `.md`、`.json`、`.xml` 等参考资料。在 `SKILL.md` 的 Markdown Body 中可引用这些文件的相对路径，AI 会通过 `get_skill_content` 工具按需读取。

## 调试与生效

1. **保存文件**：保存 `SKILL.md` 后，Vite 会自动热更新。
2. **验证**：
   - 打开 AI Extension 侧边栏。
   - 直接向 AI 提问相关的任务（例如："帮我画一个流程图"）。
   - AI 会智能分析意图，自动加载并使用相应的技能（如"画图专家"）来辅助回答，无需手动干预。

## 常见问题

### 技能未生效？

- 确认文件名为 `SKILL.md`（大小写敏感）。
- 确认 Front Matter 中的 `name` 和 `description` 字段已正确填写。
- 检查控制台是否有解析错误的日志。

### 参考资料文件支持哪些格式？

支持任意文本类文件：`.md`、`.json`、`.xml`、`.txt`、`.yaml` 等。系统通过 `import.meta.glob('./**/*')` 自动加载 skills 目录下所有文件，AI 可按路径读取。
