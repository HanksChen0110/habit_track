# T-FIX-01-SUMMARY — 为 Data API 写入注入当前账号所有权

- **状态**：done
- **来源 finding**：T07 审查 Important（真实 PostgREST upsert 缺少 `user_id` default）
- **提交**：`20bedf47a213737d5091f034f8b0874245448913`
- **提交信息**：`fix(local-postgres-backend): T-FIX-01 add account ownership defaults`

## Schema Diff

- `public.habits.user_id`：`uuid NOT NULL` → `uuid NOT NULL DEFAULT auth.uid()`。
- `public.completions.user_id`：`uuid NOT NULL` → `uuid NOT NULL DEFAULT auth.uid()`。
- NOT NULL、主键、外键、检查约束、强制 RLS、policy 与授权保持不变。
- migration 含手动 rollback：逆序 `DROP DEFAULT`。

## 文件

- `@supabase/migrations/202608010001_account_user_id_defaults.sql`
- `@supabase/tests/database/003_user_id_defaults.sql`

## 验证证据

- RED：旧 schema 下 003 为 23/27 失败；两列 default 为 NULL，无 `user_id` insert/upsert 被 RLS 以 `42501` 拒绝。
- GREEN：本地 reset 应用新 migration 后，003 为 27/27 PASS。
- 串行回归：001=90/90、002=43/43、003=27/27，合计 160/160 PASS。
- catalog 核验：default 为 `auth.uid()`，两列仍 NOT NULL，复合主外键、强制 RLS 与 anon/authenticated 权限保持。
- 高风险操作已记入 `@harness-tool-audit.md`。

## 安全覆盖

- A 不传 `user_id` 的 Habit/Completion insert 成功且归属 A。
- 复合冲突键 upsert 更新原行，A/B 相同逻辑键仍隔离。
- Completion 只按 `habit_id + date` 删除时，RLS 只删当前账号行。
- 显式伪造其他账号 `user_id` 仍被 `42501` 拒绝，default 不覆盖显式所有权值。

## 审查与边界

- 独立审查：Spec Compliance ✅，Task quality Approved，Critical / Important / Minor 均无。
- TASK write_files 2 项，提交 2 项，越界 0。
- 未修改既有 migration、客户端、`.env.local`、REQUIREMENT 或 DESIGN。
