# AI 友好工程（本仓库）

本目录是 **横切** 的 AI 协作说明与模板：原理、仓级 steering、Spec/Bug 模板、合入门禁说明。

**不放** 各包业务 Spec 实例、不放包 API 长文。那些跟包走：

| 资产 | 位置 |
|---|---|
| 横切硬规则 | 仓库根 [`AGENTS.md`](https://github.com/opentiny/webmcp-sdk/blob/dev/AGENTS.md)（不在本站路由内） |
| 包约定 / API 索引 | `packages/<pkg>/AGENTS.md` |
| Feature Spec | `packages/<pkg>/specs/REQ-*/` |
| 可执行测试 | `packages/<pkg>/test/` |
| 薄项目 Skill | `packages/<pkg>/skills/` |
| 大型编码 Skill | npm 依赖 + `pnpm skills:sync` → `.agents/skills/`（gitignore） |

任意支持 [AGENTS.md](https://github.com/openai/agents.md) / Agent Skills 的编辑器均可协作；不以某一 IDE 私有规则树为权威源。

## 快速入口

- [原理摘要](./PRINCIPLES.md)
- [仓级 steering](./steering/index.md)
- [模板](./templates/index.md)
- [合入门禁与 Branch Protection](./merge-gate.md)
- [Skills 安装](./skills-install.md)

## 开发者日常

```bash
pnpm install          # 会 prepare → skills:sync
pnpm test             # 单元测试
pnpm skills:sync      # 手动重新同步 Agent Skills
node .github/scripts/pr-gate.mjs --help
```
