---
name: product-guide
description: 商品管理指南技能包。提供商品管理相关的搜索和查询功能。当用户询问商品创建、库存管理、价格设置等问题时使用。
---

# Product Guide Skills

这是一个商品管理指南技能包，包含多个子技能。

## 子技能

### 1. search_guide - 搜索指南

在商品管理指南中搜索相关内容。

**输入参数:**

- `keyword` (string): 搜索关键词（如：库存、价格、商品创建）

**使用场景:**

- 用户询问如何进行某项操作
- 需要查找特定功能的说明
- 关键词搜索相关文档

**Handler:** `searchGuideHandler`

### 2. get_section - 获取章节

获取商品管理指南的特定章节内容。

**输入参数:**

- `section` (string): 章节名称
  - 可选值: `商品创建`, `库存管理`, `价格管理`

**使用场景:**

- 用户需要完整的章节说明
- 系统化了解某个功能模块
- 获取详细的操作流程

**Handler:** `getSectionHandler`

## 内容覆盖

本指南涵盖以下主题：

- **商品创建**: 完整的商品创建流程，包括信息填写、图片上传等
- **库存管理**: 实时库存查看、预警设置、批量操作、盘点功能
- **价格管理**: 基础价格、促销价、会员价配置

## 示例

```javascript
// 搜索库存相关内容
await skillRegistry.executeSkill('search_guide', { keyword: '库存' })

// 获取商品创建章节
await skillRegistry.executeSkill('get_section', { section: '商品创建' })
```
