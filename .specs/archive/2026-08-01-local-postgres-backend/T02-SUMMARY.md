# T02-SUMMARY — 实现当前账号 Store 原子替换 RPC

- **状态**：done
- **Change ID**：`local-postgres-backend`
- **任务**：T02
- **提交**：`c9d10655695e33e8a12d8f8f6c2c0d684953d0cf`
- **提交信息**：`feat(local-postgres-backend): T02 add atomic store replacement`

## 完成内容

- 新增 `public.replace_user_store(candidate jsonb) returns void`，只从 `auth.uid()` 获取当前账号，不接收账号参数。
- 函数使用 `SECURITY INVOKER`、空 `search_path` 和完整 schema 名；只向 `authenticated` 授予 EXECUTE。
- 校验 Store v1 顶层、Habit 与 Completion 基础结构，在同一事务内删除当前账号旧行、插入候选关系行并写入或保留初始化标记。
- 重复 Habit、重复 Completion、断裂引用或其他失败会完整回滚，其他账号数据不受影响。

## 实现文件

- `@supabase/migrations/202607310002_local_postgres_backend.sql`
- `@supabase/tests/database/002_replace_user_store.sql`

## 验证证据

- RED：migration 创建前指定 verify 因 `public.replace_user_store(jsonb)` 不存在而失败。
- Apply：经用户明确批准执行本地 reset，001、002 migration 顺序应用成功；见 `@harness-tool-audit.md`。
- GREEN：`pnpm exec supabase test db --local supabase/tests/database/002_replace_user_store.sql`，43/43 PASS。
- 回归：`pnpm exec supabase test db --local supabase/tests/database/001_schema_rls.sql`，90/90 PASS。
- 独立安全审查：补齐首次创建 `user_data_state` 的行为证据后，Spec compliance 与 Task quality 均 APPROVED。
- `git diff --cached --check`：通过。

## 已知非阻塞项

- 嵌套 JSON null、未知/缺失字段及整数转换的部分边界已由当前实现拒绝，但尚未逐项形成自动化断言；已记录到 SDD ledger，留给整分支复审决定是否补测。

## 范围与后续

- 未读取或修改 `.env.local`，未改 T01、客户端或应用代码。
- 后续 Repository 通过 Supabase RPC 调用本函数；成功后仍须完整重读并校验服务端 Store。
