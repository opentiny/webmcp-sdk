# Design：browserState 不输出敏感输入框的值

## 方案概述

在 `computeStates` 生成 `value` token 处判断元素是否为敏感字段；是则输出固定占位 `[已脱敏]`。无障碍树、Diff、`searchTree` 都基于同一份 YAML，脱敏只需在这一处完成。

## 涉及模块 / 文件

| 路径                                           | 职责                                         |
| ---------------------------------------------- | -------------------------------------------- |
| `packages/next-sdk/page-tools/a11y/config.ts`  | `isSensitiveField`；`computeStates` 输出占位 |
| `docs/webmcp-sdk/page-agent-tool.md`           | 用户文档                                     |
| `packages/next-sdk/skills/page-agent/SKILL.md` | 编码 Agent Skill                             |

## 核心数据结构 / 类型定义

无新公开类型。模块内辅助函数：

```typescript
const SENSITIVE_AUTOCOMPLETE =
  /\b(current-password|new-password|one-time-code|cc-number|cc-csc|cc-exp(-month|-year)?)\b/

function isSensitiveField(el: Element): boolean {
  if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password') return true
  return SENSITIVE_AUTOCOMPLETE.test(el.getAttribute('autocomplete') ?? '')
}
```

`autocomplete` 可以带 section / 地址前缀（如 `section-pay cc-number`），按单词边界匹配。

## 依赖变更

无。

## API / 行为变更

| 符号或行为                                                 | 变更类型 | 说明                            |
| ---------------------------------------------------------- | -------- | ------------------------------- |
| `resolveA11yStates` / `buildA11yTree` 输出的 `value` token | 修改     | 敏感字段输出 `value="[已脱敏]"` |
| 公开包入口                                                 | 无       | 不导出 `isSensitiveField`       |

## 风险与兼容

- 保留占位而不是省略 `value`：空字段不输出 `value`，写入后出现占位，`fill` 后的 Diff 仍有一行变化，Agent 能确认写入。代价是 Agent 无法从快照核对填入的具体内容。
- 判定只看 `type` 和 `autocomplete`，用普通文本框收密码且不声明 `autocomplete` 的页面不受保护。

## 备选方案（未采用）

- **省略 `value` token**：Agent 无法从 Diff 判断是否已填写，倾向于重复 `fill` 或改用 `executeJavascript` 读取值。
- **按标签文本（「密码」「卡号」）判定**：依赖语言和文案，误判与漏判都难以控制。
