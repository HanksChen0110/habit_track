# UAT: 移动端与性能验证恢复全绿

- **Change ID**: `mobile-performance-green`
- **执行时间**: 2026-08-02 11:07～11:10 +08:00
- **角色**: Verifier + Release
- **结论**: PASS

## Artifact Preflight Gate

`CHANGE.md`、`REQUIREMENT.md`、`DESIGN.md`、`UI-DESIGN.md`、`TASK.md`、`TEST.md`、`REVIEW.md` 全部存在；T01～T03 均为 done；REVIEW 为 APPROVED。

## 用户路径验收

本 change 的 AC 全部可自动化，TEST 未留下 manual-only UAT，因此没有把自动化结果冒充用户人工签字。Verifier 同时检查了本轮生成的 desktop 1440 与 mobile 390 今天页截图，页面视觉语汇未变化。

| UAT | 用户路径 | 证据 | 结果 |
|---|---|---|---|
| UAT-1 | mobile 打开创建习惯弹窗，键盘关闭后再次打开并用普通 click 保存 | `app.spec.ts` account controls / modal focus；导航仍存在且不拦截 | ✅ PASS |
| UAT-2 | desktop/mobile 空账号、退出重登、三个隔离 context 同账号共享 / 异账号隔离 | app + backend 两项目 22 项功能套件 | ✅ PASS |
| UAT-3 | desktop/mobile 读取 10 Habit + 3,650 Completion | 两视口各 20 次，精确五段分页 | ✅ PASS |
| UAT-4 | 320/390/768/1024/1440 的导航、横向溢出和触控区 | 响应式 E2E + 当前截图检查 | ✅ PASS |

## 最终全套自动化

```text
pnpm typecheck
PASS，TypeScript 0 errors

pnpm test:run
PASS，20 files / 188 tests

pnpm exec supabase test db --local
PASS，4 files / 174 tests

pnpm build
PASS，JS 516.66 kB / gzip 150.31 kB
已知提示：单 chunk >500 kB（REQUIREMENT v2，非本 change 阻塞）

pnpm test:e2e
functional: 22/22 PASS
performance desktop: P95=440.0ms, complete=20/20, under-1000ms=20/20
performance mobile: P95=333.9ms, complete=20/20, under-1000ms=20/20
performance: 2/2 PASS
```

## 失败重试

- INTEGRATION 正式轮：0 次失败、0 次自动重试。
- DEV 首次完整收口的 21/22 失败已在 T02 内定位为测试刷新早于示例数据持久化，修复后 DEV、TEST、INTEGRATION 三轮完整 E2E 均通过。

## 发布判定

- AC-1～AC-8：PASS
- Critical / Major review finding：0 / 0
- schema / migration / `.env.local`：本 change 均未修改
- 允许归档并进入 Git 最终提交 / push。
