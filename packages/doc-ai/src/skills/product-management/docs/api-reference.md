# API 参考文档

## 完整的 MCP 工具 API 说明

### query_products

**工具名称**: `query_products`

**描述**: 查询商品列表，支持多种筛选条件

**输入参数**:

```typescript
interface QueryProductsInput {
  category?: 'phones' | 'laptops' | 'tablets'  // 商品分类
  status?: 'on' | 'off'                        // 商品状态
  minPrice?: number                            // 最低价格
  maxPrice?: number                            // 最高价格
  lowStock?: boolean                           // 是否只查询低库存（< 10）
  keyword?: string                             // 关键词搜索（商品名称）
  sortBy?: 'price' | 'stock' | 'name'          // 排序字段
  sortOrder?: 'asc' | 'desc'                   // 排序顺序
}
```

**返回值**:

```typescript
interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: 'phones' | 'laptops' | 'tablets'
  status: 'on' | 'off'
}

interface QueryProductsResult {
  products: Product[]
  total: number
  summary: {
    totalValue: number    // 总价值
    avgPrice: number      // 平均价格
    totalStock: number    // 总库存
  }
}
```

**示例**:

```javascript
// 查询所有手机
await query_products({ category: 'phones' })

// 查询价格在 5000-10000 的笔记本
await query_products({ 
  category: 'laptops', 
  minPrice: 5000, 
  maxPrice: 10000 
})

// 查询低库存商品并按库存升序排列
await query_products({ 
  lowStock: true, 
  sortBy: 'stock', 
  sortOrder: 'asc' 
})
```

---

### add_product

**工具名称**: `add_product`

**描述**: 添加新商品到系统

**输入参数**:

```typescript
interface AddProductInput {
  name: string                                 // 商品名称（必需，不能为空）
  price: number                                // 价格（必需，> 0）
  stock: number                                // 库存（必需，>= 0）
  category: 'phones' | 'laptops' | 'tablets'   // 分类（必需）
  status?: 'on' | 'off'                        // 状态（可选，默认 'on'）
  description?: string                         // 商品描述（可选）
  image?: string                               // 商品图片URL（可选）
}
```

**返回值**:

```typescript
interface AddProductResult {
  success: boolean
  product: Product      // 新创建的商品信息（包含自动生成的ID）
  message: string
}
```

**示例**:

```javascript
await add_product({
  name: 'MacBook Pro 14',
  price: 14999,
  stock: 30,
  category: 'laptops',
  description: 'M3 Pro芯片，16GB内存'
})
```

---

### update_product

**工具名称**: `update_product`

**描述**: 更新指定商品的信息

**输入参数**:

```typescript
interface UpdateProductInput {
  id: string                                   // 商品ID（必需）
  name?: string                                // 新名称
  price?: number                               // 新价格（> 0）
  stock?: number                               // 新库存（>= 0）
  category?: 'phones' | 'laptops' | 'tablets'  // 新分类
  status?: 'on' | 'off'                        // 新状态
  description?: string                         // 新描述
  image?: string                               // 新图片URL
}
```

**返回值**:

```typescript
interface UpdateProductResult {
  success: boolean
  product: Product      // 更新后的商品信息
  changes: string[]     // 变更的字段列表
  message: string
}
```

**示例**:

```javascript
// 只更新价格
await update_product({ id: '123', price: 15999 })

// 更新多个字段
await update_product({ 
  id: '123', 
  price: 15999, 
  stock: 25,
  status: 'on'
})
```

---

### delete_product

**工具名称**: `delete_product`

**描述**: 删除指定商品

**输入参数**:

```typescript
interface DeleteProductInput {
  id: string          // 商品ID（必需）
  confirm?: boolean   // 确认删除（可选，默认需要确认）
}
```

**返回值**:

```typescript
interface DeleteProductResult {
  success: boolean
  deletedProduct: Product   // 被删除的商品信息
  message: string
}
```

**注意事项**:
- 删除操作不可恢复
- 建议在删除前向用户展示商品信息并要求确认

**示例**:

```javascript
await delete_product({ id: '123', confirm: true })
```

---

### batch_update_status

**工具名称**: `batch_update_status`

**描述**: 批量更新商品状态（上架/下架）

**输入参数**:

```typescript
interface BatchUpdateStatusInput {
  ids: string[]         // 商品ID数组（必需，最多100个）
  status: 'on' | 'off'  // 目标状态（必需）
}
```

**返回值**:

```typescript
interface BatchUpdateStatusResult {
  success: boolean
  updated: number         // 成功更新的数量
  failed: number          // 失败的数量
  results: Array<{
    id: string
    success: boolean
    error?: string
  }>
  message: string
}
```

**示例**:

