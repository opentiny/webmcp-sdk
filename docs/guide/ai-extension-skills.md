# Skills 技能开发指南

本文档介绍如何在 AI Extension 浏览器扩展中开发 Skills 技能。

> **重要提示**：我们的 Skills 系统完全遵循**业界标准的 Skills 协议规范**。这意味着与业界通用的 Skill 定义方式一致，你可以使用标准的 `SKILL.md` 格式定义技能。且无需任何显式唤起（如输入 `@`），AI 助手会自动识别用户的意图并调用合适的技能来解决问题。

## 概述

Skills（技能）是 AI Extension 的核心能力模块。通过定义 Skills，你可以为 AI 助手赋予特定的专业角色（如“画图专家”、“月报专家”），使其能够处理特定领域的任务。

## 目录结构

所有技能文件位于 `packages/next-wxt/skills/` 目录下。每个技能是一个独立的子目录，其中包含一个标准的 `SKILL.md` 文件。

```text
packages/next-wxt/skills/
├── index.ts              # 自动加载逻辑
├── drawer-expert/        # 示例：画图专家
│   └── SKILL.md          # 技能定义文件
└── month-report-expert/  # 示例：月报专家
    └── SKILL.md
```

## 开发流程

在 AI Extension 中添加一个新技能非常简单，只需两步：

### 1. 创建技能目录

在 `packages/next-wxt/skills/` 下创建一个新的文件夹，名称即为技能的唯一标识（ID）。

```bash
mkdir packages/next-wxt/skills/my-expert
```

### 2. 创建 SKILL.md

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

## 调试与生效

1. **保存文件**：保存 `SKILL.md` 后，Vite 会自动热更新。
2. **验证**：
   - 打开 AI Extension 侧边栏。
   - 直接向 AI 提问相关的任务（例如：“帮我画一个流程图”）。
   - AI 会智能分析意图，自动加载并使用相应的技能（如“画图专家”）来辅助回答，无需手动干预。

## 常见问题

### 技能未生效？

- 确认文件名为 `SKILL.md`（大小写敏感）。
- 确认 Front Matter 中的 `name` 字段已正确填写。
- 检查控制台是否有解析错误的日志。
