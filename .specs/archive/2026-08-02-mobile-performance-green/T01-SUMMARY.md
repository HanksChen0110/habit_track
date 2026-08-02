# SUMMARY: T01 - 修复 Modal 顶层挂载与移动端真实点击

- **Change ID**: `mobile-performance-green`
- **Task ID**: `T01`
- **完成时间**: 2026-08-02 10:32 +08:00
- **AI 角色**: Dev

---

## 做了什么（一段话）

先用既有 desktop / mobile Playwright 场景复现 mobile nav 拦截“保存习惯”的失败，再在测试中明确“弹窗打开时移动导航仍保持可见”，防止通过隐藏导航制造假绿。生产实现只为既有 `Modal` 引入 `react-dom/createPortal`，将原 JSX 挂到 `document.body`；组件 API、视觉样式、z-index、焦点圈定、Escape、焦点恢复、busy、背景关闭和 Toast 生命周期均未改变。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `src/components/Modal.tsx` | 修改 | 使用已有 `react-dom` portal 把 Modal 呈现节点移到 body 顶层 |
| `tests/e2e/app.spec.ts` | 修改 | 移动端明确断言导航仍可见，并继续用普通 click 验证保存不被拦截 |

## TDD RED → GREEN 证据

### RED（生产代码未修改）

```text
$ pnpm exec playwright test tests/e2e/app.spec.ts --project=desktop --project=mobile --grep "account controls, modal focus" --workers=1

desktop: passed (4.8s)
mobile: failed (30.2s)
Error: locator.click: Test timeout of 30000ms exceeded.
<svg class="lucide lucide-settings2 ..."> from <nav class="mobile-nav"> subtree intercepts pointer events
1 failed, 1 passed
```

补充“mobile nav 仍可见”约束后再次运行 mobile，仍在同一个普通保存点击处 RED，证明失败来自缺失的顶层挂载，而不是测试语法或错误前置条件。

### GREEN（正式 verify）

```text
$ pnpm exec playwright test tests/e2e/app.spec.ts --project=desktop --project=mobile --grep "account controls, modal focus" --workers=1

Running 2 tests using 1 worker
ok 1 [desktop] account controls, modal focus and reduced motion remain accessible (5.8s)
ok 2 [mobile] account controls, modal focus and reduced motion remain accessible (4.4s)
2 passed (20.7s)
```

```text
$ pnpm typecheck
> tsc -b --pretty false
exit 0
```

Vite 仍输出已知的主 chunk 大于 500 kB 提示；该提示不是错误，且在 REQUIREMENT AC-7 明确不属于本 change。

## 6 维自查

### 沿用既有抽象 grep（R6.4）

- Modal：`rg -n "Modal|modal-backdrop" src tests` 找到唯一公共实现 `src/components/Modal.tsx` 及既有调用 → 沿用，不新增第二套组件。
- Portal：实现前 `rg -n "createPortal|portal" src tests` 为 0 命中 → 使用已经安装的 `react-dom` 原生能力，未引入依赖或自建抽象。
- 生命周期：`rg -n "animationend" src tests` 为 0 命中 → 已查阅 L-002，继续让 React timer 管理 Toast，本任务不重试 animationend。
- 层级：`rg -n "modal-backdrop|mobile-nav" src/styles.css` 找到既有 20 / 10 刻度 → 不改数值，只修正 DOM 堆叠边界。

### 🟢 R1 · 认知过载：无新增复杂控制流
**Symptom**：生产 diff 只有一个 import 和 portal 返回边界，既有 Modal 函数长度与嵌套未增加。
**Source**：`git diff 0733213^ 0733213 -- src/components/Modal.tsx`。
**Consequence**：读者仍只需理解原有组件生命周期。
**Remedy**：无需拆分；继续保留单一公共 Modal。

### 🟢 R2 · 变更传播：严格限定两文件
**Symptom**：提交只包含 TASK 声明的 `Modal.tsx` 与 `app.spec.ts`。
**Source**：`git show --stat 0733213` 为 2 files changed。
**Consequence**：AppShell、TodayPage、CSS、断点和数据层零传播。
**Remedy**：无需处理。

### 🟢 R3 · 知识重复：无复制逻辑
**Symptom**：没有新增焦点、关闭或层级 helper。
**Source**：生产 diff 复用原 JSX 与原 effect。
**Consequence**：焦点和关闭契约仍只有一个权威实现。
**Remedy**：无需抽取。

### 🟢 R4 · 偶然复杂：采用最小内置能力
**Symptom**：没有 wrapper、配置项、portal root 管理器或第三方库。
**Source**：新增依赖为 0，只有 `createPortal(..., document.body)`。
**Consequence**：直接解决 stacking context，不制造扩展点。
**Remedy**：无需简化。

### 🟢 R5 · 依赖混乱：方向保持正确
**Symptom**：公共 UI 组件依赖 React DOM 呈现能力，不依赖页面、Store 或 Supabase。
**Source**：`src/components/Modal.tsx` imports。
**Consequence**：既有 UI → React/ReactDOM 边界不变。
**Remedy**：无需倒置。

### 🟢 R6 · 领域扭曲：命名与契约未变
**Symptom**：没有新增含糊业务变量或重命名公共 props。
**Source**：`title/onClose/closeDisabled/children/variant` 签名原样保留。
**Consequence**：所有现有调用无需迁移。
**Remedy**：无需处理。

### UI / React 交付自检

- `rg` 未发现本任务引入 `const styles`、`Object.assign(window, ...)`、`scrollIntoView`、`animationend`、`z-index: 9999`、`force: true`、`test.skip` 或 `test.fixme`。
- 未改颜色、字体、圆角、阴影、动效、safe-area 或文案；UI-DESIGN 的 brownfield 约束保持。
- desktop 与 Pixel 7 真实交互均通过；mobile nav 保持可见且不再拦截保存。

### 已知接受 + 理由

- 无 Major 项。

### 已知小问题

- Vite 主 chunk 提示为既有已接受项，另开性能 / 包拆分 change 才处理。

## 数据库迁移

N/A。本任务不读写 schema、migration、RLS、RPC 或业务数据结构。

## 越界检查

```text
✅ 越界检查（R6.5）：
  - TASK write_files：2 项
  - 本任务提交涉及：2 项
  - 越界：0
  - 工作区其他历史修改：未暂存、未提交
```

## 破坏性变更

N/A。删除既有实现少于 5 行；没有删除文件、改公共导出签名、改 HTTP/API 或重命名符号。

## 决策与偏离

- 无偏离。实现与 DESIGN D1 / UI-DESIGN 5.1 一致。
- 测试额外明确“导航仍可见”，用于证明修复不是临时隐藏导航；仍属于 TASK 既定用户可观察回归约束。

## 是否触发新工作

- [ ] 触发新 fix-plan
- [ ] 触发 CONTEXT.md 更新
- [ ] 发现需求/设计问题

## 完成判定

- TASK.md 中对应任务已标记：是
- 正式 verify：2/2 PASS
- TypeScript：0 错误
- 提交 hash：`07332132e2cbb8bd700ef21e73ce5ada4189c6fd`
