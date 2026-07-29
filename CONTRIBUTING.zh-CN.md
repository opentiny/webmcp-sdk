# 贡献指南

很高兴你有意愿参与 **OpenTiny NEXT-SDKs** 项目的贡献。参与贡献的形式有很多种，你可以根据自己的特长和兴趣选择其中的一个或多个：

- 报告[新缺陷](https://github.com/opentiny/next-sdk/issues/new?template=bug-report.yml)
- 为[已有缺陷](https://github.com/opentiny/next-sdk/labels/bug)提供更详细的信息，比如补充截图、提供更详细的复现步骤、提供最小可复现 demo 链接等
- 提交 Pull requests 修复文档中的错别字或让文档更清晰和完善
- 添加官方小助手微信 opentiny-official，加入技术交流群参与讨论

当你亲自使用 NEXT-SDKs 并参与多次以上形式的贡献，对项目逐渐熟悉之后，可以尝试做一些更有挑战的事情，比如：

- 修复缺陷，可以先从 [Good-first issue](https://github.com/opentiny/next-sdk/labels/good%20first%20issue) 开始
- 实现新特性
- 完善单元测试
- 翻译文档
- 参与代码检视

## 提交 Issue

如果你在使用 OpenTiny NEXT-SDKs 过程中遇到问题，欢迎给我们提交 Issue。提交 Issue 之前，请先仔细阅读相关的[官方文档](https://docs.opentiny.design/next-sdk/)，确认这是一个缺陷还是尚未实现的功能。

如果是一个缺陷，创建新 Issue 时选择 [Bug report](https://github.com/opentiny/next-sdk/issues/new?template=bug-report.yml) 模板，标题遵循 `[packageName] 缺陷简述` 的格式，比如：`[next-sdk] registerPageAgentTool 重复注册后配置未按 replace 生效`。

报告缺陷的 Issue 主要需要填写以下信息：

- `@opentiny/next-sdk`、`@opentiny/next-remoter`（如涉及）及 Node.js 的版本号
- 缺陷的表现，可截图辅助说明，如果有报错可贴上报错信息
- **中文复现场景**（前置 / 步骤 / 期望 / 实际），模板见 [`docs/ai-engineering/templates/bug-repro.md`](./docs/ai-engineering/templates/bug-repro.md)
- 缺陷的复现步骤，最好能提供一个最小可复现 demo 链接

如果是一个新特性，则选择 [Feature request](https://github.com/opentiny/next-sdk/issues/new?template=feature-request.yml) 模板，标题遵循 `[packageName] 新特性简述` 的格式，比如：`[next-remoter] 希望支持自定义主题变量`。

新特性的 Issue 主要需要填写以下信息：

- 该特性主要解决用户的什么问题
- 该特性的 API 是什么样的
- 开发时在主责包创建 Spec：`packages/<pkg>/specs/REQ-YYYYMMDD-slug/`（见 [`docs/ai-engineering/`](./docs/ai-engineering/)）

## AI 协作与质量闭环

本仓库以根目录 [`AGENTS.md`](./AGENTS.md) 为跨工具唯一约束源（文首含 **任务分流** 硬门禁）。要点：

1. **先分流再编码**：Bug → 复现测试；非琐碎 Feature → 先建 Spec；琐碎豁免须写明理由。判定清单见 `AGENTS.md`「必须建 Spec」。
2. **就近**：Spec 在 `packages/<pkg>/specs/`，测试在 `packages/<pkg>/test/`，二者不要混放。
3. **Bugfix**：PR 标题 `fix:`；变更中须含带「复现：」的测试；`pnpm test` 通过。关联 Issue **可选**（其它途径反馈的 bug 可不填）。
4. **Feature**：PR 标题 `feat:`；变更中须同时含完整 Spec 目录（requirements/design/tasks）和至少一个测试文件。琐碎改动可打 label `skip-spec`，但仍须包含测试。
5. **Skills**：`pnpm install` 会执行 `skills:sync`；大 Skill 不进 Git。
6. **合入**：须通过 GitHub Actions **Merge Ready**；维护者需配置 Branch Protection（见 [`docs/ai-engineering/merge-gate.md`](./docs/ai-engineering/merge-gate.md)）。

本地预检：

```bash
git diff --name-only --diff-filter=ACMR origin/dev...HEAD > /tmp/changed.txt
PR_LABELS='["skip-spec"]' SKIP_SPEC=true node .github/scripts/pr-gate.mjs \
  --title "feat(next-sdk): trivial typo" \
  --labels '["skip-spec"]' \
  --changed-files-file /tmp/changed.txt

# Bug fix 示例
node .github/scripts/pr-gate.mjs \
  --title "fix(next-sdk): demo" \
  --changed-files-file /tmp/changed.txt
```

## 提交 PR

提交 PR 之前，请先确保你提交的内容是符合 NEXT-SDKs 整体规划的。一般已经标记为 [bug](https://github.com/opentiny/next-sdk/labels/bug) 的 Issue 是鼓励提交 PR 的。如果你不是很确定，可以创建一个 [Discussion](https://github.com/opentiny/next-sdk/discussions) 进行讨论。

### Pull Request 规范

#### Commit 信息

commit 信息要以 `type(scope): 描述信息` 的形式填写，例如：`fix(next-sdk): 修复 page-agent-tool 无障碍树增量 Diff`。

1. **type**：必须是 `build`、`chore`、`ci`、`docs`、`feat`、`fix`、`perf`、`refactor`、`revert`、`release`、`style`、`test`、`improvement` 其中的一个。

2. **scope**（可选）：`packages` 目录下的包名或模块名，例如：
   - 包名：`next-sdk`、`next-remoter`、`next-wxt`、`doc-ai`、`vue-playground`、`next-sdk-playground`、`next-docs`
   - next-sdk 下模块：`next-sdk/transport`、`next-sdk/agent` 等

#### Pull Request 的标题

1. 标题的规范与 commit 信息一致，以 `type(scope): 描述信息` 的形式填写。

2. 标题示例：
   - 补充 next-sdk 文档：`docs(next-docs): 添加 MCP 传输层说明`
   - 修复 page-agent 缺陷：`fix(next-sdk): 修复 setPageAgentToolConfig merge 行为`
   - next-remoter 新特性：`feat(next-remoter): 支持自定义主题`

#### Pull Request 的描述

PR 描述使用了模板，需要按照模板填写 PR 相关信息，主要包括：

- PR 自检项：Commit 信息是否符合规范、是否补充了测试、是否补充了文档
- PR 类型：缺陷修复、新特性、代码格式调整、重构、构建、CI、文档等
- 关联的 Issue 编号
- 是否包含破坏性变更

### 本地启动步骤

- 点击 [next-sdk](https://github.com/opentiny/next-sdk) 代码仓库右上角的 Fork 按钮，将上游仓库 Fork 到个人仓库
- Clone 个人仓库到本地
- 关联上游仓库，方便同步上游仓库最新代码
- 在项目根目录下运行 `pnpm install` 安装依赖（请使用 pnpm，不要使用 npm 或 yarn）
- 运行 `pnpm dev` 启动 doc-ai 示例，或运行 `pnpm wiki` 启动 VitePress 文档站点

```shell
# username 为你的 GitHub 用户名，执行前请替换
git clone git@github.com:username/next-sdk.git
cd next-sdk

# 关联上游仓库
git remote add upstream git@github.com:opentiny/next-sdk.git

# 安装依赖
pnpm install

# 启动 doc-ai 示例
pnpm dev

# 启动 VitePress 文档
pnpm wiki

# 其他开发命令
# pnpm dev:remoter    - next-remoter 组件开发
# pnpm dev:wxt        - 浏览器扩展
# pnpm dev:vue-playground  - Vue 示例
# pnpm dev:playground - Next.js 示例
```

### 提交 PR 的步骤

- 请确保你已经完成本地启动中的步骤，并能正常运行项目
- 同步上游仓库 dev 分支最新代码：`git pull upstream dev`
- 从上游仓库 dev 分支创建新分支：`git checkout -b username/feature1 upstream/dev`，分支名字建议为 `username/feat-xxx` / `username/fix-xxx`
- 本地编码
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范进行提交，不符合提交规范的 PR 可能不会被合并
- 提交到远程仓库：`git push origin branchName`
- 打开 next-sdk 代码仓库的 [Pull requests](https://github.com/opentiny/next-sdk/pulls) 链接，点击 **New pull request** 按钮提交 PR
- 按照 PR 模板补充相关信息，包括 PR 自检项、PR 类型、关联的 Issue 编号、是否是破坏性变更
- 项目维护者进行 Code Review，并提出意见
- PR 作者根据意见调整代码。请注意：一个分支发起了 PR 后，后续的 commit 会自动同步，无需重新提交 PR
- 项目维护者合并 PR

贡献流程结束，感谢你的贡献！

## 加入开源社区

如果你对我们的开源项目感兴趣，欢迎通过以下方式加入我们的开源社区。

- 添加官方小助手微信：**opentiny-official**，加入我们的技术交流群
- 加入邮件列表：<opentiny@googlegroups.com>

如果你给 OpenTiny 提交过 Issue 或 PR，可以通过在 Issue 或 Pull Request 下评论的方式，请求 @all-contributors 将你加入贡献者列表：

```text
@all-contributors please add @<username> for <contributions>
```

详细规则可以参考：[allcontributors.org - bot 使用说明](https://allcontributors.org/docs/en/bot/usage)

## 贡献者

我们诚挚感谢每位参与 OpenTiny NEXT-SDKs 项目的贡献者们！你的贡献会体现在仓库的 [contributors](https://github.com/opentiny/next-sdk/graphs/contributors) 中。我们欢迎各种形式的贡献，包括代码、文档与反馈。
