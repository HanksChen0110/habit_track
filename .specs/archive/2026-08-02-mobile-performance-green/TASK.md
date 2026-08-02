# TASK: 移动端与性能验证恢复全绿

- **Change ID**: `mobile-performance-green`
- **关联**: `@.specs/mobile-performance-green/REQUIREMENT.md`、`@.specs/mobile-performance-green/DESIGN.md`、`@.specs/mobile-performance-green/UI-DESIGN.md`
- **状态**: confirmed
- **角色**: AI（Planner）+ 人工预授权 review

---

## Artifact Preflight Gate

| 上游工件 | 状态 | 证据 |
|---|---|---|
| `CHANGE.md` | PASS | change active，完整路径，范围与禁止项明确 |
| `REQUIREMENT.md` | PASS | AC-1～AC-8 均含 Given / When / Then / verify |
| `DESIGN.md` | PASS | D1～D6、触碰范围、禁动清单、风险与数据流齐全 |
| `UI-DESIGN.md` | PASS | brownfield 视觉语汇、Modal / 响应式契约与 AC 映射已确认 |
| `.specs/LESSONS.md` | DEV 前必读 | T01 命中 L-002 的 reduced-motion 关键词；差异见下方任务 action |

结论：满足 R2.3、R2.7、R2.10，可进入 DEV；无 schema、migration、`.env.local` 或新依赖任务。

## 波次划分

```text
Wave 1 (parallel): T01[P], T03[P]
Wave 2:            T02 (depends on T01, T03)
```

- T01 与 T03 没有共同 `write_files`，可独立实现和验证。
- T02 继续编辑 T01 已触碰的 `tests/e2e/app.spec.ts`，同时以完整 `pnpm test:e2e` 收口，所以必须位于第二波。
- 每个任务完成后按 R4.1 单独提交；不得把工作区既有 README、OpenSpec 行尾或其他 change 内容混入提交。

---

## 任务清单

```xml
<task id="T01" parallel="true" status="done" completed_at="2026-08-02T10:32:39+08:00">
  <name>修复 Modal 顶层挂载与移动端真实点击</name>
  <read_files>
    .specs/mobile-performance-green/REQUIREMENT.md
    .specs/mobile-performance-green/DESIGN.md
    .specs/mobile-performance-green/UI-DESIGN.md
    .specs/LESSONS.md
    src/components/Modal.tsx
    src/pages/TodayPage.tsx
    src/components/AppShell.tsx
    src/styles.css
    tests/e2e/app.spec.ts
    package.json
    playwright.config.ts
  </read_files>
  <write_files>
    src/components/Modal.tsx
    tests/e2e/app.spec.ts
  </write_files>
  <action>
    先运行 verify 保留当前 Pixel 7 保存按钮被 mobile nav 拦截的 RED 证据，再开始修改。
    沿用现有 Modal API、role、焦点圈定、Escape、焦点恢复、closeDisabled、背景点击与全局样式；只使用既有 react-dom portal 能力，把呈现节点移到 document.body 顶层，使 backdrop 的层级 20 真正覆盖 mobile nav 的层级 10（DESIGN D1、UI-DESIGN 5.1）。
    在既有 accessibility E2E 场景中补充用户可观察的回归约束：弹窗打开时 mobile nav 仍存在但不能拦截保存，保存必须用普通 click 完成；不得断言 React 内部状态或使用 force。
    LESSONS L-002 仍适用：不得把 Toast 或弹窗业务生命周期改回 animationend；本任务只改变 Modal 挂载，现有 timer / reduced-motion 行为必须保持。
    禁止修改 src/styles.css、TodayPage、AppShell、断点、z-index 数值或引入依赖。
    预期提交：fix(mobile-performance-green): T01 portal modal above mobile navigation
  </action>
  <verify>pnpm exec playwright test tests/e2e/app.spec.ts --project=desktop --project=mobile --grep "account controls, modal focus" --workers=1</verify>
  <done>
    AC-2～AC-3 对应场景在 desktop 与 Pixel 7 均通过；普通保存点击不被导航拦截，初始焦点、Escape、焦点恢复、reduced-motion 与 Toast 时限无回归；write_files 边界无越界。
  </done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="false" status="done" completed_at="2026-08-02T10:51:43+08:00">
  <name>对齐响应式账号契约并收口完整 E2E</name>
  <read_files>
    .specs/mobile-performance-green/REQUIREMENT.md
    .specs/mobile-performance-green/DESIGN.md
    .specs/mobile-performance-green/UI-DESIGN.md
    .specs/LESSONS.md
    src/components/AppShell.tsx
    src/styles.css
    tests/e2e/app.spec.ts
    tests/e2e/backend.spec.ts
    tests/e2e/performance.spec.ts
    package.json
    playwright.config.ts
  </read_files>
  <write_files>
    tests/e2e/app.spec.ts
    tests/e2e/backend.spec.ts
  </write_files>
  <action>
    先运行 mobile 的 app / backend 目标用例，记录它们错误等待隐藏 desktop 账号元素的 RED 证据。
    在 app.spec.ts 中让账号断言根据当前 Playwright 项目 / 实际视口选择命名 group：desktop 验证“桌面账号 + 本机账号数据 + 邮箱”，mobile 验证“移动账号 + 本机数据 + 44 × 44px 退出按钮”；隐藏的另一组应保持隐藏（DESIGN D2、UI-DESIGN 5.4）。
    在 backend.spec.ts 中保留三个隔离 browser context 的跨账号 / 同账号语义，但所有手工 newContext 必须显式继承当前项目中 BrowserContext 支持的设备参数；不得盲传 runner 专用字段。signIn / startEmptyStore 账号断言使用各 context 的真实视口契约（DESIGN D3）。
    不修改 AppShell、产品文案、CSS、1024px 断点或生产代码；不新增 skip、fixme、force click、desktop-only 分支。
    最后运行完整 pnpm test:e2e；它必须通过 T03 的分段脚本实际执行 22 项功能用例与 2 项性能用例，而不是只运行 app / backend 的窄集合。
    预期提交：test(mobile-performance-green): T02 align responsive account contracts
  </action>
  <verify>pnpm test:e2e</verify>
  <done>
    AC-1 与 AC-6 通过：desktop / mobile 账号契约均按真实可见元素验证，手工隔离 context 真正继承各项目设备；完整输出证明 22 + 2 = 24 项全部通过且无绕过。
  </done>
  <depends_on>T01, T03</depends_on>
</task>

<task id="T03" parallel="true" status="done" completed_at="2026-08-02T10:39:03+08:00">
  <name>按视口校正性能就绪信号并隔离基线执行</name>
  <read_files>
    .specs/mobile-performance-green/REQUIREMENT.md
    .specs/mobile-performance-green/DESIGN.md
    .specs/mobile-performance-green/UI-DESIGN.md
    .specs/LESSONS.md
    src/pages/TodayPage.tsx
    src/styles.css
    tests/e2e/performance.spec.ts
    tests/e2e/app.spec.ts
    tests/e2e/backend.spec.ts
    package.json
    playwright.config.ts
  </read_files>
  <write_files>
    tests/e2e/performance.spec.ts
    package.json
  </write_files>
  <action>
    先运行现有性能 spec 的 desktop + mobile 单 worker 命令，保留 mobile 等待隐藏 summary-panel 的 RED 证据；同时保留此前并发全套 desktop 14/20、隔离 desktop 20/20 的诊断证据。
    将性能场景标记为单一明确的 performance 分类；页面就绪 helper 根据实际受测视口判断：desktop 等待 10 个 habit-row 与可见 summary-panel，mobile 等待 10 个 habit-row、可见 mobile-week-link 且 summary-panel 保持隐藏（DESIGN D4、UI-DESIGN 5.5）。
    保留 SAMPLE_COUNT=20、SAMPLE_LIMIT_MS=1000、underLimit 至少 19、10 Habit、3650 Completion、精确 1 个 habits 页 + 4 个 completions 页、全部样本、P95、完整性与 trace；不得减少或 mock 任何证据。
    调整 package scripts：test:e2e 先以现有并行能力执行 22 项非 performance 场景，再以 workers=1 顺序执行 performance.spec.ts 的 desktop 与 mobile 两项；任一阶段失败必须使总命令失败（DESIGN D5～D6）。
    禁止把 playwright.config.ts 全局 workers 改为 1，禁止扩大超时、删除项目、skip / fixme 或只跑 desktop。
    预期提交：test(mobile-performance-green): T03 isolate responsive performance baselines
  </action>
  <verify>pnpm exec playwright test tests/e2e/performance.spec.ts --project=desktop --project=mobile --workers=1</verify>
  <done>
    AC-4～AC-5 通过：两个视口各 20 次完整读取，分别使用真实可见就绪节点，每轮分页证据完整且各自至少 19 次不超过 1000ms；test:e2e 入口仍声明覆盖功能阶段和串行性能阶段。
  </done>
  <depends_on></depends_on>
</task>
```

