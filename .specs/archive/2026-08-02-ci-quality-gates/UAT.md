# UAT: 建立 GitHub CI 四关与合并保护

- **Change ID**: `ci-quality-gates`
- **阶段**: INTEGRATION
- **执行时间**: 2026-08-02 14:33 +08:00
- **执行者**: Codex（本地验证 + GitHub API / Actions）

---

## 自动化全套结果

| 命令 | 结果 | 真实输出摘要 |
|---|---|---|
| `pnpm lint` | ✅ | Oxlint exit 0 |
| `pnpm typecheck` | ✅ | TypeScript build mode exit 0 |
| `pnpm test:run` | ✅ | 20 files / 188 tests passed |
| `pnpm build` | ✅ | Vite production build exit 0；保留既有单 JS chunk >500 kB warning，非失败 |
| `pnpm test:e2e` | ✅ | 22 functional + 2 performance Playwright tests passed；desktop / mobile 均覆盖 |

性能 E2E：3,650 条记录读取基线，desktop p95 295.7ms、mobile p95 283.3ms，均为 20/20 次 <1s。

## UAT-1 · PR 质量门实际放行

- **前置**: PR [#1](https://github.com/HanksChen0110/habit_track/pull/1) 指向 `main`，ruleset `main-ci-required-checks`（ID 20223088）为 active。
- **步骤**:
  1. 读取 PR 最新成功 run [30735679718](https://github.com/HanksChen0110/habit_track/actions/runs/30735679718)。
  2. 确认四个 required check 的精确名称和结论。
  3. GET ruleset，确认 required context 及 strict 策略；读取 PR 合并状态。
- **期望**: `lint`、`typecheck`、`test`、`build` 全部成功时，PR 为 `CLEAN`；未完成 / 失败时由 active required checks 阻止合并。
- **实际**: 通过。四个 check 全为 `SUCCESS`，PR `mergeStateStatus=CLEAN`，ruleset 没有 bypass actor、没有额外审批限制。

## UAT-2 · 本地应用回归

- **前置**: 本机 Supabase Auth / Data API / Postgres 已启动；测试目标为 `.env.local` 中的本地地址。
- **步骤**: 执行 `pnpm test:e2e`。
- **期望**: 桌面与移动端的账号、习惯、打卡、导入导出、离线壳、焦点/减少动效与大数据读取均通过。
- **实际**: 通过。22 项功能 + 2 项性能通过；没有访问生产项目。

## 失败诊断与重试记录

| 轮次 | 现象 | 根因证据 | 处理 | 结果 |
|---|---|---|---|---|
| 1 | `pnpm test:e2e` 的 `backend.spec.ts` desktop / mobile 各失败一次（20/22 通过） | `supabase start` 后立即并行执行时，失败页为“暂时无法读取账号数据”；网关记录首次 `user_data_state` GET 为 401；Auth 注册本身已成功 | 不改业务代码；等待本地 stack 就绪并运行 `supabase status` | 已定位为本地启动就绪竞态 |
| 2 | 仅重跑失败的后端用例 | `playwright test tests/e2e/backend.spec.ts --workers=1` | 服务就绪后重跑 | 2/2 通过 |
| 3 | 重新执行完整 E2E | `pnpm test:e2e` | 服务已就绪 | 24/24 通过 |

R2.6：自动重试 2 轮后已全绿，未超过 3 轮上限。

## 集成结论

- PR 质量门、main ruleset 和本地完整应用回归均通过。
- 本 change 不触及数据库 schema、migration、Vercel、Supabase 云端配置或真实账号数据。
- 可进入合并；归档仍需按项目规则取得用户对“移动目录”的明确确认。
