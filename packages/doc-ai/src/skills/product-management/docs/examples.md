# 使用示例和最佳实践

## 场景1：日常商品管理

### 示例 1.1：查看所有商品
```javascript
// 用户："显示所有商品"
const result = await query_products({})
console.log(`共有 ${result.total} 个商品`)
console.log(`库存总价值：¥${result.summary.totalValue}`)
```

### 示例 1.2：查询特定分类
```javascript
// 用户："显示所有手机"
const result = await query_products({ category: 'phones' })
console.log(`手机类商品：${result.products.length} 个`)
```

### 示例 1.3：添加新商品
```javascript
// 用户："添加一个新的 iPhone 15 Pro Max，价格 9999，库存 50"
const result = await add_product({
  name: 'iPhone 15 Pro Max',
  price: 9999,
  stock: 50,
  category: 'phones'
})
console.log(`✓ 商品已添加，ID: ${result.product.id}`)
```

---

## 场景2：库存预警处理

### 示例 2.1：查询低库存商品
```javascript
// 用户："哪些商品库存不足？"
const result = await query_products({ lowStock: true })
console.log(`低库存商品：${result.products.length} 个`)
result.products.forEach(p => {
  console.log(`- ${p.name}: 剩余 ${p.stock} 件`)
})
```

### 示例 2.2：低库存商品下架
```javascript
// 用户："把库存不足的商品全部下架"
// 步骤1：查询低库存商品
const { products } = await query_products({ lowStock: true })
const ids = products.map(p => p.id)

// 步骤2：批量下架
const result = await batch_update_status({ 
  ids, 
  status: 'off' 
})
console.log(`✓ 已下架 ${result.updated} 个商品`)
```

### 示例 2.3：补充库存
```javascript
// 用户："给所有低库存商品补充 50 件库存"
const { products } = await query_products({ lowStock: true })
const ids = products.map(p => p.id)

const result = await batch_adjust_stock({
  ids,
  adjustType: 'add',
  adjustValue: 50
})
console.log(`✓ 已为 ${result.updated} 个商品补充库存`)
```

---

## 场景3：价格调整

### 示例 3.1：全场商品打折
```javascript
// 用户："所有商品降价 10%"
// 步骤1：获取所有上架商品
const { products } = await query_products({ status: 'on' })
const ids = products.map(p => p.id)

// 步骤2：批量调价
const result = await batch_adjust_price({
  ids,
  adjustType: 'percent',
  adjustValue: -0.1
})
console.log(`✓ ${result.updated} 个商品已降价`)
console.log(`总价格变化：¥${result.summary.totalPriceChange}`)
```

### 示例 3.2：特定分类涨价
```javascript
// 用户："手机类商品全部涨价 200 元"
const { products } = await query_products({ category: 'phones' })
const ids = products.map(p => p.id)

const result = await batch_adjust_price({
  ids,
  adjustType: 'fixed',
  adjustValue: 200
})
console.log(`✓ ${result.updated} 个手机商品已涨价`)
```

### 示例 3.3：价格区间调整
```javascript
// 用户："价格低于 3000 的商品全部涨价 20%"
const { products } = await query_products({ maxPrice: 3000 })
const ids = products.map(p => p.id)

const result = await batch_adjust_price({
  ids,
  adjustType: 'percent',
  adjustValue: 0.2
})
console.log(`✓ 已调整 ${result.updated} 个商品价格`)
```

---

## 场景4：批量上下架

### 示例 4.1：上架所有平板
```javascript
// 用户："上架所有平板电脑"
const { products } = await query_products({ category: 'tablets' })
const ids = products.map(p => p.id)

const result = await batch_update_status({
  ids,
  status: 'on'
})
console.log(`✓ 已上架 ${result.updated} 个平板商品`)
```

### 示例 4.2：下架高价商品
```javascript
// 用户："下架所有价格超过 15000 的商品"
const { products } = await query_products({ minPrice: 15000 })
const ids = products.map(p => p.id)

const result = await batch_update_status({
  ids,
  status: 'off'
})
console.log(`✓ 已下架 ${result.updated} 个高价商品`)
```

---

## 场景5：数据分析

### 示例 5.1：生成库存报告
```javascript
// 用户："生成库存报告"
const report = await get_inventory_report()

console.log('=== 库存报告 ===')
console.log(`总商品数：${report.summary.totalProducts}`)
console.log(`总库存价值：¥${report.summary.totalValue}`)
console.log(`平均价格：¥${report.summary.avgPrice}`)
console.log(`低库存商品：${report.lowStock.length} 个`)
console.log('\n各分类统计：')
Object.entries(report.byCategory).forEach(([cat, stat]) => {
  console.log(`- ${cat}: ${stat.count}个，总值¥${stat.totalValue}`)
})
```

### 示例 5.2：查找畅销商品
```javascript
// 用户："找出最贵的 5 个商品"
const { products } = await query_products({
  sortBy: 'price',
  sortOrder: 'desc'
})
const top5 = products.slice(0, 5)
console.log('Top 5 最贵商品：')
top5.forEach((p, i) => {
  console.log(`${i+1}. ${p.name} - ¥${p.price}`)
})
```

---

## 场景6：复杂操作流程

