# TEST: 建立 GitHub CI 四关与合并保护

- **Change ID**: `ci-quality-gates`
- **关联**: `@.specs/ci-quality-gates/REQUIREMENT.md`、`@.specs/ci-quality-gates/DESIGN.md`、`@flow-kit/reference/test-pyramid.md`
- **项目类型**: 全栈 Web（本 change 只改变开发质量门与一处零视觉 lint 合规修复）
- **执行时间**: 2026-08-02

---

## 0. 本次测试范围声明（5 轮金字塔）

| 轮次 | 状态 | 范围 | 跳过理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ✅ 必跑 | AC-1～AC-5：本地四关、真实 Actions、workflow 安全边界、ruleset、PR 门禁 | — |
| 第 2 轮 · 性能 | ✅ 必跑 | 新增 CI 的并行 job / 总耗时；首个 CI 基线 | 本 change 不改变产品运行时性能，故不跑 Lighthouse / API 压测 |
| 第 3 轮 · 安全 | ⚠️ 部分 | 生产依赖审计、机密模式扫描、workflow 最小权限和人工 SAST | 本机没有 trufflehog/gitleaks/Semgrep，且不安装全局工具；已有 `react-router` 条件性高危通告见 3.1 |
| 第 4 轮 · 兼容 | ⚠️ 部分 | GitHub Ubuntu runner + Node 24 + pnpm 10.14；零视觉 Modal 回归 | 本 change 不新增终端用户流程、浏览器特性或 schema，完整跨浏览器矩阵不重复执行 |
| 第 5 轮 · 可观测 | ⚠️ 部分 | GitHub Checks 的独立 job 名、状态和日志可读性 | 本 change 不引入生产运行时服务、日志、指标、告警或 `/health` |

---

## 第 1 轮 · 功能测试

### 1.1 测试矩阵（AC → 用例）

