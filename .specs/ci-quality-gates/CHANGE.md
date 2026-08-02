# CHANGE: 建立 GitHub CI 四关与合并保护

- **Change ID**: `ci-quality-gates`
- **创建日期**: 2026-08-02
- **路径建议**: 完整（REQUIREMENT → DESIGN → TASK → DEV → TEST → REVIEW → INTEGRATION）
- **状态**: active

---

## Why（为什么做）

仓库当前没有 GitHub Actions workflow、没有可执行的 `lint` 脚本，`main` 也没有 ruleset 或分支保护。现有 typecheck、单元测试和生产构建只能依赖本地人工执行；PR 即使这些检查失败，也没有仓库级机制阻止合并。— 来源：2026-08-02 `package.json`、`.github/workflows/` 路径扫描、GitHub Rulesets API 与 Branch Protection API 只读预检

## What（做什么）

为仓库建立可在 GitHub Actions 独立运行的 `lint`、`typecheck`、`test`、`build` 四个质量检查，并为 `main` 配置 active ruleset，将四个同名检查设为 required status checks。引入与当前 TypeScript 7、React 和 Vite 栈匹配的最小 Oxlint 基线；Actions 在指向 `main` 的 pull request 及推送到 `main` 时执行。

## 影响面

- [x] 影响 `REQUIREMENT.md`
- [x] 影响 `DESIGN.md` / 引入新 ADR（需要增量 DESIGN，不新增项目级 ADR）
- [x] 影响现有 AC（新增 CI 执行、失败阻断与成功放行 AC；不修改产品功能 AC）
- [ ] 影响数据模型 / 迁移
- [ ] 影响外部 API 兼容性
- [ ] 仅修复 bug，无范围变化

## 范围排除（这次不做）

- 不把 Playwright E2E、Supabase pgTAP、性能基线、覆盖率门槛或安全扫描加入本次四关。
- 不新增必须人工审批、签名提交、线性历史、自动合并、CODEOWNERS 或其他分支限制。
- 不修改 Vercel、Supabase、`.env`、密钥、数据库 schema、migration 或生产应用代码。
- 不创建新的部署流程，也不改变现有 Vercel 从 `main` 部署的行为。

## 验收线（粗粒度，不是 AC）

- 指向 `main` 的 PR 自动出现 `lint`、`typecheck`、`test`、`build` 四个独立 GitHub Actions 检查。
- 任一 required check 失败或未完成时，GitHub 不允许合并；四项通过后不再因这四关阻止合并。
- 四关可在干净检出的仓库中使用锁定依赖重复执行，且不依赖项目密钥或生产环境变量。

## 风险与未知

- GitHub required status check 的 context 必须与 Actions check 名称精确一致；工作流推送并至少运行一次后再绑定，可降低名称漂移风险。
- 当前项目没有 lint 基线；首次引入 Oxlint 可能暴露既有问题，必须修复规则真正发现的问题或收紧本次规则范围，不能通过禁用核心检查伪造绿色。
- GitHub ruleset 写入需要仓库管理员权限；当前 CLI 账号能否创建 active ruleset，以实际 API 响应为准。

---

> 本次不命中架构级变更条件，也不涉及前端 UI，因此跳过 A-architect 与 UI-DESIGN。后续 AC 与技术细节进入 `REQUIREMENT.md` / `DESIGN.md`。
