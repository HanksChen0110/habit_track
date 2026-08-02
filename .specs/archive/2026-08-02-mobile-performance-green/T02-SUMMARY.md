# SUMMARY: T02 - 对齐响应式账号契约并收口完整 E2E

- **Change ID**: `mobile-performance-green`
- **Task ID**: `T02`
- **完成时间**: 2026-08-02 10:51 +08:00
- **AI 角色**: Dev

## 做了什么

让 app 与 backend E2E 按真实视口验证账号区：desktop 验证桌面账号、邮箱和退出入口，mobile 验证移动账号、本机数据和至少 44 × 44px 的退出按钮，同时确认另一套账号区隐藏。三个手工创建的 browser context 显式继承当前 Playwright 项目的设备参数。响应式视口用例移除与目标无关的强制刷新，避免在示例数据持久化尚未结束时误回体验选择页。

## 改动文件

| 文件 | 说明 |
|---|---|
| `tests/e2e/app.spec.ts` | 响应式账号断言；响应式用例改用站内导航返回今天页 |
| `tests/e2e/backend.spec.ts` | 手工 context 继承项目设备参数；按实际视口验证账号区 |

## RED 证据

```text
$ pnpm exec playwright test tests/e2e/app.spec.ts tests/e2e/backend.spec.ts --project=mobile --workers=1
8 passed, 3 failed

失败均为测试错误等待 mobile 视口中隐藏的 desktop 账号文案或邮箱。
```

完整功能套件第一次收口为 21/22：响应式用例点击“载入示例”后立刻 `page.goto('/')`，在并发负载下早于持久化完成而回到体验选择页。失败快照明确显示体验选择页；隔离运行通过，证明是测试刷新竞态，不是产品导航缺失。

## 正式 verify

```text
$ pnpm test:e2e

functional: 22/22 passed
performance desktop: complete=20/20, under-1000ms=20/20, P95=489.9ms
performance mobile: complete=20/20, under-1000ms=20/20, P95=291.5ms
performance: 2/2 passed
```

## 边界与门槛审计

- 只修改 TASK 指定的两个 E2E 文件；没有生产代码、CSS、断点、Playwright 配置或数据库变更。
- 没有新增 `skip`、`fixme`、`force: true`、mock 后端或超时放宽。
- 功能 22 项与性能 2 项均由主入口实际执行。
- Vite 仍有既有 chunk 大于 500 kB 提示；按 REQUIREMENT 不在本 change 处理。

## 完成判定

- TASK 状态：done
- verify：PASS
- 提交：`c9eab624f124b8f988b01038e3b9c43d2f4cc8ab`
