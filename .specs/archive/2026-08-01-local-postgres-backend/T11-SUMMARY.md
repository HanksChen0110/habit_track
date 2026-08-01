# T11-SUMMARY — 扩展应用壳账号区与保存状态

- **状态**：done
- **提交**：`128b217b76773d60c6365e40e0f1f33f289fa852`、`41d3be6c6017dbe819b4d51be5d63566236b0eb5`

## 完成内容

- 保持四项一级导航 label/href/order 不变。
- 桌面账号区显示“本机账号数据”、邮箱和中性退出；手机显示短标识与具名 44px 图标退出。
- 两个退出入口共享同步 in-flight 锁，异步期间 disabled + aria-busy，失败显示安全文案。
- `saving` 使用 polite status，成功 notice 使用 polite Toast，写入失败使用持续 role=alert 错误条。
- 错误只在 AppStore 成功清空、用户关闭或退出成功后消失；退出错误覆盖写错误时，关闭前者会重新显示后者，不误清。

## 文件与验证

- `@src/components/AppShell.tsx`、`@src/styles.css`、`@tests/ui/AppShell.test.tsx`。
- RED：初始 6 项中 5 项失败；组合错误回归为 7/8。
- GREEN：AppShell 8/8 PASS；AuthGate/AppStore/AuthContext 联合回归 58/58 PASS。
- 审查 fix round 1 关闭 Important 与测试生命周期缺口，无新 Critical/Important，scoped verdict Approved。

## 边界与后续

- 提交仅含 T11 write_files，越界 0；未修改 AppStore/AuthContext/页面/规格，未读取/修改 `.env.local`。
- 真实浏览器 axe、键盘/读屏、响应式与 200%/400% 缩放仍由 TEST/INTEGRATION 提供 AC-17 证据。