### 示例 6.1：清理滞销商品
```javascript
// 用户："把库存超过 100 且价格低于 2000 的商品降价 30% 并下架"

// 步骤1：查询目标商品
const { products } = await query_products({})
const targets = products.filter(p => p.stock > 100 && p.price < 2000)
const ids = targets.map(p => p.id)

console.log(`找到 ${ids.length} 个滞销商品`)

// 步骤2：降价 30%
const priceResult = await batch_adjust_price({
  ids,
  adjustType: 'percent',
  adjustValue: -0.3
})
console.log(`✓ 已降价 ${priceResult.updated} 个商品`)

// 步骤3：下架
const statusResult = await batch_update_status({
  ids,
  status: 'off'
})
console.log(`✓ 已下架 ${statusResult.updated} 个商品`)
```

### 示例 6.2：新品上架流程
```javascript
// 用户："批量添加新款 MacBook 系列"

const newProducts = [
  { name: 'MacBook Air M3', price: 9999, stock: 50 },
  { name: 'MacBook Pro 14 M3', price: 14999, stock: 30 },
  { name: 'MacBook Pro 16 M3 Max', price: 24999, stock: 20 }
]

for (const product of newProducts) {
  const result = await add_product({
    ...product,
    category: 'laptops',
    status: 'on'
  })
  console.log(`✓ 已添加：${result.product.name}`)
}
```

### 示例 6.3：促销活动准备
```javascript
// 用户："准备双十一促销：所有商品降价 15%，库存增加 100 件"

// 步骤1：获取所有商品
const { products } = await query_products({})
const ids = products.map(p => p.id)

// 步骤2：批量降价
const priceResult = await batch_adjust_price({
  ids,
  adjustType: 'percent',
  adjustValue: -0.15
})
console.log(`✓ 已降价 ${priceResult.updated} 个商品`)

// 步骤3：批量补货
const stockResult = await batch_adjust_stock({
  ids,
  adjustType: 'add',
  adjustValue: 100
})
console.log(`✓ 已补货 ${stockResult.updated} 个商品`)

// 步骤4：全部上架
const statusResult = await batch_update_status({
  ids,
  status: 'on'
})
console.log(`✓ 已上架 ${statusResult.updated} 个商品`)
```

---

## 最佳实践总结

### ✅ DO - 推荐做法

1. **操作前先查询**
   ```javascript
   // ✅ 先查询确认范围
   const { products } = await query_products({ category: 'phones' })
   const ids = products.map(p => p.id)
   await batch_update_status({ ids, status: 'off' })
   ```

2. **使用批量操作**
   ```javascript
   // ✅ 批量操作高效
   await batch_adjust_price({ ids: [...], adjustType: 'percent', adjustValue: -0.1 })
   
   // ❌ 避免循环调用
   for (const id of ids) {
     await update_product({ id, price: newPrice })  // 低效
   }
   ```

3. **详细的用户反馈**
   ```javascript
   // ✅ 提供详细反馈
   const result = await batch_update_status({ ids, status: 'on' })
   console.log(`成功：${result.updated} 个，失败：${result.failed} 个`)
   if (result.failed > 0) {
     console.log('失败原因：', result.results.filter(r => !r.success))
   }
   ```

4. **数据验证**
   ```javascript
   // ✅ 添加商品前验证数据
   if (price <= 0) {
     return { error: '价格必须大于0' }
   }
   if (stock < 0) {
     return { error: '库存不能为负数' }
   }
   await add_product({ name, price, stock, category })
   ```

5. **分步执行复杂操作**
   ```javascript
   // ✅ 分步执行，便于调试和回滚
   // Step 1: 查询
   const { products } = await query_products({ lowStock: true })
   
   // Step 2: 用户确认
   console.log(`将操作 ${products.length} 个商品，是否继续？`)
   
   // Step 3: 执行操作
   const ids = products.map(p => p.id)
   await batch_update_status({ ids, status: 'off' })
   ```

### ❌ DON'T - 避免做法

1. **盲目批量操作**
   ```javascript
   // ❌ 不查询直接操作
   await batch_update_status({ ids: ['1', '2', '3'], status: 'off' })
   ```

2. **忽略错误处理**
   ```javascript
   // ❌ 不处理错误
   await add_product({ name, price, stock, category })
   
   // ✅ 正确处理错误
   try {
     await add_product({ name, price, stock, category })
   } catch (error) {
     console.error('添加商品失败：', error.message)
   }
   ```

3. **频繁小批量操作**
   ```javascript
   // ❌ 多次小批量
   await batch_adjust_price({ ids: ids1, ... })
   await batch_adjust_price({ ids: ids2, ... })
   
   // ✅ 一次大批量
   await batch_adjust_price({ ids: [...ids1, ...ids2], ... })
   ```

---

## 性能优化建议

1. **批量操作分组**：超过 100 个商品时自动分批
2. **结果缓存**：频繁查询的数据使用客户端缓存
3. **异步处理**：耗时操作使用异步模式
4. **增量更新**：只更新变化的字段

---

## 调试技巧

1. **查看详细结果**
   ```javascript
   const result = await batch_update_status({ ids, status: 'on' })
   console.log('详细结果：', JSON.stringify(result, null, 2))
   ```

2. **分步验证**
   ```javascript
   // 操作前
   const before = await query_products({ category: 'phones' })
   // 执行操作
   await batch_adjust_price({ ... })
   // 操作后
   const after = await query_products({ category: 'phones' })
   // 对比结果
   console.log('价格变化：', before[0].price, '->', after[0].price)
   ```

3. **使用库存报告**
   ```javascript
   const report = await get_inventory_report()
   console.log('操作建议：', report.recommendations)
   ```
