# T07-SUMMARY — 实现记录级提交与 RPC 完整替换

- **状态**：done（客户端实现 + T-FIX-01 真实 schema 证据均已通过）
- **提交**：`c6a42bdd547f1c0033d2714de69ca36589c8d48c`
- **提交信息**：`feat(local-postgres-backend): T07 add record-level writes and replace`

## 已完成客户端部分

- `commit(previous,candidate)` 只允许一个逻辑 Habit 或 Completion 变化；无变化、多变化和不支持的 Habit 删除均在打开 client 前拒绝。
- Habit/Completion upsert 和 Completion delete 使用真实关系列名，payload/filter 不含 `user_id`。
- `replace(candidate)` 先校验，只调用 `replace_user_store({candidate})`，成功后完整 `read()` 回读。
- 任何校验、Data API、RPC 或回读失败均 reject，不原地变异 previous/candidate。

## 验证

- `pnpm exec vitest run tests/data/supabase-repository-write.test.ts`：16/16 PASS。
- T06 读取回归：8/8 PASS。
- T06/T07 授权文件 strict TypeScript：PASS。
- 独立审查：客户端 Spec 实现符合 brief，Task quality Approved，无客户端修复要求。

## 已关闭的承重阻塞

- `habits.user_id` 与 `completions.user_id` 为 NOT NULL 且无 default；RLS 只检查所有权，不注入 `auth.uid()`。
- 因此当前真实 PostgREST 的所有 upsert 都会因 payload 缺 `user_id` 失败；客户端不能传 Session user id 绕过信任边界。
- T-FIX-01 已以提交 `20bedf47a213737d5091f034f8b0874245448913` 为两列增加 `DEFAULT auth.uid()`，不改 NOT NULL、复合键、外键或 RLS。
- 003 pgTAP 27/27 PASS，且 001/002/003 串行回归 160/160 PASS；安全复审 Spec Compliance ✅、Task quality Approved、无 finding。T07 真实 schema 阻塞已关闭。

## 边界

- T07 提交仅修改 `@src/data/supabaseRepository.ts` 与 `@tests/data/supabase-repository-write.test.ts`，越界 0。
- 未读取/修改 `.env.local`，未修改 schema/migration、AppStore、页面或规格。
