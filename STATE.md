# STATE — 跨会话项目状态

> 仓库根项目状态。后续会话先读本文件，再按当前阶段加载 `.specs/` 工件。
> 首次创建：2026-07-31；A-architect 已重审本地后端方向，REQUIREMENT、DESIGN 与 UI-DESIGN 已确认；DEV T01、T02、T04 已完成并提交。

---

## 当前位置

- **活跃 Flow Kit Change**：`ci-quality-gates`
- **当前阶段**：INTEGRATION（验证完成，待推送、GitHub 最终四关与合并）
- **当前 Task**：本地 UAT 已通过；待更新 PR、核验最终 Actions 并合并到 main
- **中断任务**：无
- **现有 OpenSpec 状态**：
  - `build-habit-review-mvp`：文件仍位于 `openspec/changes/`，`tasks.md` 已全部勾选；是当前 MVP 实施来源，不映射为 Flow Kit 活跃 change。— 来源：`@AGENTS.md:12-18`、`@openspec/changes/build-habit-review-mvp/tasks.md:1-48`
  - `add-insights-dashboard`：文件仍位于 `openspec/changes/`，`tasks.md` 已全部勾选；当前实现已含洞察页。— 来源：`@openspec/changes/add-insights-dashboard/tasks.md:1-15`、`@src/App.tsx:24-28`
- **会话开始建议**：
  - 新需求：先跑 Artifact Preflight Gate，再从 `0-change` 建立 `.specs/<change-id>/CHANGE.md`。
  - 继续既有 Flow Kit task：只有 `STATE.md` 出现非空“中断任务”时，才按 R1.5 加载对应 PROGRESS。
  - UI change：进入 DEV 前必须先有正式 `UI-DESIGN.md`。— 来源：`@AGENTS.md:81-92`

## 阻塞与待决策

| 项 | 类型 | 详情 | 待谁 | 来源 |
|---|---|---|---|---|
| OpenSpec 是否归档 | 流程 | 两个 OpenSpec change 已完成任务但仍在 `openspec/changes/`；本次不移动、不归档 | 用户 | 2026-07-31 文件扫描 |
| 性能基线可移植性 | 非阻塞 | 当前机器 desktop/mobile P95 为 440.0/333.9ms；尚未建立跨机器或 CI 历史趋势 | 后续容量 change | `@.specs/archive/2026-08-02-mobile-performance-green/UAT.md` |
| 依赖告警 | 已知接受 | React Router 7.18.1 有 1 个仅影响 unstable RSC API 的 high；当前 RSC 调用面为 0 | 引入 RSC 前必须处理 | `@.specs/archive/2026-08-01-local-postgres-backend/TEST.md#31-依赖漏洞` |

## 工作区与交付边界

