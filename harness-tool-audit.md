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
