# Harness Tool Audit

| 时间 | 工具 | 操作 | 是否需人批 | 结果 | 对应 TASK.md 条目 |
|---|---|---|---|---|---|
| 2026-07-31 23:13:36 +08:00 | subagent / apply_patch | 创建 T01 业务 schema migration `202607310001_local_postgres_backend.sql` | 是，已获用户批准 | 成功 | T01 |
| 2026-07-31 23:13:36 +08:00 | `pnpm exec supabase db reset` | 本地 reset（`--local --no-seed`）并应用 T01 migration | 是，已获用户批准 | 成功，exit 0 | T01 |
| 2026-07-31 23:55:28 +08:00 | subagent / apply_patch | 创建 T02 原子替换 RPC migration `202607310002_local_postgres_backend.sql` | 是，已获用户批准 | 成功 | T02 |
| 2026-07-31 23:55:28 +08:00 | `pnpm exec supabase db reset` | 本地 reset（`--local --no-seed`）并顺序应用 T01、T02 migration | 是，已获用户批准 | 成功，exit 0 | T02 |
| 2026-08-01 01:53:27 +08:00 | subagent / apply_patch | 创建 T-FIX-01 所有权默认值 migration `202608010001_account_user_id_defaults.sql` | 是，用户已授权本 change 后续任务全部通行 | 成功 | T-FIX-01 |
| 2026-08-01 01:53:27 +08:00 | `pnpm exec supabase db reset` | RED 环境本地 reset（`--local --no-seed`），仅应用 001/002；003 预期失败 23/27 | 是，用户已授权本 change 后续任务全部通行 | reset 成功，RED 测试按预期 exit 1 | T-FIX-01 |
| 2026-08-01 01:53:27 +08:00 | `pnpm exec supabase db reset` | GREEN 环境本地 reset（`--local --no-seed`），应用 001/002/T-FIX-01 migration | 是，用户已授权本 change 后续任务全部通行 | 成功；001=90/90、002=43/43、003=27/27 | T-FIX-01 |
| 2026-08-01 04:08:34 +08:00 | subagent / apply_patch | 创建 T12 RPC 服务端确认值 migration `202608010002_replace_user_store_result.sql` | 是，用户已授权 fix round 2 migration 与 reset | 成功 | T12 |
| 2026-08-01 04:08:34 +08:00 | `pnpm exec supabase db reset` | 本地 reset（`--local --no-seed`）并应用 T12 migration | 是，用户已授权 fix round 2 migration 与 reset | 成功，exit 0 | T12 |
| 2026-08-01 09:05:49 +08:00 | `pnpm exec supabase db reset` | TEST 阶段从空库重放全部 migration（`--local --no-seed`） | 是，用户已授权本 change 后续任务全部通行 | 成功，4 个 migration 全部应用，exit 0 | TEST |
| 2026-08-01 09:12:11 +08:00 | `docker exec ... psql` | 执行整 change down 脚本并查询 catalog | 是，用户已授权本 change 后续任务全部通行 | 成功，RPC 与 3 张业务表共 4 个对象全部消失 | T-FIX-02 |
| 2026-08-01 09:12:11 +08:00 | `pnpm exec supabase db reset` | down 后再次从空库重放全部 migration（`--local --no-seed`） | 是，用户已授权本 change 后续任务全部通行 | 成功，恢复后 pgTAP 174/174 | T-FIX-02 |
| 2026-08-02 11:11:26 +08:00 | `pnpm exec supabase db push --linked --yes` | 向新云端项目 `xunji-habit-review` 顺序发布 4 个本地 migration | 是，用户已明确授权云端 migration 发布 | 成功；远端历史一致，二次 dry-run 为空，lint 0 | 临时最小 TASK：云端 migration 发布 |
| 2026-08-02 11:11:26 +08:00 | Supabase Auth Admin / Data API | 创建两个隔离测试账号验证 Auth、匿名拒绝、RPC 与跨账号 RLS，随后删除测试账号及级联数据 | 是，用户已授权云端后端验证 | 成功；全部烟雾测试通过，残留测试账号为 0 | 临时最小 TASK：云端运行时验证 |
| 2026-08-02 11:10:00 +08:00 | `Move-Item` | 归档 `.specs/mobile-performance-green/` 到 `.specs/archive/2026-08-02-mobile-performance-green/` | 是，用户已授权完整交付与后续任务全部通行 | 成功，11 个工件完整移动 | INTEGRATION / ARCHIVE |
| 2026-08-02 11:18:49 +08:00 | `git push -u origin codex/local-postgres-backend` | 创建远端交付分支，并以 follow-up fast-forward 同步本审计记录 | 是，用户在本轮明确要求 commit + push | 成功；远端分支已创建并建立 upstream | FINAL DELIVERY |
| 2026-08-02 12:13:25 +08:00 | Chrome / Vercel | 为 Vercel Production 配置 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`（不记录值） | 是，用户批准执行 1-4 | 成功；两个变量均为 Production 作用域并触发重新部署要求 | 用户授权 1-4（生产连通性运维） |
| 2026-08-02 12:13:25 +08:00 | Chrome / Supabase | 配置 Auth Site URL；初次误填无关域名后立即纠正为实际生产域名 `https://xunji-nu.vercel.app` 并刷新确认持久化 | 是，用户批准执行 1-4 | 成功；最终值已核验 | 用户授权 1-4（生产连通性运维） |
| 2026-08-02 12:13:25 +08:00 | `git push origin HEAD:main` | 将已验证提交 `71da466` 快进推送至远端 `main` | 是，用户批准执行 1-4 | 成功；`origin/main` 已指向 `71da466` | 用户授权 1-4（生产连通性运维） |
| 2026-08-02 12:13:25 +08:00 | Vercel Production Deploy | 由 `main@71da466` 触发生产部署并绑定稳定域名 `https://xunji-nu.vercel.app` | 是，用户批准执行 1-4 | 成功；部署状态 Ready，生产页面已加载 Supabase 登录门 | 用户授权 1-4（生产连通性运维） |
| 2026-08-02 12:42:46 +08:00 | Chrome / Supabase Auth | 关闭生产项目 `Confirm email`，使注册行为与已确认“无需邮箱确认、注册后直接进入账号数据空间”契约一致 | 是，用户要求排查并解决生产注册失败，且此前授权生产双边配置 | 成功；保存后刷新页面确认开关保持关闭；未改 schema、未删除数据 | 生产注册失败修复（运维配置） |
| 2026-08-02 12:58:53 +08:00（补录） | Chrome / Supabase Auth/Data API/Postgres | 使用用户已授权的真实账号完成注册、示例数据写入与读取、账号显示和退出 UAT（不记录邮箱或凭据） | 是，用户已授权真实账号数据读取与生产验证 | 成功；账号已确认，3 条习惯前后端一致，退出返回登录页且数据库仍保留 3 条习惯 | 生产账号与数据连通性 UAT |
| 2026-08-02 12:58:53 +08:00 | Chrome / Supabase Auth/Data API/Postgres | 用户本人重新登录后核验账号会话与业务数据恢复（不记录凭据） | 是，用户已授权真实账号数据读取与生产验证 | 成功；同一账号重新进入主界面，恢复“学外语、跑步、阅读”3 条习惯，“退出账号”仍可用 | 生产账号与数据连通性 UAT |
| 2026-08-02 13:18:16 +08:00 | `git push -u origin codex/local-postgres-backend` + 审计跟进推送 | 推送生产账号连通性 UAT、Flow Kit 状态同步及撤回记录提交 `06a2dbe`，并同步本审计行 | 是，用户本轮明确要求再次 commit/push | 成功；远端交付分支快进并包含 UAT 文档与本次 push 审计 | 生产 UAT 文档交付 |
| 2026-08-02 14:16:00 +08:00 | `git push origin codex/local-postgres-backend` + GitHub Pull Request | 推送 CI 四关交付分支并创建 PR #1（`codex/local-postgres-backend` → `main`）触发真实 Actions | 是，用户已授权自动执行后续流程及 CI/ruleset 配置 | 成功；CI run 30735572011 的 lint、typecheck、test、build 均成功 | T04 |
| 2026-08-02 14:18:00 +08:00 | GitHub Rulesets API | 为默认分支 main 创建 active ruleset `main-ci-required-checks`（ID 20223088），required checks 为 lint、typecheck、test、build，strict=true | 是，用户已明确授权 CI ruleset 配置 | 成功；GET 回读精确四个 GitHub Actions context，PR #1 四关成功且 `mergeStateStatus=CLEAN` | T05 |
| 2026-08-02 14:34:00 +08:00 | `git push origin codex/local-postgres-backend` | 推送 CI TEST / REVIEW / UAT / LESSONS 集成工件至 PR #1，并触发最新四关 | 是，用户已授权自动执行后续流程 | 成功；PR #1 head 更新为 `e142fee`，等待最新 CI 结论后合并 | INTEGRATION |
| 2026-08-02 14:36:00 +08:00 | `Move-Item` | 将 `.specs/ci-quality-gates/` 归档为 `.specs/archive/2026-08-02-ci-quality-gates/` | 是，用户明确回复“确认归档” | 成功；13 个 change 工件完整移动，源目录已不存在 | INTEGRATION / ARCHIVE |
