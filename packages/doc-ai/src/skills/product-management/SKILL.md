---
name: product-management-skill
description: 商品管理系统的智能辅助，提供商品增删改查、库存管理、批量操作等能力
license: MIT
metadata:
  author: zzcr
  version: "1.0.0"
  category: business
  tags: [e-commerce, product, crud, inventory]
---

# 商品管理助手

本技能为商品管理后台提供智能化能力，支持自然语言操作商品数据，包括查询、新增、编辑、删除、批量操作等功能。

## 使用时机

- 批量管理商品信息
- 查询和分析商品数据
- 快速修改商品属性（价格、库存、状态等）
- 生成商品报表和分析
- 库存预警和补货建议

## 功能概览

### 基础操作
- **查询商品**: 支持按名称、分类、状态等条件筛选
- **添加商品**: 快速创建新商品信息
- **编辑商品**: 修改商品的各项属性
- **删除商品**: 删除指定商品（需确认）

### 批量操作
- **批量上架/下架**: 一次性修改多个商品的状态
- **批量调价**: 按比例或固定金额调整商品价格
- **批量调整库存**: 统一调整商品库存数量

### 智能分析
- **库存预警**: 自动识别库存不足的商品
- **价格分析**: 分析价格趋势，提供定价建议
- **销量统计**: 统计商品销售情况

## 文档结构

本技能包含以下子文档，可通过 `read_memory_doc` 工具读取：

| 文档ID | 描述 | 调用方式 |
|-------|------|---------|
| api-reference | MCP 工具 API 参考文档 | `read_memory_doc("product-management:api-reference")` |
| business-rules | 业务规则和约束说明 | `read_memory_doc("product-management:business-rules")` |
| examples | 使用示例和最佳实践 | `read_memory_doc("product-management:examples")` |

## 可用的 MCP 工具

### 1. query_products - 查询商品列表

**功能**: 根据条件查询商品，支持筛选和排序

**参数**:
- `category` (可选): 商品分类 (`phones`/`laptops`/`tablets`)
- `status` (可选): 商品状态 (`on`/`off`)
- `minPrice` (可选): 最低价格
- `maxPrice` (可选): 最高价格
- `lowStock` (可选): 是否只查询低库存商品（库存 < 10）

**示例**: 
```
查询所有手机类商品: query_products({ category: "phones" })
查询库存不足的商品: query_products({ lowStock: true })
```

### 2. add_product - 添加新商品

**功能**: 创建一个新商品

**参数**:
- `name` (必需): 商品名称
- `price` (必需): 商品价格（正数）
- `stock` (必需): 库存数量（非负整数）
- `category` (必需): 商品分类
- `status` (可选): 商品状态，默认 `on`

**示例**:
```
添加新商品: add_product({ 
  name: "iPhone 15 Pro", 
  price: 7999, 
  stock: 50, 
  category: "phones" 
})
```

### 3. update_product - 更新商品信息

**功能**: 修改指定商品的信息

**参数**:
- `id` (必需): 商品ID
- `name` (可选): 新的商品名称
- `price` (可选): 新的价格
- `stock` (可选): 新的库存
- `category` (可选): 新的分类
- `status` (可选): 新的状态

**示例**:
```
修改商品价格: update_product({ id: "1", price: 8999 })
上架商品: update_product({ id: "2", status: "on" })
```

### 4. delete_product - 删除商品

**功能**: 删除指定的商品（需要用户确认）

**参数**:
- `id` (必需): 商品ID

**示例**:
```
删除商品: delete_product({ id: "5" })
```

### 5. batch_update_status - 批量更新商品状态

**功能**: 批量上架或下架商品

**参数**:
- `ids` (必需): 商品ID数组
- `status` (必需): 目标状态 (`on`/`off`)

**示例**:
```
批量上架: batch_update_status({ ids: ["1", "2", "3"], status: "on" })
批量下架平板类商品: 先 query_products({ category: "tablets" })，再批量下架
```

### 6. batch_adjust_price - 批量调整价格

**功能**: 按百分比或固定金额调整商品价格

**参数**:
- `ids` (必需): 商品ID数组
- `adjustType` (必需): 调整方式 (`percent` 百分比 / `fixed` 固定金额)
- `adjustValue` (必需): 调整值（百分比用小数表示，如 -0.1 表示降价10%）

**示例**:
```
所有商品降价10%: batch_adjust_price({ ids: [...], adjustType: "percent", adjustValue: -0.1 })
商品涨价100元: batch_adjust_price({ ids: [...], adjustType: "fixed", adjustValue: 100 })
```

### 7. get_inventory_report - 获取库存报告

**功能**: 生成库存分析报告

**返回**: 包含低库存商品、库存充足商品、总库存价值等信息

**示例**:
```
查看库存报告: get_inventory_report()
```

## 使用流程

### 典型工作流程

1. **查询商品**: 使用 `query_products` 了解当前商品状态
2. **分析数据**: 根据查询结果进行分析
3. **执行操作**: 使用相应的工具进行增删改
4. **验证结果**: 再次查询确认操作成功

### 自然语言操作示例

**用户**: "把所有手机类商品价格降低10%"
**执行步骤**:
1. 调用 `query_products({ category: "phones" })` 获取所有手机
2. 提取商品ID列表
3. 调用 `batch_adjust_price({ ids: [...], adjustType: "percent", adjustValue: -0.1 })`
4. 返回操作结果

**用户**: "查询库存低于10的商品并全部下架"
**执行步骤**:
1. 调用 `query_products({ lowStock: true })` 获取低库存商品
2. 提取商品ID列表
3. 调用 `batch_update_status({ ids: [...], status: "off" })`
4. 返回操作结果

**用户**: "上架所有平板电脑"
**执行步骤**:
1. 调用 `query_products({ category: "tablets" })` 获取所有平板
2. 提取商品ID列表
3. 调用 `batch_update_status({ ids: [...], status: "on" })`
4. 返回操作结果

## 重要约束

### 数据验证规则
- ❌ 商品价格必须为正数（> 0）
- ❌ 商品库存不能为负数（>= 0）
- ❌ 商品名称不能为空
- ❌ 商品分类必须是预定义的值之一

### 操作限制
- ⚠️ 删除操作需要用户明确确认
- ⚠️ 批量操作最多支持 100 个商品
- ⚠️ 价格调整不能使价格低于 0.01 元

### 业务规则
- 📋 新增商品默认状态为"上架"
- 📋 库存低于 10 被视为低库存
- 📋 下架商品不影响库存数量

## 错误处理

当操作失败时，工具会返回明确的错误信息：
- `PRODUCT_NOT_FOUND`: 商品不存在
- `INVALID_PRICE`: 价格不合法
- `INVALID_STOCK`: 库存数量不合法
- `INVALID_CATEGORY`: 分类不合法
- `PERMISSION_DENIED`: 无权限执行操作

## 最佳实践

1. **操作前先查询**: 批量操作前先用 `query_products` 确认范围
2. **分步执行**: 复杂操作分解为多个步骤，便于验证
3. **及时反馈**: 每次操作后向用户反馈结果
4. **数据验证**: 用户输入的数据要进行合法性验证

## 扩展能力

如需查看更多详细信息，请调用相应的子文档：
- 完整 API 文档: `read_memory_doc("product-management:api-reference")`
- 业务规则详解: `read_memory_doc("product-management:business-rules")`
- 更多使用示例: `read_memory_doc("product-management:examples")`
