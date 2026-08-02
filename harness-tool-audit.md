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
