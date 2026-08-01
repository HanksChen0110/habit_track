# STATE — 跨会话项目状态

> 仓库根项目状态。后续会话先读本文件，再按当前阶段加载 `.specs/` 工件。
> 首次创建：2026-07-31；A-architect 已重审本地后端方向，REQUIREMENT、DESIGN 与 UI-DESIGN 已确认；DEV T01、T02、T04 已完成并提交。

---

## 当前位置

- **活跃 Flow Kit Change**：无
- **当前阶段**：CHANGE（等待下一项）
- **当前 Task**：无；`local-postgres-backend` 已于 2026-08-01 归档
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
| 性能余量 | 非阻塞 | 10 Habit + 3650 Completion 的最终集成轮为 19/20 ≤1s、P95 931.7ms，已达标但余量有限 | 后续容量 change | `@.specs/archive/2026-08-01-local-postgres-backend/UAT.md` |
| 依赖告警 | 已知接受 | React Router 7.18.1 有 1 个仅影响 unstable RSC API 的 high；当前 RSC 调用面为 0 | 引入 RSC 前必须处理 | `@.specs/archive/2026-08-01-local-postgres-backend/TEST.md#31-依赖漏洞` |

## 工作区观察（初始化前已存在）

- 初始化时分支为 `main`、HEAD 为 `2b369e0`；当前保留在 `codex/local-postgres-backend`，实现 HEAD 为 `8c4906b`，未 push、未合并 main。— 来源：2026-08-01 `git branch` / `git log`
- 已有未提交修改：`AGENTS.md`、`CLAUDE.md`、`README.md`、`openspec/changes/build-habit-review-mvp/tasks.md`。
- 已有未跟踪目录：`flow-kit/`、`review_test/`。
- 上述内容在本次上下文初始化前已存在，本次没有覆盖、清理、提交或归属它们。— 来源：2026-07-31 初始化前后 `git status --short`
- 本地后端运行依赖、Supabase 配置、migration、rollback、客户端、Auth/Repository/AppStore/UI 与测试均已纳入功能分支提交；`.env.local` 未读取、未修改、未提交。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/T-FIX-03-SUMMARY.md`、2026-08-01 `git log`

## 决策日志（最近 10 条，倒序）

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
accepted_target_stack: Local Supabase Auth + Data API + Postgres + RLS
pending_workspace_artifacts: none for local-postgres-backend; unrelated pre-existing docs/OpenSpec edits remain unstaged
active_change_id:
active_change_stage: change

# 架构演进
last_architect_at: 2026-07-31
last_evolve_at:
last_evolve_promoted: []

# 健康巡检
last_health_at:
last_health_score:
```

## 最近验证

| 日期 | 命令 | 结果 | 说明 |
|---|---|---|---|
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
- [x] 当前无活跃 Flow Kit change，`local-postgres-backend` 已归档
- [ ] 两个已完成 OpenSpec change 是否应归档，待用户另行决定
- [x] 未发现仍处于自动重试中的失败
- [x] `.specs/LESSONS.md` 已建立；T01 进入 DEV 前已按关键词检查
