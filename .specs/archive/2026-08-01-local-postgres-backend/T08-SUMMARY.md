# T08-SUMMARY — 实现 AppStore 账号读取与迟到响应隔离

- **状态**：done
- **提交**：`5a7d49780103909594bad673366e0193d03d5362`、`9debd831dd572ae86f61cad1813b09ad47d342e4`
- **提交信息**：`feat(local-postgres-backend): T08 isolate account Store reads`；`fix(local-postgres-backend): T08 handle StrictMode read replay`

## 完成内容

- AppStore 改为账号感知的 `idle | loading | ready | saving | error`，只复用 `useAuth` 与 `SupabaseStoreRepository`。
- auth user 变化、退出、booting 或 auth error 会同步遮蔽旧 Store；`read() === null` 发布为 `ready + store=null`。
- 用 user id、session generation、load generation 三门校验成功与失败响应，隔离快速切账号和同账号 reload 的迟到响应。
- React StrictMode effect replay 会重新启动有效读取，cleanup 只推进 load generation，不清空当前 identity。
- `ImportPreview` 已在 app 契约导出；实际页面 import 迁移仍由 T12 完成。

## 文件

- `@src/app/AppStore.tsx`
- `@tests/ui/AppStoreSession.test.tsx`

## 验证与审查

- RED：旧 AppStore 构造已移除的 `LocalStoreRepository`，8 项中 7 项失败。
- GREEN：`pnpm exec vitest run tests/ui/AppStoreSession.test.tsx` 最终 11/11 PASS；`pnpm typecheck` PASS，关闭 T03 以来的项目类型过渡错误。
- 回归覆盖 StrictMode 初始挂载、A→B 迟到 success/reject、同账号 reload 迟到 success/reject、退出立即清空。
- 审查 fix round 1 关闭 Critical 与 Important，scoped verdict Approved，无新 Critical/Important。
- 阶段性全量：104/124 PASS；旧 `App.test.tsx` / `InsightsPage.test.tsx` 共 20 项因尚未组合 AuthProvider 失败，由 T10/T14 迁移，不作最终证据。

## 边界与后续

- 两次提交均仅含 T08 两个 write_files，越界 0；未恢复 localStorage 路径，未读取/修改 `.env.local`。
- T09 必须将当前安全返回 `false` 的过渡写动作替换为真实服务端确认状态机。
- T12 必须让 ManagePage 改从 app 层导入 `ImportPreview`。
- 已知 Minor：过渡 pending-write 未有单独“不调 Repository/不改 Store”直接断言；已进 ledger，T09 将移除该占位。