- 交付分支为 `codex/local-postgres-backend`；包含本地 Postgres 后端、`mobile-performance-green` 与各自归档工件，远端同步状态以 Git 为准。
- `flow-kit/` 是项目采用的方法论与模板源，`review_test/` 是受自身 `AGENTS.md` 约束的静态视觉参考；两者在最终交付审计中纳入版本控制。
- `.specs/ARCHITECTURE.md.bak-*` 仅作为本地可恢复备份保留并由 `.gitignore` 排除，不删除、不提交。
- `openspec/changes/build-habit-review-mvp/tasks.md` 只有工作树行尾状态、无语义 diff，不纳入提交。
- 本地后端运行依赖、Supabase 配置、migration、rollback、客户端、Auth/Repository/AppStore/UI 与测试均已纳入功能分支；`.env.local` 未读取、未修改、未提交。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/T-FIX-03-SUMMARY.md`、Git 历史

## 决策日志（最近 10 条，倒序）

- `[2026-08-02]` 用户要求建立 GitHub Actions 四关（lint、typecheck、test、build），并通过 main ruleset 将四个同名检查设为 required status checks；不附加人工审批等额外限制。— 来源：用户指令、2026-08-02 GitHub / 仓库预检、`@.specs/ci-quality-gates/CHANGE.md`
- `[2026-08-02]` 生产真实账号已注册并确认；示例初始化写入 3 条习惯，账号邮箱和“退出账号”可见，实际退出成功；用户重新登录后恢复同一账号的“学外语、跑步、阅读”3 条习惯，Vercel→Supabase Auth/Data API/Postgres 闭环 UAT 通过。`onboarding-account-exit` 源于过渡页误判，已撤回且不进入实现。— 来源：2026-08-02 用户截图、Chrome / Supabase 实测、`@harness-tool-audit.md`
- `[2026-08-02]` Vercel Production 已发布 `main@71da466`，稳定域名为 `https://xunji-nu.vercel.app`；Production 环境变量使用 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`，Supabase Auth Site URL 已同步为该域名。— 来源：2026-08-02 Vercel / Supabase / Chrome 实测、`@harness-tool-audit.md`
- `[2026-08-02]` `mobile-performance-green` 完成 INTEGRATION 并归档；修复 Modal 层级与响应式验证，功能 E2E 22/22、性能 2/2，desktop/mobile 均 20/20 完整且低于 1 秒。— 来源：`@.specs/archive/2026-08-02-mobile-performance-green/UAT.md`
- `[2026-08-02]` 新建并 link Supabase 项目 `xunji-habit-review`（ref `hbxeltjioybgmxqjzeah`，Singapore）；4 个 migration 已通过 CLI push，远端历史一致、二次 dry-run 无待执行项。— 来源：2026-08-02 `supabase projects list`、`migration list --linked`、`db push --linked --dry-run`
- `[2026-08-02]` 云端 Auth、匿名访问拒绝、`replace_user_store` RPC 与双账号 RLS 读写隔离均通过运行时烟雾测试；隔离测试用户及其级联业务数据已清理。— 来源：2026-08-02 Supabase Auth/Data API 实测
- `[2026-08-02]` 云端数据库通过 IPv4 Supavisor session pooler 执行完整 pgTAP：4 files、174/174、Result PASS。— 来源：2026-08-02 用户终端 `supabase test db --db-url <pooler-url>` 输出
- `[2026-08-02]` 生产部署边界确认为 Vercel 静态前端 + Supabase 云端 Auth/Data API/Postgres；本地 stack 继续承担开发、migration 重放和 pgTAP。云端 schema 只由 `supabase/migrations/` 经 CLI link / dry-run / push 发布，不使用 `db reset --linked`。— 来源：`@.specs/ARCHITECTURE.md#adr-009--vercel-前端--supabase-云端生产环境`
- `[2026-08-01]` `local-postgres-backend` 完成 INTEGRATION 并归档；真实 Chrome↔Edge 同账号双向读取 PASS，Vitest 188、pgTAP 174、Playwright 12、Semgrep 110 rules 全绿。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/UAT.md`
- `[2026-08-01]` REVIEW 首轮发现 reduced-motion Toast 生命周期缺陷；T-FIX-04 以 `8c4906b` 修复并独立重审 APPROVED。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/REVIEW.md`
- `[2026-08-01]` TEST 五轮完成；补齐可执行 up→down→up 回滚和可复现 coverage 工具链，提名 LESSONS L-001～L-003。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/TEST.md`、`@.specs/LESSONS.md`
- `[2026-08-01]` T02 已以原子提交 `c9d1065` 完成：当前账号原子替换 RPC、43 项 pgTAP 与 90 项 T01 回归通过；安全复审 APPROVED。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/T02-SUMMARY.md`
- `[2026-07-31]` T04 已以原子提交 `8920c22` 完成；用户同时明确批准 T02 migration 创建与本地 reset，DEV 转入 T02。— 来源：用户指令、`@.specs/archive/2026-08-01-local-postgres-backend/T04-SUMMARY.md`
- `[2026-07-31]` DEV 继续执行时发现 T03 边界冲突，未写代码并标记 blocked；改为执行同属 Wave 1 且无依赖的 T04。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/TASK.md`、`@src/app/AppStore.tsx`
- `[2026-07-31]` T01 已以原子提交 `537a887` 完成：新增三张账号关系表、复合约束、RLS 与 90 项 pgTAP；独立复审 APPROVED。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/T01-SUMMARY.md`
- `[2026-07-31]` 用户清窗后重新进入 DEV 执行 T01，并沿用本轮对 T01 migration 创建与本地 reset 的明确批准；T02 与 `.env.local` 不在授权范围。— 来源：用户指令、`@.specs/archive/2026-08-01-local-postgres-backend/TASK.md#执行前门禁`
- `[2026-07-31]` 用户确认 Habit 业务 ID 改为 `text`：`habits.id`、`completions.habit_id` 保持 Store v1 非空字符串契约；账号 `user_id` 继续为 `uuid`，复合键、外键与 RLS 不变。T01 设计阻塞解除。— 来源：用户确认、`@.specs/archive/2026-08-01-local-postgres-backend/DESIGN.md#表与约束`、`@src/domain/store.ts:162-180`、`@src/data/demo.ts:14-36`
- `[2026-07-31]` DEV T01 预检发现 DESIGN 的 Habit `uuid` 与 Store v1 非空字符串 ID 契约冲突；未写 migration，T01 标记 blocked。建议关系表业务 ID 改为 `text`，账号 `user_id` 继续使用 `uuid`。— 来源：`@src/domain/store.ts:162-180`、`@src/data/demo.ts:14-36`、`@.specs/archive/2026-08-01-local-postgres-backend/DESIGN.md#表与约束`
- `[2026-07-31]` Planner 生成 `local-postgres-backend` 正式 TASK：17 个原子任务、10 个波次；数据库、客户端和编解码可先并行，真实 Chrome/Edge UAT 不用 Chromium 双上下文冒充。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/TASK.md`
- `[2026-07-31]` 用户指示回到 Architect；已将 `src/pages/TodayPage.tsx` 补入 DESIGN 触碰范围，明确其异步打卡与最近 7 天纠正必须等待服务端确认，原 TASK 修改边界阻塞解除。— 来源：用户指令、`@.specs/archive/2026-08-01-local-postgres-backend/DESIGN.md#051-本次-change-触碰的既有模块`、`@src/pages/TodayPage.tsx:37-40`、`@src/pages/TodayPage.tsx:123`
- `[2026-07-31]` 用户确认 UI-DESIGN v0：登录默认、文字切换注册、无确认密码 / 找回密码、真实加载文字、无退出确认、后端失败持续显示；完整 UI-DESIGN 草案据此生成。— 来源：用户确认、`@.specs/archive/2026-08-01-local-postgres-backend/UI-DESIGN.md`

