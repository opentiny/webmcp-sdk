# Contributing

We are glad that you are willing to contribute to the **OpenTiny NEXT-SDKs** project. There are many forms of contribution, and you can choose one or more of them according to your strengths and interests:

- Report [new defect](https://github.com/opentiny/next-sdk/issues/new?template=bug-report.yml)
- Provide more detailed information for [existing defects](https://github.com/opentiny/next-sdk/labels/bug), such as supplementary screenshots, reproduction steps, or minimal reproducible demo links
- Submit Pull requests to fix typos in the document or make the document clearer and better
- Add the official assistant WeChat `opentiny-official` and join the technical exchange group to participate in the discussion

When you use NEXT-SDKs and participate in many of the above contributions, as you become familiar with the project, you can try to do something more challenging, such as:

- Fix defects, you can start with [Good-first issue](https://github.com/opentiny/next-sdk/labels/good%20first%20issue)
- Implement new features
- Improve unit testing
- Translate the document
- Participate in code review

## Bug Reports

If you encounter problems while using OpenTiny NEXT-SDKs, you are welcome to submit an Issue. Before submitting, please read the relevant [official documentation](https://docs.opentiny.design/next-sdk/) carefully to confirm whether this is a defect or an unimplemented function.

If it is a defect, select the [Bug report](https://github.com/opentiny/next-sdk/issues/new?template=bug-report.yml) template when creating a new Issue. The title follows the format `[packageName] defect description`. For example: `[next-sdk] WebMcpClient reconnect fails after connection timeout`.

Issue that reports defects mainly needs to fill in the following information:

- Version numbers of `@opentiny/next-sdk`, `@opentiny/next-remoter` (if involved), and Node.js
- The performance of the defect can be illustrated by screenshot; if there is an error, post the error message
- Defect reproduction steps, preferably with a minimum reproducible demo link

If it is a new feature, select the [Feature request](https://github.com/opentiny/next-sdk/issues/new?template=feature-request.yml) template. The title follows the format `[packageName] new feature description`. For example: `[next-remoter] support custom theme variables`.

The following information is required for the Issue of the new feature:

- What problems does this feature mainly solve for users?
- What is the API of this feature?

## Pull Requests

Before submitting a pull request, please make sure that your submission is in line with the overall plan of NEXT-SDKs. Generally, issues marked as [bug](https://github.com/opentiny/next-sdk/labels/bug) are encouraged for pull requests. If you are not sure, you can create a [Discussion](https://github.com/opentiny/next-sdk/discussions) for discussion.

### Pull Request Specification

#### Commit Message

The commit message should be in the form of `type(scope): description`, e.g. `fix(next-sdk): fix WebMcpClient reconnect logic`.

1. **type**: must be one of `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `release`, `style`, `test`, `improvement`.

2. **scope** (optional): package or module name under `packages/`, e.g.:
   - Package names: `next-sdk`, `next-remoter`, `next-wxt`, `doc-ai`, `vue-playground`, `next-sdk-playground`, `next-docs`
   - Module under next-sdk: `next-sdk/transport`, `next-sdk/agent`, etc.

#### Pull Request Title

1. The title follows the same convention as the commit message: `type(scope): description`.

2. Example titles:
   - Added next-sdk documentation: `docs(next-docs): add MCP transport guide`
   - Fixed WebMcpClient bug: `fix(next-sdk): fix session timeout handling`
   - New feature for next-remoter: `feat(next-remoter): support custom theme`

#### Pull Request Description

The PR description uses a template. Please fill in the relevant information according to the template, mainly including:

- PR Checklist: Whether the commit message follows the specification, whether tests have been added, whether docs have been updated
- PR Type: Bugfix / Feature / Code style update / Refactoring / Build / CI / Documentation, etc.
- Issue Number
- Does this PR introduce a breaking change?

### Local Startup Steps

- Click the Fork button in the upper right corner of the [next-sdk](https://github.com/opentiny/next-sdk) repository to fork the upstream repository to your personal repository.
- Clone your personal repository to local.
- Associate with the upstream repository to sync the latest code.
- Run `pnpm install` in the project root to install dependencies.
- Run `pnpm dev` to start the doc-ai example, or `pnpm wiki` to start the VitePress documentation site.

```shell
# Replace username with your GitHub username
git clone git@github.com:username/next-sdk.git
cd next-sdk

# Associate upstream repository
git remote add upstream git@github.com:opentiny/next-sdk.git

# Install dependencies (use pnpm, not npm or yarn)
pnpm install

# Start doc-ai example
pnpm dev

# Start VitePress documentation
pnpm wiki

# Other development commands
# pnpm dev:remoter    - next-remoter component dev server
# pnpm dev:wxt        - browser extension
# pnpm dev:vue-playground  - Vue playground
# pnpm dev:playground - Next.js playground
```

### Submit a PR

- Make sure you have completed the local startup steps and can run the project normally.
- Sync the latest code from the upstream `dev` branch: `git pull upstream dev`.
- Create a new branch from upstream dev: `git checkout -b username/feature1 upstream/dev`. Branch name suggestion: `username/feat-xxx` / `username/fix-xxx`.
- Code locally.
- Submit according to the [Conventional Commits](https://www.conventionalcommits.org/) specification. PRs that do not follow the specification may not be merged.
- Push to your remote: `git push origin branchName`.
- Open the [Pull requests](https://github.com/opentiny/next-sdk/pulls) page of the next-sdk repository and click **New pull request** to submit the PR.
- Fill in the PR template: checklist, PR type, related Issue ID, whether it is a breaking change.
- Project maintainers will conduct Code Review and leave comments.
- Adjust the code according to the feedback. Note: after a branch has opened a PR, subsequent commits will be synced automatically; you do not need to resubmit the PR.
- Project maintainer merges the PR.

Thank you for your contribution!

## Join OpenTiny Community

If you are interested in our open-source project, you are welcome to join the community in the following ways:

- Add official assistant WeChat: **opentiny-official** to join the technical exchange group.
- Join the mailing list: <opentiny@googlegroups.com>

If you have submitted an Issue or PR to OpenTiny, you can comment on the Issue or Pull Request and ask @all-contributors to add you as a contributor:

```text
@all-contributors please add @<username> for <contributions>
```

For detailed rules, see [allcontributors.org - bot usage](https://allcontributors.org/docs/en/bot/usage).

## Contributors

We sincerely thank all contributors who have participated in the OpenTiny NEXT-SDKs project! Your contributions are reflected in the [contributors](https://github.com/opentiny/next-sdk/graphs/contributors) section of the repository. We welcome every form of contribution, including code, documentation, and feedback.
