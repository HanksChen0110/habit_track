# T12 完成摘要

## 结果

- **状态**：完成，独立复审 APPROVED。
- **提交**：
  - `8b5bf71 feat(local-postgres-backend): T12 await account data operations`
  - `1b147c8 fix(local-postgres-backend): T12 close recovery and busy-state gaps`
  - `a6aa29a fix(local-postgres-backend): T12 return confirmed replacement state`

## 已实现

- 管理页创建、编辑、归档和导入均等待 AppStore 的布尔结果；pending 防重复，只有成功才关闭，失败保留表单或候选。
- RecoveryPage 在数据完整性错误时可从生产路由到达；普通后端读取失败仍只提供重试与退出。
- 恢复失败保留 `ImportPreview`，支持直接重试、同文件重选、选择其他备份与取消；恢复中的重复触发不会重复写入。
- HabitForm 显示并播报保存中状态；Modal 的关闭、Escape、背景点击和 Tab/Shift+Tab 在 pending 时保持受控，焦点不逸出弹窗。
- `StoreIntegrityError` 明确区分 Store 无效与普通读取失败。
- 新迁移 `202608010002_replace_user_store_result.sql` 让 `replace_user_store(jsonb)` 在同一事务中返回由当前账号落库行重建的 canonical Store；Repository 校验并采用 RPC 返回值，不再执行会产生提交歧义的二次回读。
- 保持 `SECURITY INVOKER`、空 `search_path`、仅 authenticated 执行、`auth.uid()` 隔离和原子回滚。

## 验证

- T12 focused Vitest：6 files / 72 tests PASS。
- T09/T11 相关回归：22/22 PASS。
- `pnpm exec supabase db reset --local --no-seed`：PASS；已按授权记录审计。
- pgTAP 001–004：174/174 PASS。
- `pnpm typecheck`：T12 触碰范围无错误；仅剩 T13 已知 `TodayPage.tsx:45,123` 两处异步契约错误。
- 独立复审：无 Critical、Important 或 Minor，APPROVED。

## 来源与范围说明

- 实施依据：`@.specs/local-postgres-backend/TASK.md#T12`、`@.specs/local-postgres-backend/UI-DESIGN.md`、`@.specs/local-postgres-backend/REQUIREMENT.md` AC-9、AC-11～AC-15、AC-17。
- 复审驱动的范围扩展已同步回 T12：生产恢复路由、完整性错误分类、恢复态并发、Modal busy/focus，以及 RPC 内 canonical 返回。
- 未读取或修改 `.env.local`，未 push、未部署。
