# T01-SUMMARY — 建立账号关系表、约束与 RLS

- **状态**：done
- **Change ID**：`local-postgres-backend`
- **任务**：T01
- **提交**：`537a887c9fe1c5247f5cab58c2dab324a15b9969`
- **提交信息**：`feat(local-postgres-backend): T01 add account tables and RLS`

## 完成内容

- 新建 `user_data_state`、`habits`、`completions`，账号所有权使用 `uuid`，Habit 业务 ID 使用 `text`。
- 加入账号复合主键、复合外键、级联删除、非空与正整数等基础约束。
- 三表启用并强制 RLS，只向 `authenticated` 授予 CRUD；每类策略都以 `auth.uid() = user_id` 限制当前账号，`anon` 无业务表权限。
- migration 未添加冗余索引，尾部保留逆序手工回滚 SQL 注释。

## 实现文件

- `@supabase/migrations/202607310001_local_postgres_backend.sql`
- `@supabase/tests/database/001_schema_rls.sql`

## 验证证据

- RED：migration 创建前执行指定 verify，因 `public.user_data_state` 不存在而 exit 1，符合预期。
- Apply：经用户明确批准执行 `pnpm exec supabase db reset --local --no-seed`，exit 0。
- GREEN：`pnpm exec supabase test db --local supabase/tests/database/001_schema_rls.sql`，`Files=1, Tests=90, Result: PASS`。
- 独立审查：首轮要求补齐三表写隔离、所有权转移和 anon CRUD；补测后复审 `APPROVED`。
- 提交前复验：同一 verify 再次 90/90 PASS；`git diff --cached --check` 通过。

## 范围与后续

- 未读取或修改 `.env.local`，未改前端代码，未实现 T02 RPC。
- T02 的 migration 与本地 reset 仍需单独取得用户批准。
- 高风险操作记录见 `@harness-tool-audit.md`。
