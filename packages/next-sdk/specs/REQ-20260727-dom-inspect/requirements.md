# Spec：DOM 元素检视（公共能力）

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 协作包：`packages/doc-ai`（示例消费方）

## 背景

元素检视能力由 next-sdk 提供为公开模块：点击元素直接复制 Cursor 同款元数据，应用可在开发态按需启用。`doc-ai` 作为示例工程集成该能力，便于开发者直接体验和验证。

## 范围

### In Scope

- next-sdk 导出 `enableInspectAssist` / `disableInspectAssist` 等 API
- 浮钮切换检视；点击复制 `DOM Path` / `Position` / `HTML Element`
- `doc-ai` 在开发态启用 Inspect Assist
- 测试与文档

### Out of Scope

- 通过工具改 live 样式
- tabId / 可操作 id 协议

## 用户故事

1. 作为应用开发者，我希望 `import { enableInspectAssist } from '@opentiny/next-sdk'` 后在开发态点选复制元素卡片，以便快速定位并修改区域样式/逻辑。
2. 作为 `doc-ai` 开发者，我希望开发服务器启动后可直接使用检视浮钮，同时生产构建不会自动启用该能力。

## 完成定义

- [x] `doc-ai` 开发态集成并通过构建验证
- [x] 剪贴板格式：键值同行 + 摘要行 + `请输入修改意见：` 引导