```javascript
// 批量上架
await batch_update_status({ 
  ids: ['1', '2', '3'], 
  status: 'on' 
})

// 配合查询使用：下架所有低库存商品
const { products } = await query_products({ lowStock: true })
const ids = products.map(p => p.id)
await batch_update_status({ ids, status: 'off' })
```

---

### batch_adjust_price

**工具名称**: `batch_adjust_price`

**描述**: 批量调整商品价格

**输入参数**:

```typescript
interface BatchAdjustPriceInput {
  ids: string[]                       // 商品ID数组（必需，最多100个）
  adjustType: 'percent' | 'fixed'     // 调整方式（必需）
  adjustValue: number                 // 调整值（必需）
  // adjustType='percent': 百分比，如 -0.1 表示降价10%，0.2 表示涨价20%
  // adjustType='fixed': 固定金额，如 -100 表示降价100元，50 表示涨价50元
}
```

**返回值**:

```typescript
interface BatchAdjustPriceResult {
  success: boolean
  updated: number
  failed: number
  results: Array<{
    id: string
    oldPrice: number
    newPrice: number
    success: boolean
    error?: string
  }>
  summary: {
    totalPriceChange: number  // 总价格变化
    avgPriceChange: number    // 平均价格变化
  }
  message: string
}
```

**约束**:
- 调整后的价格必须 >= 0.01
- 百分比调整范围建议在 -50% 到 +100% 之间

**示例**:

```javascript
// 所有商品降价10%
await batch_adjust_price({ 
  ids: allProductIds, 
  adjustType: 'percent', 
  adjustValue: -0.1 
})

// 特定商品涨价200元
await batch_adjust_price({ 
  ids: ['1', '2'], 
  adjustType: 'fixed', 
  adjustValue: 200 
})
```

---

### batch_adjust_stock

**工具名称**: `batch_adjust_stock`

**描述**: 批量调整商品库存

**输入参数**:

```typescript
interface BatchAdjustStockInput {
  ids: string[]           // 商品ID数组（必需，最多100个）
  adjustType: 'set' | 'add'  // 调整方式
  // 'set': 设置为指定值
  // 'add': 增加/减少指定数量
  adjustValue: number     // 调整值（必需，>= 0 for 'set', any for 'add'）
}
```

**返回值**:

```typescript
interface BatchAdjustStockResult {
  success: boolean
  updated: number
  failed: number
  results: Array<{
    id: string
    oldStock: number
    newStock: number
    success: boolean
    error?: string
  }>
  message: string
}
```

**示例**:

```javascript
// 所有商品库存增加50
await batch_adjust_stock({ 
  ids: allProductIds, 
  adjustType: 'add', 
  adjustValue: 50 
})

// 设置库存为100
await batch_adjust_stock({ 
  ids: ['1', '2'], 
  adjustType: 'set', 
  adjustValue: 100 
})
```

---

### get_inventory_report

**工具名称**: `get_inventory_report`

**描述**: 生成库存分析报告

**输入参数**: 无

**返回值**:

```typescript
interface InventoryReport {
  timestamp: string
  summary: {
    totalProducts: number      // 总商品数
    totalValue: number         // 总库存价值
    totalStock: number         // 总库存数量
    avgPrice: number           // 平均价格
    avgStock: number           // 平均库存
  }
  lowStock: Product[]          // 低库存商品列表（< 10）
  highValue: Product[]         // 高价值商品列表（前10）
  byCategory: {
    [category: string]: {
      count: number
      totalValue: number
      avgPrice: number
    }
  }
  byStatus: {
    on: number                 // 上架商品数
    off: number                // 下架商品数
  }
  recommendations: string[]    // 操作建议
}
```

**示例**:

```javascript
const report = await get_inventory_report()
console.log(`低库存商品: ${report.lowStock.length}个`)
console.log(`库存总价值: ¥${report.summary.totalValue}`)
```

---

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|---------|
| `PRODUCT_NOT_FOUND` | 商品不存在 | 检查商品ID是否正确 |
| `INVALID_PRICE` | 价格不合法 | 价格必须 > 0 |
| `INVALID_STOCK` | 库存不合法 | 库存必须 >= 0 |
| `INVALID_CATEGORY` | 分类不合法 | 使用预定义的分类值 |
| `INVALID_STATUS` | 状态不合法 | 状态必须是 'on' 或 'off' |
| `BATCH_LIMIT_EXCEEDED` | 批量操作超过限制 | 每次最多100个商品 |
| `PERMISSION_DENIED` | 无权限 | 检查用户权限 |
| `VALIDATION_ERROR` | 数据验证失败 | 检查输入参数 |

## 性能建议

1. **批量操作优先**: 多个商品操作时使用批量工具而非循环调用
2. **合理筛选**: 使用查询条件减少数据量
3. **分页处理**: 大量数据时考虑分页（未来版本支持）
4. **缓存结果**: 频繁查询的数据可在客户端缓存
