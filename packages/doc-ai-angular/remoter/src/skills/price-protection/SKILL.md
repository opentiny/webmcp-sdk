---
name: price-protection
description: 商品价保。处理客户因降价提出的补差价请求（价保申请），包括查询、详情查看及审核。
---

# 价保管理技能 (Angular 版)

这个技能帮助管理员处理商品价保申请。在执行任何价保操作前，请确保已通过导航工具切换到正确的页面。

## 必须要执行的工作流

1. **路由导航**：在调用任何价保相关工具（如 `price-protection-query`）之前，**必须**先调用 `navigate_to_page` 工具跳转到 `/price-protection` 路由。
2. **信息提取**：
   - 收到查询请求时，提取状态参数。
   - 收到审核请求时，提取申请 ID、审批动作（通过/拒绝）及备注。
3. **操作确认**：如果是审核操作，建议再次确认 ID 和操作内容后再执行。

## 关联路由

- **价保主页**: `/price-protection` (包含申请列表、详情查看及审核功能)

## 可用工具说明

- `price-protection-query`: 查询申请列表，支持按状态过滤。
- `price-protection-detail`: 获取特定申请的详细信息。
- `price-protection-review`: 对待审核申请执行通过或拒绝操作。

## 示例工作流

- **用户**: "帮我看看现在有哪些待审核的价保申请。"
- **AI**: 
  1. 调用 `navigate_to_page(path: "/price-protection")`
  2. 调用 `price-protection-query(status: "pending")`
  3. 报告查询结果。
