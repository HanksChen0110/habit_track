# T15 完成摘要

## 结果

- **状态**：完成，独立复审 APPROVED。
- **提交**：
  - `1dab88c test(local-postgres-backend): T15 migrate account browser flow`
  - `4c8ce6f fix(local-postgres-backend): T15 close account browser evidence gaps`
  - `7984402 fix(local-postgres-backend): T15 preserve reduced-motion toast position`

## 已实现

- Playwright 每条测试通过 UI 注册运行时生成的 `@example.test` 假账号；邮箱和密码只保存在内存，不写日志。
- 真实本地 Supabase 覆盖空白初始化、创建、打卡、刷新恢复、七天纠正、周报、洞察、归档、完整导入导出与后端写失败。
- 覆盖错误密码仍停留登录 gate、退出清空业务界面、同账号重登恢复 Postgres 数据，并精确断言当前账号邮箱。
- 离线读取 4 秒后进入明确失败 gate；恢复联网后“重新读取”恢复账号业务数据，避免永久 loading。
- 320/390/768/1024/1440 响应式、无横向溢出、移动/桌面导航与小屏 44px 控件通过；修复 1024～1199px 长邮箱遮挡导航。
- 覆盖 Modal 键盘焦点/恢复、aria-live 保存结果与 reduced-motion；无动态模式下页面/弹窗无位移，Toast 保持静态居中。
- 离线 PWA 壳与账号 gate 可见，业务 Store 不泄漏。

## 新鲜验证

- `pnpm test:run`：20 files / 187 tests PASS。
- `pnpm build`：PASS；仅有现有大 chunk 警告。
- AC-19 `src`/`dist` 高权限模式扫描：零命中。
- `pnpm test:e2e -- tests/e2e/app.spec.ts --project=desktop`：10/10 PASS。
- 独立复审：原 4 Important、2 Minor 均关闭，无新 finding，APPROVED。

## 范围说明

- 自动化使用 Chromium desktop project；真实 Chrome 与 Edge 的最终人工 UAT 仍属于 TEST/INTEGRATION，不能由本任务替代。
- 未读取或修改 `.env.local`，未输出凭据，未 push、未部署。
