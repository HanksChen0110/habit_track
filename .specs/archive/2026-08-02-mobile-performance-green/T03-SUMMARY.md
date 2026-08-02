# SUMMARY: T03 - 按视口校正性能就绪信号并隔离基线执行

- **Change ID**: `mobile-performance-green`
- **Task ID**: `T03`
- **完成时间**: 2026-08-02 10:39 +08:00
- **AI 角色**: Dev

---

## 做了什么（一段话）

把性能用例的“Store 已就绪”判断从桌面专属 `.summary-panel` 改为按实际视口验证：desktop 等待摘要并确认移动周报入口隐藏，mobile 等待移动周报入口并确认摘要隐藏；两者都必须显示 10 个 Habit。性能场景增加 `@performance` 分类，`pnpm test:e2e` 现在先执行 22 项功能用例，再用单 worker 顺序执行 desktop / mobile 两项性能基线。20 次、19 次达标、1,000ms、3,650 条记录和五段分页证据全部保留。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `tests/e2e/performance.spec.ts` | 修改 | 增加视口就绪 helper、真实隐藏/可见断言和 performance 分类 |
| `package.json` | 修改 | 增加 functional / performance 分段脚本，主入口顺序组合两阶段 |

## RED 证据

```text
$ pnpm exec playwright test tests/e2e/performance.spec.ts --project=desktop --project=mobile --workers=1

desktop:
  complete=20/20; under-1000ms=20/20; P95=190.7ms → PASS
mobile:
  expect(locator('.summary-panel')).toBeVisible()
  Expected: visible; Received: hidden
  tests/e2e/performance.spec.ts:195 → FAIL

1 failed, 1 passed
```

失败发生在 mobile 已成功导入 10 Habit / 3,650 Completion 之后，原因正是测试等待 CSS 按契约隐藏的桌面摘要，不是数据库缺页或性能超时。

## 正式 verify 输出

```text
$ pnpm exec playwright test tests/e2e/performance.spec.ts --project=desktop --project=mobile --workers=1

desktop:
  samples=207.8,...,181.6ms
  P95=203.2ms
  complete=20/20
  under-1000ms=20/20
  expected-pages=habits:0-9 | completions:0-999 | 1000-1999 | 2000-2999 | 3000-3649

mobile:
  samples=133.4,...,155.5ms
  P95=180.6ms
  complete=20/20
  under-1000ms=20/20
  expected-pages=habits:0-9 | completions:0-999 | 1000-1999 | 2000-2999 | 3000-3649

2 passed (23.4s)
```

## 分组与类型验证

```text
$ pnpm exec playwright test --grep-invert '@performance' --list
Total: 22 tests in 2 files

$ pnpm exec playwright test tests/e2e/performance.spec.ts --workers=1 --list
Total: 2 tests in 1 file

$ pnpm typecheck
> tsc -b --pretty false
exit 0
```

第一次直接在 PowerShell 以未加引号的 `@performance` 做分组清单时，shell 没有把它稳定传成 grep 值，意外执行了全部 24 项：18 通过、6 失败，并再次得到 desktop 10/20、mobile 16/20 的并发污染证据。随后把 package script 的分类值显式写为 `"@performance"`，重新用真实 `--list` 得到准确的 22 + 2。该误运行没有被当作 GREEN；T02 仍负责修复其中的响应式账号失败并运行最终完整入口。

Vite 继续输出既有主 chunk 大于 500 kB 提示；REQUIREMENT AC-7 已明确不在本 change 处理。

## 6 维自查

### 沿用既有抽象 grep（R6.4）

- 性能数据与分页：沿用 `tests/e2e/performance.spec.ts` 的 `Sample`、`countRows`、`expectExpectedPages`，没有新建第二套计时或统计逻辑。
- 响应式节点：`rg -n "summary-panel|mobile-week-link" src tests` 确认 `TodayPage.tsx` 与 `styles.css` 的既有 UI 契约；只在测试 helper 复用这些节点。
- Playwright 项目：沿用 `playwright.config.ts` 的 desktop / mobile 两项目；没有修改配置或复制设备常量。
- LESSONS：按 performance / pagination / Playwright / viewport / concurrency 检索没有 active 命中；L-001～L-003 与本任务不重叠。

