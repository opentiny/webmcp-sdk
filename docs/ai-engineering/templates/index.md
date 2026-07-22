# Spec / Bug 模板

非琐碎 Feature 与 Bug 复现的 Markdown 模板；实例放在主责包 `packages/<pkg>/specs/` 或 `packages/<pkg>/test/`。

**Agent：动手前先读根 [`AGENTS.md`](../../../AGENTS.md) 文首「任务分流」。** 非琐碎 Feature 必须先复制本目录三件套到 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/`，再写代码。

## 何时建 Spec

见根 `AGENTS.md`「必须建 Spec」清单。简表：

| 要做的事 | 产物 |
|---|---|
| 非琐碎 Feature | `specs/REQ-…/{requirements,design,tasks}.md` 后再实现 |
| Bug | `test/` 中含 **`复现：`** 的用例后再修（本目录 [bug-repro.md](./bug-repro.md) 供描述参考） |
| 琐碎豁免 | 不建 Spec，但须写明理由 |

## 模板文件

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
- [bug-repro.md](./bug-repro.md)
