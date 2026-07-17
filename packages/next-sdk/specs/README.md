# next-sdk Specs

本目录存放 **本包** Feature Spec 实例（就近原则）。模板见 [`docs/ai-engineering/templates/`](../../../docs/ai-engineering/templates/)。

## 命名

`REQ-YYYYMMDD-短横线 slug/`，内含：

- `requirements.md`
- `design.md`
- `tasks.md`

## 状态

草稿 → 评审 → 开发中 → 已交付（写在 `requirements.md` 元信息中）。

## 与测试

Spec 是文档；可执行测试在 `../test/`。禁止把 Spec 放进 `test/`。

## 跨包需求

若改动跨多个包，Spec 放在 **主责包** 的 `specs/`；PR Gate Fields 的 `Spec:` 指向该路径。
