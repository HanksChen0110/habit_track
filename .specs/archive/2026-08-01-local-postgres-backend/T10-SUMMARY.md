# T10-SUMMARY — 实现账号入口与真实数据门

- **状态**：done
- **提交**：`d26c0a79a1b1861ac4b229d52918df92ef2d16f9`、`626d0fd6de0d1d807acdbea54a4c991d7e874a5a`

## 完成内容

- 顶层组合为 `AuthProvider > AppStoreProvider > HashRouter > gate/routes`，未认证不展示业务数据页。
- 分离会话恢复、账号读取、认证失败、数据失败和未初始化；loading 只显示真实文字并遮蔽任何旧 Store。
- 账号表单默认登录，文字切换注册，只有 email/password；含显式 label、autocomplete、busy 与安全错误。
- 初始读取错误页支持 reload 与 signOut；signOut 失败显示安全文案，不伪造退出。
- Onboarding 的空白/示例初始化均等待服务端 `true` 才导航，pending/false 保留当前页。
- 仅补 OKLCH 语义 alias、可见 focus、44/48px 控件和 reduced-motion 基础样式，未增加 OAuth、找回、确认密码或 skeleton。

## 文件

- `@src/App.tsx`
- `@src/pages/OnboardingPage.tsx`
- `@src/styles.css`
- `@tests/ui/AuthGate.test.tsx`

## 验证与审查

- RED：初始 gate 测试 8 项中 7 项失败；另补 loading 遮蔽旧 Store、signOut 失败和初始化导航契约 RED。
- GREEN：AuthGate 11/11 PASS；T05/T08/T09 联合回归 50/50 PASS。
- 任务审查 fix round 1 关闭 2 项 Important，无新 Critical/Important，scoped verdict Approved。
- 项目 typecheck 仅剩 T12/T13 的 ManagePage/TodayPage 4 处 Promise 迁移错误。

## 边界与后续证据

- 提交只含 T10 write_files，越界 0；未读取/修改 `.env.local`，未修改 AuthContext、AppStore、Repository、schema 或规格。
- Minor：字段级 `aria-invalid`/就近错误和 reduced-motion 位移取消留给整分支 REVIEW 裁决。
- AC-17 还需在 TEST/INTEGRATION 做真实浏览器 axe、纯键盘、200%/400% 缩放与 reduced-motion 实测；jsdom 不作最终证据。
