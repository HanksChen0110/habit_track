# T05-SUMMARY — 实现 AuthContext 认证生命周期

- **状态**：done
- **Change ID**：`local-postgres-backend`
- **任务**：T05
- **提交**：`315641c4e3869571de88c3c9803333246b54d4f2`、`36bde3d4da57c2115520520d7f6cee02a632b6d2`、`727f48411227f63797aba6aa9a6f5812350bfe6c`、`8cfe9a2356d6f0cea959dc9abd08e0f7ed8de054`、`9e0156b72018f492f815683533bb9cba8cda16de`

## 完成内容

- 新增 `AuthProvider` / `useAuth`，实现 `booting | signed_out | authenticated | error` 以及 `signUp` / `signIn` / `signOut`。
- Context 只暴露 `{ id, email }`，Session、token 和恢复凭据仅保留在 Provider 私有 ref 中。
- 认证错误映射为安全可读类别，不透传 Supabase 原始错误、密码、token 或内部对象名。
- 建立 credential 串行队列、auth generation、权威 Session restoration 与 authoritative signed-out 屏障，防止迟到登录、refresh 或退出交错恢复旧账号。
- 恢复性 `setSession` / `signOut` 失败会返回脱敏失败结果，不会伪报成功。

## 实现文件

- `@src/auth/AuthContext.tsx`
- `@tests/ui/AuthContext.test.tsx`

## 验证与审查

- RED：从模块不存在、基础生命周期、错误类别，逐步补到真实 Supabase 事件顺序、权威 Session 恢复、booting 失败、signOut 竞态与 restorative failure。
- GREEN：`pnpm exec vitest run tests/ui/AuthContext.test.tsx` 最终 18/18 PASS，无 React warning / console error / test warning。
- 任务审查经 4 轮修复：迟到 `SIGNED_IN`、已认证切换失败、deferred restoration、pending credential 与 signOut 交错、restorative signOut 失败均已 ADDRESSED；最终 scoped verdict APPROVED。
- `pnpm typecheck` 未报 T05 错误；仅保留 T03→T08 已知 AppStore 阶段性错误。

## 6 维自查与边界

- R1：复杂度限于 Auth Provider 私有认证转移，未向页面泄漏。
- R2：所有提交只含 T05 两个 write_files。
- R3：错误映射、Session 应用和恢复失败使用集中函数。
- R4：未增加 OAuth、忘记密码、确认密码或第二 Supabase client。
- R5：只复用 T04 `getSupabaseClient` 边界。
- R6：状态与动作使用认证领域命名。
- React 禁忌扫描：`const styles`、`Object.assign(window, ...)`、`scrollIntoView` 均 0 命中。
- 越界：0；未读取或修改 `.env.local`、AppStore、页面、规格或 Supabase 配置。

## 已知非阻塞项

- Provider 卸载时 `unsubscribe` 及 pending response 失效已有实现，但缺少直接自动化断言；已记入 SDD ledger，留给整分支 REVIEW 判定是否补测。
