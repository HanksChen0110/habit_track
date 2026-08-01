# T14 完成摘要

## 结果

- **状态**：完成，独立复审 APPROVED。
- **提交**：
  - `04b7dab test(local-postgres-backend): T14 migrate account-backed regressions`
  - `aaf1300 test(local-postgres-backend): T14 strengthen account boundary evidence`

## 已实现

- 将 App 与 Insights 的原 20 条 React 回归迁移到可控 authenticated Auth 与 stateful StoreRepository/AppStore 边界；全部原业务断言保留，无 skip/todo/only。
- 新增 legacy `xunji.store.v1` 与账号 Store 冲突时 localStorage 不权威且不被改写的回归。
- 后端导入失败用 deferred Repository Promise 证明 pending 期间候选 Store 从未发布，失败后仍保留确认值。
- 退出后重登用 deferred 第二次 read 证明旧内存 Store 已清除、确实重新读取服务端，且未调用 commit/replace 删除服务器数据。

## 本轮新鲜验证

- `pnpm exec vitest run tests/ui/App.test.tsx tests/ui/InsightsPage.test.tsx`：23/23 PASS。
- `pnpm test:run`：20 files / 186 tests PASS。
- `pnpm typecheck`：PASS。
- `pnpm build`：PASS；仅输出现有大于 500 kB chunk 警告。
- 复审：2 个 Important 均 ADDRESSED，无新 finding，APPROVED。

## 范围说明

- 测试 fake 只提供 App/UI 状态机证据；真实 Supabase 网络、RLS 与跨浏览器行为由数据库测试及 T15～T17/UAT 负责。
- 未修改生产代码、`.env.local`、密钥或部署配置；未 push。
