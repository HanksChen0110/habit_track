# REQUIREMENT: 建立 GitHub CI 四关与合并保护

- **Change ID**: `ci-quality-gates`
- **关联**: `@.specs/ci-quality-gates/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

- **US-1**：作为仓库维护者，我想让每个指向 `main` 的变更自动经历静态检查、类型检查、测试和构建，以便在合并前发现可重复验证的质量问题。
- **US-2**：作为仓库维护者，我想让 GitHub 在四项质量检查未通过或未完成时阻止合并，以便合并规则不依赖人工记忆。

## 验收准则（AC）

### AC-1 · 本地四关命令可执行

- **Given** 使用 `pnpm-lock.yaml` 的干净仓库检出
- **When** 依次运行 `pnpm lint`、`pnpm typecheck`、`pnpm test:run`、`pnpm build`
- **Then** 四条命令均以 exit code 0 完成，且 `lint` 对 TypeScript / React 源码生效
- **验证方式**: `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build`

### AC-2 · PR 与 main 推送触发四个独立检查

- **Given** 仓库存在 CI workflow
- **When** 创建或更新目标为 `main` 的 pull request，或向 `main` 推送提交
- **Then** GitHub Actions 显示且只以 `lint`、`typecheck`、`test`、`build` 作为本次 change 定义的四个质量 job 名称；每个 job 使用锁定依赖并运行对应的 pnpm 命令
- **验证方式**: `gh run view <run-id> --json jobs,conclusion,event,headBranch`

### AC-3 · CI 不依赖机密或生产配置

- **Given** GitHub Actions 运行在 fork-safe 的 PR / main push 上下文
- **When** 读取 workflow 和运行日志
- **Then** workflow 只请求只读 `contents` 权限，不引用 `secrets`、Vercel、Supabase 或 `.env` 值
- **验证方式**: `rg -n "secrets:|VITE_SUPABASE|SUPABASE_|VERCEL_" .github/workflows`

### AC-4 · main 将四关设为 required status checks

- **Given** GitHub 仓库的 `main` 分支存在 active ruleset
- **When** 查询 ruleset 配置
- **Then** `lint`、`typecheck`、`test`、`build` 四个 GitHub Actions check context 均列为 required status checks，且要求分支在合并前与 `main` 保持最新
- **验证方式**: `gh api repos/HanksChen0110/habit_track/rulesets/<id>`

### AC-5 · 未完成或失败检查阻止 PR 合并

- **Given** 一个目标为 `main` 的 pull request 受 AC-4 ruleset 约束
- **When** GitHub 检查尚未完成或任一 required check 失败
- **Then** GitHub 将该 pull request 标记为不可合并，直至四项 required checks 全部成功
- **验证方式**: `gh pr view <pr-number> --json mergeStateStatus,statusCheckRollup,isDraft`

---

## 范围切分

### v1（本次必做）

- 添加与 TypeScript 7 兼容的 Oxlint 与 `pnpm lint`，覆盖当前 TypeScript / React 源码。
- 添加一个 GitHub Actions workflow，分别提供 `lint`、`typecheck`、`test`、`build` job。
- 设置 `main` active ruleset，四项均为 required status checks，并在 PR 上核验状态。
- 在提交前、Actions 运行后和 ruleset 写入后记录可重复验证证据。

### v2（下一轮考虑，不本次）

- 把 Playwright E2E、Supabase pgTAP、性能基线、覆盖率和安全扫描纳入 CI。
- 增加依赖缓存命中率、测试报告上传、CodeQL 或 Dependabot。

### out（永远不做）

- 不将 Supabase service-role、数据库密码、Vercel token 或任何生产密钥写进 workflow。
- 不用“允许失败（continue-on-error）”绕过本次四个质量门。

---

## 非功能性需求

- **性能**: 四个 job 可并行；单个 job 的安装与命令执行不应依赖本地已生成的构建产物。
- **可访问性**: 无用户界面变更，不适用。
- **安全**: job 只读仓库内容，使用锁定依赖，不读取或输出机密；ruleset 仅保护 `main`。
- **兼容性**: 使用仓库声明的 pnpm 10.14.0，并选择当前依赖兼容的 Node LTS；workflow 兼容 GitHub-hosted Ubuntu runner。
- **可观测性**: 每个质量门必须是独立、可读的 GitHub Check 名称，失败日志可由 `gh run view` 获取。

## 依赖与假设

- GitHub 账号对 `HanksChen0110/habit_track` 有 Actions 与 rulesets 写入权限；实际 API 响应为最终依据。
- GitHub-hosted runner 可访问 npm registry 并执行 pnpm 10.14.0。
- `main` 是远端默认分支，当前预检已确认。— 来源：2026-08-02 `gh repo view --json defaultBranchRef`

---

> AC 是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
