# ADR-008: 当前账号 Store 使用受控事务 RPC 原子替换

- **状态**: accepted
- **日期**: 2026-07-31
- **Change**: `@.specs/local-postgres-backend/CHANGE.md`
- **Requirement**: AC-10、AC-12、AC-13
- **Design**: `@.specs/local-postgres-backend/DESIGN.md#24-初始化与完整替换`

## Context

空白初始化、示例数据和 JSON 导入都可能同时改变多条 Habit 与 Completion。若浏览器通过 Data API 依次删除旧行、插入 Habit、再插入 Completion，中途任一步失败都会留下部分替换的数据，违反“失败不改变原数据”和“完整替换”的验收要求。

直接保存每账号一份 JSON 快照可以简化原子替换，但会推翻 ADR-007 已确认的关系表、记录级写入和数据库约束方向。另建自定义 Node API 也会扩大本地运行组件。

## Decision

新增一个 Postgres Database Function `replace_user_store`，由浏览器通过 Supabase RPC 调用：

- 输入只包含通过客户端 `validateStore` 的 Store v1 JSON，不接受 `user_id`。
- 函数必须从 `auth.uid()` 取得目标账号；无有效账号立即失败。
- 使用默认 `SECURITY INVOKER`，设置空 `search_path`，所有数据库对象使用完整 schema 名。
- 在同一数据库事务中完成结构校验、删除当前账号旧数据、插入新 Habit、插入新 Completion，并写入 `user_data_state` 初始化标记。
- 任一校验、约束或写入失败都使整个 RPC 失败并回滚；客户端继续保留最后确认 Store。
- 撤销 `public` 和 `anon` 的执行权，只向 `authenticated` 授予执行权；底层表继续受 RLS 约束。
- RPC 成功后客户端重新分页读取并校验 Store，不把请求参数直接视为服务端真相。

普通创建、编辑、归档和打卡不调用该 RPC，继续走记录级 Data API 写入。

依据：[Supabase Database Functions](https://supabase.com/docs/guides/database/functions)、[Supabase RPC](https://supabase.com/docs/reference/javascript/rpc)、`@.specs/ARCHITECTURE.md#adr-007--账号隔离的关系型持久化与-rls`。

## Consequences

### 正面

- 满足初始化、示例数据和 JSON 导入的全有或全无语义。
- 账号边界在数据库内从当前 session 派生，客户端不能指定替换其他账号。
- 不需要自建 API 服务，也不退回 JSON 快照持久化。
- 同一事务可复用三种完整替换场景，测试边界集中。

### 代价

- migration 中需要维护一段 PL/pgSQL / SQL 函数及明确授权。
- Store v1 的产品校验仍以 TypeScript `validateStore` 为主；数据库函数只重复安全、结构、引用和约束所需校验，需防止两侧契约漂移。
- 大型 Store 作为 JSON 参数会增加单次请求体积；本次 10 个 Habit、3,650 条 Completion 的本地基线必须实测。

### 验证要求

- pgTAP：未登录不可执行；账号 A 无法替换账号 B；有效替换成功；无效 Habit / Completion、重复键和断裂引用全部回滚。
- 应用测试：取消和客户端校验失败时不调用 RPC；RPC 失败时保留旧 Store 且不显示成功。
- UAT：导入成功后刷新与另一浏览器读取结果一致。

### 回退边界

在尚无真实数据时可删除函数并改用另一种原子服务边界；产生账号数据后若替换方案变化，必须保留关系表数据并提供等价的事务和权限测试，不能退回客户端多请求替换。
