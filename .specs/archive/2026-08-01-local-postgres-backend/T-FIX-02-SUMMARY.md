# T-FIX-02-SUMMARY — 补齐本地 Postgres change 可执行回滚链路

- **状态**：done
- **来源 finding**：TEST 第 4 轮发现 migration 仅有分散的人工 rollback 注释，缺少可执行的整 change down 脚本
- **提交**：`d889dc9`
- **提交信息**：`fix(local-postgres-backend): T-FIX-02 add executable rollback`

## 完成内容

- 新增 `@supabase/rollback/local_postgres_backend.down.sql`。
- 按依赖逆序删除 `replace_user_store(jsonb)`、`completions`、`habits`、`user_data_state`。
- 不触碰 `auth` schema、Supabase 内置对象或其他项目表。

## 验证证据

- up：从空库重放 4 个 migration，成功。
- down：脚本事务执行成功；catalog 查询确认 4 个 change 对象均不存在。
- up again：再次从空库重放 4 个 migration，成功。
- 回归：pgTAP 4 文件、174/174 PASS。
- 高风险操作已写入 `@harness-tool-audit.md`。

## 边界

- 本 change 是尚未进入生产的本地初始 schema，没有生产数据快照；down 会删除本 change 的三张业务表及其中本地数据，执行前仍需备份导出。
- 未修改既有 migration、REQUIREMENT、DESIGN 或 `.env.local`。
