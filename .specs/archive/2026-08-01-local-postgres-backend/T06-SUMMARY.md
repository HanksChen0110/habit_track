# T06-SUMMARY — 实现账号 Store 的完整分页读取

- **状态**：done
- **Change ID**：`local-postgres-backend`
- **任务**：T06
- **提交**：`796df49987d9ce2e429fb6b22a37749fe1464a32`
- **提交信息**：`feat(local-postgres-backend): T06 read complete account Store`

## 完成内容

- 新增 `SupabaseStoreRepository.read()`，复用 T04 唯一 client 和 T03 Repository 读取契约。
- 先读 `user_data_state`：未初始化返回 `null`，已初始化且无业务行返回空 Store v1。
- Habit 按 `id` 排序，Completion 按 `habit_id,date` 复合排序；每页最多 1000 行。
- 所有页读完后投影 Store v1 并统一 `validateStore`；任一状态/query/page/payload/validation 失败都 reject，不发布 partial Store。

## 文件

- `@src/data/supabaseRepository.ts`
- `@tests/data/supabase-repository-read.test.ts`

## 验证与审查

- RED：测试首先因 `src/data/supabaseRepository.ts` 不存在而失败。
- GREEN：`pnpm exec vitest run tests/data/supabase-repository-read.test.ts` 通过，8/8 PASS。
- 3650 条 Completion 实际覆盖 `1000 + 1000 + 1000 + 650` 四页范围，并断言首尾、数量、排序与页区间。
- 授权文件独立 strict TypeScript 检查 PASS；项目级 typecheck 仍仅被 T08 承接的 AppStore 阶段性错误阻断。
- 独立任务审查：Spec Compliance ✅，Task quality Approved，Critical / Important / Minor 均无。

## 自查与边界

- 已核对 T01 migration 真实表列名，并核对当前 `postgrest-js` 的重复 `order()` 与包含上界 `range()` 语义。
- 分页、payload 检查、投影和校验职责分离，未加缓存、重试、快照 RPC 或可配置层。
- TASK write_files 2 项，实际提交 2 项，越界 0。
- 未读取/修改 `.env.local`，未修改 schema、migration、AppStore、页面或规格。

## 后续证据

- 真实 Data API / RLS 与跨会话读取证据由 T16 提供；3650 条本机性能基线由 T17 提供。
- offset 分页保证静态数据集不重不漏，不声称具有跨请求数据库快照语义。