### 🟢 R1 · 认知过载：就绪分支集中
**Symptom**：三个重复的 Habit + summary 等待收敛为一个 10 行 helper。
**Source**：`expectViewportReady(page)`。
**Consequence**：desktop / mobile 规则在一个位置可审计。
**Remedy**：无需继续拆分。

### 🟢 R2 · 变更传播：两文件边界
**Symptom**：只修改性能 spec 与 package scripts。
**Source**：`git show --stat eee0497`。
**Consequence**：生产代码、Playwright 配置、数据层和 UI 均不受影响。
**Remedy**：无需处理。

### 🟢 R3 · 知识重复：去除三处就绪重复
**Symptom**：原先初始化、刷新、采样前分别等待 Habit / summary。
**Source**：performance spec diff。
**Consequence**：未来 UI 契约变化不再需要改三处。
**Remedy**：已由单一 helper 消除。

### 🟢 R4 · 偶然复杂：没有外部 runner
**Symptom**：分组仅使用 Playwright 自带 grep 与 worker 参数。
**Source**：`package.json` scripts。
**Consequence**：无需 Node orchestration 文件、锁文件或新依赖。
**Remedy**：保持当前两阶段脚本。

### 🟢 R5 · 依赖混乱：测试只依赖可见 UI 与网络证据
**Symptom**：helper 接收 Playwright Page，不 import 生产内部状态。
**Source**：`tests/e2e/performance.spec.ts` imports。
**Consequence**：测试继续从用户边界与 Data API 边界验证。
**Remedy**：无需处理。

### 🟢 R6 · 领域扭曲：命名对应用户状态
**Symptom**：`expectViewportReady` 明确表达“当前视口可用”，没有 `data/info/item` 式含糊名。
**Source**：新增 helper。
**Consequence**：代码意图与 AC-4 一致。
**Remedy**：无需重命名。

### 门槛弱化审计

- `SAMPLE_COUNT = 20` 保持。
- `SAMPLE_LIMIT_MS = 1000` 保持。
- `underLimit >= 19` 保持。
- `EXPECTED_PAGE_KEYS` 五段保持。
- `playwright.config.ts` 零修改，desktop / mobile 两项目保持。
- 无 `skip`、`fixme`、`force: true`、超时扩大或 mock 后端。

### 已知接受 + 理由

- 无 Major 项。

### 已知小问题

- package script 以标题 tag 做分类；长期 CI 拆分可在 REQUIREMENT v2 另行设计，本次通过显式引号和 22 + 2 运行清单控制漂移。

## 数据库迁移

N/A。本任务没有 schema、migration、RLS、RPC 或数据库写入逻辑变更；性能测试继续使用随机临时账号的现有导入路径。

## 越界检查

```text
✅ 越界检查（R6.5）：
  - TASK write_files：2 项
  - 本任务提交涉及：2 项
  - 越界：0
  - playwright.config.ts：0 修改
  - 工作区其他历史修改：未暂存、未提交
```

## 破坏性变更

N/A。没有删除文件、公共导出、HTTP API 或生产符号；测试标题增加分类标记，完整入口已同步更新。

## 决策与偏离

- 无设计偏离。实际实现对应 DESIGN D4～D6。
- 为跨 PowerShell / package script 稳定传参，`@performance` 在 package script 中显式加引号；这是验证中发现并修复的必要细节。

## 是否触发新工作

- [ ] 触发新 fix-plan
- [ ] 触发 CONTEXT.md 更新
- [ ] 发现需求/设计问题

## 完成判定

- TASK.md 中对应任务已标记：是
- 正式性能 verify：2/2 PASS；两个视口均 20/20 完整、20/20 达标
- 分组清单：22 功能 + 2 性能
- TypeScript：0 错误
- 提交 hash：`eee04971a3b5556fa51e7676db147b16cf1dbe39`