## 已归档 Flow Kit Changes（最近 5 个，倒序）

- `2026-08-01-local-postgres-backend`：本机 Supabase Auth + Postgres/RLS，同账号 Chrome↔Edge 共享账号数据；UAT PASS。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/UAT.md`

## 横向命令状态

```yaml
# 老项目入场扫描 / AI 上下文文档
ai_context_doc: .specs/CONTEXT.md
context_file: .specs/CONTEXT.md
last_intel_scan: 2026-07-31
detected_stack: TypeScript + React 19 + Vite PWA + Supabase Auth/Data API + Postgres 17/RLS + Vitest + Playwright
accepted_target_stack: Local Supabase for development and tests + Vercel frontend + Supabase Cloud Auth/Data API/Postgres/RLS for production
pending_workspace_artifacts: none for local-postgres-backend; unrelated pre-existing docs/OpenSpec edits remain unstaged
active_change_id: ci-quality-gates
active_change_stage: integration-in-progress

# 架构演进
last_architect_at: 2026-08-02
last_evolve_at:
last_evolve_promoted: []

# 健康巡检
last_health_at:
last_health_score:
```

## 最近验证

| 日期 | 命令 | 结果 | 说明 |
|---|---|---|---|
| 2026-08-02 | Vercel Production + Chrome→Supabase Auth/Data API/Postgres | 通过 | `main@71da466` 部署 Ready；真实账号注册成功；3 条习惯写入和读取一致；账号显示、退出和重新登录通过，重新登录后恢复同一账号的 3 条习惯 |
| 2026-08-02 | INTEGRATION 全量门禁 | 通过 | typecheck；Vitest 188；pgTAP 174；build；E2E 功能 22 + 性能 2；desktop P95 440.0ms、mobile P95 333.9ms |
| 2026-08-02 | `supabase db push --linked`、`migration list --linked`、二次 `db push --linked --dry-run`、`db lint --linked`、`gen types --project-id` | 通过 | 新云端项目应用 4 个 migration；远端历史一致、无待执行、lint 0；三表与 `replace_user_store` 类型契约存在 |
| 2026-08-02 | 云端 Auth/Data API 隔离烟雾测试 | 通过 | 两个临时已确认账号可登录；匿名表访问被拒；`replace_user_store` 返回预期 Store；所有者可读、另一账号不可读写；测试账号与级联数据清理完成 |
| 2026-08-02 | `supabase test db --db-url <pooler-url>` | 通过 | 云端 4 files、174/174，Result PASS；密码仅临时注入当前终端 |
| 2026-08-02 | TEST 五轮门禁 | 通过 | typecheck；Vitest 188；coverage lines 93.63%；pgTAP 174；build；E2E 24；Semgrep 110 rules 0 finding |
| 2026-08-02 | `pnpm test:e2e` | 通过 | 功能 22/22；性能 desktop / mobile 2/2，均 20/20 完整且低于 1 秒 |
| 2026-08-02 | `supabase migration list --local`、`supabase db push --local --dry-run`、`supabase db lint --local`、`supabase test db --local` | 通过 | 本地 4 个 migration 全部应用、无待推送、lint 0、pgTAP 174/174；云端尚未登录/link |
| 2026-08-01 | `pnpm test:run` | 通过 | 20 files，188/188 |
| 2026-08-01 | `pnpm typecheck`、`pnpm build` | 通过 | JS gzip 150.28KiB；仅 Vite chunk warning |
| 2026-08-01 | `pnpm exec supabase test db --local` | 通过 | 4 files，174/174 |
| 2026-08-01 | Playwright desktop | 通过 | app/backend/performance 12/12；P95 931.7ms，19/20 ≤1s |
| 2026-08-01 | Semgrep + secret scan | 通过 | 110 rules，0 findings；高权限凭据 0 |
| 2026-08-01 | 真实 Chrome↔Edge UAT | 通过 | Chrome 1/3 → Edge；Edge 2/3 → Chrome |
| 2026-07-31 | `pnpm exec vitest run tests/data/supabase-client.test.ts`、`pnpm typecheck` | 通过 | T04 5/5；提交 `8920c22` |
| 2026-07-31 | `pnpm exec supabase test db --local supabase/tests/database/001_schema_rls.sql` | 通过 | T01 pgTAP 90/90；提交 `537a887` |
| 2026-07-31 | `pnpm typecheck` | 通过 | 当前工作区类型检查 |
| 2026-07-31 | `pnpm test:run` | 通过 | Vitest 9 个测试文件，51/51 |
| 2026-07-31 | `openspec validate build-habit-review-mvp --type change --strict` | 通过 | MVP OpenSpec strict |
| 2026-07-31 | `openspec validate add-insights-dashboard --type change --strict` | 通过 | 洞察 OpenSpec strict |

> 上述结果均在最终实现 HEAD `8c4906b` 后的 INTEGRATION 轮重新取得；归档文档的最终提交在其后只包含 Flow Kit 状态资产。

## 健康检查

- [x] `.specs/` 目录存在
- [x] `.specs/CONTEXT.md` 与 `.specs/ARCHITECTURE.md` 已建立
- [x] `local-postgres-backend` 与 `mobile-performance-green` 均已归档
- [ ] 两个已完成 OpenSpec change 是否应归档，待用户另行决定
- [x] 未发现仍处于自动重试中的失败
- [x] `.specs/LESSONS.md` 已建立；T01 进入 DEV 前已按关键词检查
