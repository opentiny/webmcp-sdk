---
name: calculator
description: 执行商品库存管理相关的计算。
---

# Calculator Skill

这个技能提供商品库存管理相关的计算功能。

## 输入参数

- `a` (number): 商品数量 当前商品数量
- `b` (number): 商品库存 商品库存
- `operation` (string): 要执行的运算类型 加、减、乘、除

## Handler

此技能由 `calculatorHandler` 处理。

## 示例

```javascript
// 加法
{ a: 10, b: 5, operation: "add" }
// 返回: { result: 15, formula: "10 add 5 = 15" }

// 除法
{ a: 20, b: 4, operation: "divide" }
// 返回: { result: 5, formula: "20 divide 4 = 5" }
```