| AC | 类型 | 用例文件 / UAT | 状态 |
|---|---|---|---|
| AC-1 | integration | `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build` | ✅ 四命令均 exit 0；Vitest 20 文件 / 188 测试 |
| AC-2 | integration | GitHub Actions run [30735679718](https://github.com/HanksChen0110/habit_track/actions/runs/30735679718) | ✅ `lint`、`typecheck`、`test`、`build` 四个精确 job 均成功 |
| AC-3 | static/manual | `.github/workflows/ci.yml` + Actions 运行日志 | ✅ `contents: read`、冻结安装；无 secrets / Vercel / Supabase / `.env` 引用 |
| AC-4 | integration | `gh api repos/HanksChen0110/habit_track/rulesets/20223088` | ✅ active ruleset 仅匹配 main，四个 context 均绑定 GitHub Actions `15368`，strict=true |
| AC-5 | manual | PR [#1](https://github.com/HanksChen0110/habit_track/pull/1) 的 `statusCheckRollup` / `mergeStateStatus` | ✅ 所有 required checks 成功后为 `CLEAN`；ruleset 是未完成/失败时阻止合并的强制配置 |

### 1.2 UAT 脚本

#### UAT-1 · PR 质量门实际放行

- **前置**: PR #1 指向 `main`；ruleset `20223088` 已 active。
- **步骤**:
  1. 读取 PR 最新 head `7088e6759cdc383f603bdb748f28e9da0bf7e89d` 的 Actions run 30735679718。
  2. 确认四个 check 的名称和结论。
  3. GET ruleset 并读取 PR `mergeStateStatus`。
- **期望**: 四项 required check 都是 `SUCCESS` 时显示 `CLEAN`；ruleset 中任一 required check 未完成/失败则按 GitHub 规则阻止合并。
- **实际**: 通过。四个 context 均为 `SUCCESS`，`mergeStateStatus=CLEAN`；未故意推送失败提交污染交付分支。
- **执行人 / 时间**: Codex / 2026-08-02 14:19 +08:00。

### 1.3 覆盖率

```text
$ pnpm test:run --coverage
Test Files  20 passed (20)
Tests  188 passed (188)
Statements 90.78% / Branches 79.46% / Functions 92.85% / Lines 93.64%
src/components/Modal.tsx: Lines 100%
```

- 当前：总行覆盖 93.64%，高于默认 80%；本次唯一源码触点 `Modal.tsx` 行覆盖 100%。
- 适用性：CI workflow 本身由真实 GitHub Actions 运行覆盖，不能由 Vitest 行覆盖替代。
- 不达项：总分支覆盖 79.46% 未达默认 80%，但本次没有新增产品分支；既有分支缺口不以本次 CI change 伪装修复，记录为既有测试改进项。

### 1.4 边界 / 错误路径用例

- 空 / 未完成：Ruleset 的 required status checks 在 PR 检查尚未完成时为阻塞态；T05 记录了创建后、checks 尚未出现时的 `UNKNOWN` 证据。
- 成功边界：四项成功后 PR 为 `CLEAN`。
- 无 secrets：workflow 内容扫描没有 `secrets:`、`VITE_SUPABASE`、`SUPABASE_`、`VERCEL_` 或 `continue-on-error`。
- UI 回归：`tests/ui/App.test.tsx`、`tests/ui/ManageRecovery.test.tsx` 共 28/28 通过，覆盖 ESC、焦点陷阱与关闭后的焦点恢复。

### 1.5 测试质量自检（内置 T1～T6）

`brooks-lint` 未安装；按内置清单审查本 change 直接依赖的测试与验证证据。

| 编号 | 测试衰退风险 | 命中文件数 | 严重度分布 |
|---|---|---:|---|
| T1 | Test Obscurity | 0 | 🔴 0 / 🟡 0 / 🟢 0 |
| T2 | Test Brittleness | 0 | 🔴 0 / 🟡 0 / 🟢 0 |
| T3 | Test Duplication | 0 | 🔴 0 / 🟡 0 / 🟢 0 |
| T4 | Mock Abuse | 0 | 🔴 0 / 🟡 0 / 🟢 0 |
| T5 | Coverage Illusion | 0 | 🔴 0 / 🟡 0 / 🟢 0 |
| T6 | Architecture Mismatch | 0 | 🔴 0 / 🟡 0 / 🟢 0 |

- `Modal` 的既有测试验证用户可观察的焦点行为，而不是 effect 内部实现；T03 没有引入或弱化测试。
- CI AC 采用真实 GitHub Actions / ruleset API 证据，避免用 YAML 文本或 mock 代替远端行为。

### 1.6 测试质量记事（backlog）

| 文件 | 维度 | 严重度 | 计划修复时间 |
|---|---|---|---|
| 既有测试集合 | 总分支覆盖 79.46%，低于默认 80% | 🟡 | 后续测试覆盖率专项 change；不属于本次 CI 四关范围 |

---

## 第 2 轮 · 性能测试

### 2.1 性能预算（本次 CI 基线）

```yaml
ci:
  each_parallel_job: <= 5m
  pull_request_total: <= 8m
  future_regression: <= 20% over first baseline
```

### 2.2 实测结果

来源：GitHub Actions run 30735679718（PR 最新 head）。这是首次基线，故“上一版”和“退步”不适用。

| 指标 | 预算 | 实测 | 上版基线 | 判定 |
|---|---:|---:|---:|---|
| `lint` job | ≤ 5 分钟 | 18 秒 | 首次基线 | ✅ |
| `typecheck` job | ≤ 5 分钟 | 20 秒 | 首次基线 | ✅ |
| `test` job | ≤ 5 分钟 | 33 秒 | 首次基线 | ✅ |
| `build` job | ≤ 5 分钟 | 22 秒 | 首次基线 | ✅ |
| PR CI 总时长 | ≤ 8 分钟 | 38 秒 | 首次基线 | ✅ |

结论：四个 job 并行执行且不依赖本机构建产物；首次总耗时 38 秒。未来同类 CI 变更以该值的 +20%（≤ 46 秒）作为回归观察线，5/8 分钟为硬上限。

---

## 第 3 轮 · 安全测试

### 3.1 依赖漏洞

```text
$ pnpm audit --prod --json
high: 1, critical: 0
react-router@7.18.1: GHSA-qwww-vcr4-c8h2
```

- **显式接受（本 change）**：该 advisory 仅影响使用 unstable React Server Components API 的应用；源码扫描没有 RSC / `react-server` / `unstable_*RSC` 调用。本 change 未新增或调用 React Router API。
- **处置边界**：修复建议为升级至 `react-router` 8.3.0 以上，属于跨大版本依赖迁移，超出本次“最小 CI 基线”范围；应以独立安全 change 升级并运行完整应用回归。不得把该已知风险描述为“零漏洞”。

### 3.2 机密扫描

```text
工具可用性：trufflehog / gitleaks 均未安装；按项目约定不安装全局依赖。
模式扫描：未发现真实密钥、私钥块、GitHub token 或 service-role 值。
命中的 SUPABASE_SERVICE_ROLE 仅为归档文档规则文本和测试 fixture 名，不含凭据。
```

### 3.3 SAST

- 工具：Oxlint（项目静态检查）+ 本次 workflow / diff 人工审查；`semgrep` 未安装，不扩装。
- High：0 个由本次新增代码或 workflow 引入的发现。
- Medium：0；注意 3.1 的既有条件性高危依赖不是 SAST 发现，已单独记录。

### 3.4 OWASP Top 10（本 change 范围）

| 项 | 状态 | 备注 |
|---|---|---|
| A01 越权 | ❌ 不适用 | CI 不新增用户/角色入口；ruleset 无 bypass actor |
| A02 加密失败 | ❌ 不适用 | 不处理、存储或输出数据 / 凭据 |
| A03 注入 | ❌ 不适用 | workflow 命令为固定 pnpm scripts，无 PR 输入插值 |
| A04 不安全设计 | ✅ | 明确只读权限、锁文件和 required checks 边界 |
| A05 配置错误 | ✅ | `contents: read`、无 secrets、无 `continue-on-error` |
| A06 漏洞组件 | 🟡 | 见 3.1：现有条件性 high，需独立升级 change |
| A07 鉴权 | ❌ 不适用 | 不改产品 Auth；GitHub ruleset 使用既有仓库权限 |
| A08 数据完整性 | ✅ | `--frozen-lockfile`，required checks 绑定 GitHub Actions integration |
| A09 日志监控 | ⚠️ 部分 | 见第 5 轮 Actions job 日志 |
| A10 SSRF | ❌ 不适用 | 不接受或请求任意 URL |

---

## 第 4 轮 · 兼容性测试

### 4.1 CI 运行时兼容

| 环境 | 验证 | 状态 |
|---|---|---|
| GitHub-hosted Ubuntu | PR run 30735679718 成功 | ✅ |
| Node 24 | workflow 指定 `node-version: 24`，四 job 成功 | ✅ |
| pnpm 10.14.0 | workflow 指定版本且 `--frozen-lockfile` 成功 | ✅ |
| TypeScript 7 / React 19 | Oxlint、typecheck、测试与构建均成功 | ✅ |

### 4.2 浏览器 / 视口

本 change 没有可见 UI、浏览器 API、CSS 或响应式布局变更；T03 的 Modal cleanup 只使焦点恢复引用稳定，已由 28 项 UI 回归覆盖。Chrome/Firefox/Safari/Edge 真机矩阵属于既有产品回归，不把未改变的产品面重复宣称为本 change 的测试成果。

### 4.3 数据迁移 / 跨版本

- Schema、migration、RPC、数据和 API 均未变更：N/A。
- `pnpm-lock.yaml` 已由 `--frozen-lockfile` 在 GitHub Ubuntu runner 实测重放：✅。

---

## 第 5 轮 · 可观测性验证

| 项目 | 结果 |
|---|---|
| 独立且可读的质量信号 | ✅ GitHub Checks 精确显示 `lint`、`typecheck`、`test`、`build` |
| 失败定位 | ✅ 每个 check 独立 job，`gh run view <id> --json jobs` 可读取命令与结论 |
| PII / token 输出 | ✅ workflow 不引用 secrets、生产变量或用户数据 |
| 生产业务日志 / trace / metrics | ❌ 不适用；本 change 不改生产服务 |
| 告警、runbook、`/health` | ❌ 不适用；本 change 不引入长期运行服务 |

---

## 新增测试登记

| 用例文件 / 证据 | 类型 | 覆盖 AC | 所属轮次 |
|---|---|---|---|
| `pnpm lint && pnpm typecheck && pnpm test:run && pnpm build` | integration | AC-1 | 1 |
| Actions run 30735679718 | integration | AC-2、AC-3 | 1、2、5 |
| Ruleset 20223088 + PR #1 | manual/API | AC-4、AC-5 | 1 |
| `tests/ui/App.test.tsx`、`tests/ui/ManageRecovery.test.tsx` | unit | T03 回归 | 1、4 |

## 回归保护

- 原有产品逻辑：`pnpm test:run --coverage` 20 文件 / 188 测试通过。
- 本次触及 Modal 的键盘与焦点恢复：相关 UI 测试 28/28 通过，`Modal.tsx` 行覆盖 100%。
- 数据库与生产配置：未触及。

## TEST 结论

功能、CI 性能、workflow 安全边界、运行时兼容和 Actions 可观测性均达到本 change 的可验证范围。唯一开放风险为既有 `react-router` 条件性 high advisory，已显式记录并隔离为后续独立安全升级，不因本次 CI workflow 新增而扩大。