---

## AC → Task 覆盖矩阵

| AC | 主任务 | 后续全局验证 |
|---|---|---|
| AC-1 移动账号区 | T02 | TEST / UAT |
| AC-2 弹窗覆盖与保存 | T01 | T02 完整 E2E；TEST / UAT |
| AC-3 焦点与 reduced-motion | T01 | T02 完整 E2E；TEST / UAT |
| AC-4 视口就绪信号 | T03 | T02 完整 E2E；TEST / UAT |
| AC-5 隔离性能基线 | T03 | T02 完整 E2E；TEST / UAT |
| AC-6 24 项 E2E | T02 | TEST / UAT |
| AC-7 类型 / Vitest / pgTAP / build | 无生产范围扩张 | TEST 阶段完整门禁 |
| AC-8 不弱化门槛 | T01、T02、T03 | REVIEW diff 审计 |

## DEV 执行前统一门禁

1. 每个任务开工前 grep `@.specs/LESSONS.md`；命中时必须在 commentary 声明“仍适用”或“本次差异”。
2. 修改测试前读取 test-driven-development 的 `writing-good-tests.md`，先取得 RED，再写通过所需的最小改动。
3. 任务提交前检查实际 diff 只落在该任务 `write_files`；工作区既有修改不得混入。
4. verify 未通过不得把 task 标成 done，不得提交该任务。
5. 三个任务完成后才可进入 TEST；TEST 必须另跑 AC-7 全套门禁，不能复用 DEV 的局部结果作最终证据。

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

## Fix 任务（来自 REVIEW / INTEGRATION）

```xml
<!-- REVIEW / INTEGRATION 如发现问题，在此追加 T-FIX-XX；当前无。 -->
```

---

## Planner 自检

- [x] T01～T03 编号连续，每个任务均含 id / name / read_files / write_files / action / verify / done / depends_on
- [x] 所有 write_files 都来自 DESIGN 0.5.1 触碰范围，无禁动文件
- [x] T01[P] 与 T03[P] 无写文件冲突；T02 的重叠已通过依赖消除
- [x] 每个 verify 是一条可直接执行的 pnpm 命令
- [x] 依赖图无环，Wave 2 在 Wave 1 完成后执行
- [x] AC-1～AC-8 均有实现任务或明确的 TEST / REVIEW 门禁承接
- [x] 未编造 schema、migration、依赖、UI token 或生产功能任务
