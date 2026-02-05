---
name: calculator
description: 执行基本算术运算（加、减、乘、除）。当用户需要进行数学计算时使用此技能。
---

# Calculator Skill

这个技能提供基本的算术运算功能。

## 输入参数

- `a` (number): 第一个数字
- `b` (number): 第二个数字
- `operation` (string): 要执行的运算类型
  - 可选值: `add`, `subtract`, `multiply`, `divide`

## 使用场景

当用户需要执行以下操作时，使用此技能：

- 加法运算
- 减法运算
- 乘法运算
- 除法运算

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
