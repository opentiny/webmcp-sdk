# Agent Skills 安装说明

## 原则

- **大型编码 Skill**（如 TinyVue / TinyRobot）：以 npm 包分发，**不进业务 Git**；`pnpm install` → `prepare` → `skills:sync` 落到 `.agents/skills/`。  
- **薄项目 Skill**（如 page-agent）：源文件在 `packages/<pkg>/skills/`，sync 时 symlink 到 `.agents/skills/`。  
- `.agents/` 已在 `.gitignore` 中。

## 配置

- 清单：[`skills.manifest.json`](../../skills.manifest.json)  
- 脚本：`pnpm skills:sync`（见根 `package.json` 的 `prepare`）

## 大 Skill npm 包

若 registry 上暂无 `@opentiny/tiny-vue-skill` 等包，`skills:sync` 会跳过缺失依赖并打印提示；发包或配置私有源后即可自动同步。

本地调试可用 `skills.manifest.json` 中的 `localPackages` 指向已安装的 `node_modules` 路径。

## 与运行时业务 Skill 的区别

`doc-ai` / `next-wxt` 等目录下给 **终端用户 Agent** 用的 `SKILL.md` 是产品功能源码，与本安装链无关。
