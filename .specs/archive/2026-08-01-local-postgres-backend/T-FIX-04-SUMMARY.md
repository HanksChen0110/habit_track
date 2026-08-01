# T-FIX-04-SUMMARY — 让成功 Toast 生命周期独立于动效

- **状态**：done
- **来源 finding**：REVIEW F-1 / R2 Important（reduced-motion 禁用动画导致成功 Toast 永久残留）
- **提交**：`8c4906b`
- **提交信息**：`fix(local-postgres-backend): T-FIX-04 expire reduced-motion toast`

## 完成内容

- `AppShell` 在 notice 出现时启动 2600ms timer；新 notice、notice 清空或卸载时自动取消旧 timer。
- 移除 `onAnimationEnd` 对业务状态的清理职责；CSS 动画只保留视觉效果。
- 失败条仍持续显示，必须由用户关闭；未改变错误语义。

## TDD 与验证

- RED：新增组件测试后旧实现 1/9 失败，2600ms 后 `clearMessages` 调用为 0。
- GREEN：`tests/ui/AppShell.test.tsx` 9/9 PASS。
- reduced-motion E2E：Toast 居中后在 4 秒内消失；`tests/e2e/app.spec.ts` 10/10 PASS。
- `pnpm typecheck`：PASS。

## 范围

- 仅修改 `AppShell.tsx` 与对应组件/E2E 测试；未修改样式、规格、后端或 `.env.local`。
