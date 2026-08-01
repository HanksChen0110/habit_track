# UAT: 为循迹接入本地 Postgres 后端

- **Change ID**：`local-postgres-backend`
- **执行时间**：2026-08-01 09:30～09:33
- **执行环境**：Windows；本机 Supabase；production preview `127.0.0.1:4173`
- **执行者**：Codex（按用户连续执行授权代执行；使用真实浏览器二进制与可重复自动化步骤）
- **结论**：✅ PASS

## UAT-1 · 真实 Chrome 写入后 Edge 读取

- Google Chrome 150.0.7871.187 创建临时账号、空白 Store、目标为 3 的习惯并打卡到 1/3。
- Microsoft Edge 133.0.3065.51 以独立 profile/context 登录同一账号。
- **实际**：Edge 读取 1/3，PASS。

## UAT-2 · Edge 更新后 Chrome 读取最新值

- Edge 将同一习惯更新到 2/3。
- Chrome 刷新，不共享 localStorage。
- **实际**：Chrome 读取 2/3，PASS。

## UAT-3 · 账号、失败、恢复与既有闭环

- 覆盖：错误密码、会话恢复、退出再登录、不同账号隔离、后端写失败不伪造成功、导入原子替换/失败保留、完整导出、旧 localStorage 非权威。
- 覆盖：创建习惯、当天打卡、最近 7 天纠正、周报、洞察、归档、示例数据、PWA 离线壳、320/390/768/1024/1440 响应式。
- 覆盖：键盘焦点、44px 触控、Modal ESC/focus restore、reduced-motion；成功 Toast 仍按时消失，失败条持续显示。
- **实际**：Playwright desktop 12/12 PASS；真实浏览器 UAT PASS。

## 自动化原始结果摘要

```text
pnpm test:run
  20 test files, 188/188 PASS

pnpm typecheck
  PASS

pnpm build
  PASS; JS gzip 150.28KiB; CSS gzip 53.49KiB
  非阻塞：JS 原始体积 516.61kB 触发 Vite chunk warning

pnpm exec supabase test db --local
  4 pgTAP files, 174/174 PASS

pnpm exec playwright test tests/e2e/app.spec.ts tests/e2e/backend.spec.ts tests/e2e/performance.spec.ts --project=desktop
  12/12 PASS
  performance: complete 20/20; <=1000ms 19/20; P95 931.7ms

uvx semgrep scan --config p/typescript --config p/react --config p/secrets ...
  110 rules, 38 tracked targets, 0 findings
```

## 已知非阻塞项

- `pnpm audit --prod` 报 1 个 high（React Router unstable RSC CSRF）；当前仓库 RSC API/插件/server directive 均为 0，按 `@.specs/local-postgres-backend/TEST.md` 的不可达性证明接受。未来引入 RSC 前必须升级并复测。
- 性能本轮正好达到 19/20 下限；若本机数据继续增长，应另开 change 评估索引、分段加载或服务端聚合，不在本 change 偷加优化。
