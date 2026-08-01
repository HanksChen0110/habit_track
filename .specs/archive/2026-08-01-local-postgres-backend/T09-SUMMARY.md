# T09-SUMMARY — 实现 AppStore 服务端确认写入状态机

- **状态**：done
- **提交**：`76603c25e8800704f8ba6589d091bca763bada0c`、`a314e9d2edbec717dc27aa2777265e02b348bf5e`
- **提交信息**：`feat(local-postgres-backend): T09 confirm AppStore writes`；`fix(local-postgres-backend): T09 reject reload while saving`

## 完成内容

- `commit`、`beginEmpty`、`beginDemo`、`confirmImport`、`reload` 均为 `Promise<boolean>`，只在 Repository/Postgres 确认后发布 Store。
- `saving` 使用同步 in-flight ref 拒绝同事件链重复写；reload 在 active write 时立即返回 false，不启动 read 或改变状态。
- 普通 commit 使用 last-confirmed ref 作为 previous；连续 await commit 不依赖 React 重渲染即可使用上一次服务端返回值。
- 初始化/示例/导入通过 `replace` 完整回读，reload 通过 `read`；不盲信 candidate。
- 失败保留 last confirmed Store 并持续 error；成功清 error 并产生区分初始化/保存/导入/重载的 notice。
- 切账号/退出后的迟到 success/reject 都不得恢复旧 Store、notice 或 error，也不会释放新账号写入门。
- 无当前 Store 时导出拒绝；有 Store 时只通过 T03 纯 `serialize` 序列化，不回退 localStorage。

## 文件

- `@src/app/AppStore.tsx`
- `@tests/ui/AppStoreWrites.test.tsx`

## 验证与审查

- RED：初始 9/9 因写动作仅同步 false 占位而失败；同事件链连续 commit 另补 1 个竞态 RED。
- GREEN：T09 focused 10/10 PASS；T08 session/StrictMode 回归 11/11 PASS；授权文件 strict TypeScript PASS。
- 项目 typecheck 仅剩 ManagePage/TodayPage 4 处旧同步 Promise 调用，由 T12/T13 迁移。
- 审查的 reload-vs-active-write Important 已在 fix round 1 ADDRESSED，无新 Critical/Important，scoped verdict Approved。

## 边界与已知项

- 提交均只含 T09 两个 write_files，越界 0；未读取/修改 `.env.local`，未修改页面、Repository、AuthContext、schema 或规格。
- 已知 Minor：replace/RPC/readback reject 经共享 `runWrite` 失败路径间接覆盖，但缺少各入口的 null/old-Store 直接断言；留给整分支 REVIEW 裁决。
