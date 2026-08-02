# REVIEW: 移动端与性能验证恢复全绿

- **Change ID**: `mobile-performance-green`
- **审查时间**: 2026-08-02 11:05 +08:00
- **审查者**: AI（Reviewer）
- **审查范围**: `0609124..c9eab62`，5 个实现/测试文件，92 additions / 23 deletions
- **总体结论**: APPROVED

## 第一轮 · Spec 合规审查

| 检查项 | 结果 | 证据 |
|---|---|---|
| AC-1 响应式账号区 | ✅ | `tests/e2e/app.spec.ts:30-51`、`tests/e2e/backend.spec.ts:14-35` |
| AC-2 弹窗覆盖与真实保存 | ✅ | `src/components/Modal.tsx:64-80`；`tests/e2e/app.spec.ts:300-345` |
| AC-3 焦点 / Escape / reduced-motion | ✅ | Modal 原有 effect 未改变；`tests/ui/App.test.tsx:256`、`tests/e2e/app.spec.ts:300-345` |
| AC-4 视口就绪 | ✅ | `tests/e2e/performance.spec.ts:28-38` |
| AC-5 性能隔离 | ✅ | `package.json:14-16`；TEST 两视口均 20/20 ≤1,000ms |
| AC-6 完整 E2E | ✅ | `@.specs/mobile-performance-green/TEST.md`：22 + 2 = 24 |
| AC-7 无回归 | ✅ | TypeScript 0、Vitest 188、pgTAP 174、build PASS |
| AC-8 门槛未弱化 | ✅ | `SAMPLE_COUNT=20`、`SAMPLE_LIMIT_MS=1000`、`underLimit >=19`；无 skip/fixme/force |
| 未引入 out / 范围蔓延 | ✅ | 无 CSS、文案、断点、schema、migration、依赖或业务功能变更 |
| 未越过 DESIGN 边界 | ✅ | 实际 5 文件均在 DESIGN 触碰范围；三个任务提交边界与 TASK 一致 |

审查时发现 TEST 的 AC-3 组件测试路径索引写错；已把不存在的 `tests/components/Modal.test.tsx` 更正为实际的 `tests/ui/App.test.tsx`。这是报告引用修正，不是实现或测试缺口。

**Spec 合规结论**: 通过。

## 第二轮 · 代码质量审查

### 2.0 TEST 五轮完整性

| 轮次 | 状态 | 审查结果 |
|---|---|---|
| 功能 | ✅ | AC-1～AC-8 均有自动化证据；覆盖率与错误边界已列 |
| 性能 | ✅ | 预算、实测、上版基线与判定齐全 |
| 安全 | ✅ | 依赖、密钥、SAST、OWASP 齐全；RSC-only high 有不可达证据 |
| 兼容 | ✅ | 两项目与五档视口；无 migration 如实标 N/A |
| 可观测 | ⚠️ 合规 | 按本地工具范围裁剪；样本、P95、分页、trace 可重复 |

### 2.1 关键风险清单

- SQL / Data Safety：N/A，本 diff 无 SQL、schema 或数据写实现。
- Race / Concurrency：无生产并发变更；性能测量通过脚本分段消除测试资源争用。
- LLM trust / shell injection / enum completeness：N/A，本 diff 无对应边界。
- Frontend：portal 保留 React context、原 Modal API、事件与焦点生命周期；只改变物理 DOM 挂载点。
- Distribution：package script 使用项目既有 pnpm / Playwright，Windows 本机全量执行通过。

### 2.2 六维衰退风险（内置回退）

#### 🟢 R1 · Cognitive Overload：局部 helper 规模可读

**Symptom**：`expectAccountControls`、`expectViewportReady` 与 `projectContextOptions` 各自只表达一项测试契约。
**Source**：Ousterhout · *A Philosophy of Software Design* · Deep Modules。
**Consequence**：读取者无需追踪生产内部状态即可判断视口条件与期望 UI。
**Remedy**：无需修改；保持 helper 单一职责。

#### 🟢 R2 · Change Propagation：生产改动集中在公共 Modal

**Symptom**：`src/components/Modal.tsx:64` 一处挂载边界修复覆盖所有调用者，调用 API 与 CSS 均未变化。
**Source**：Fowler · *Refactoring* · Divergent Change。
**Consequence**：页面无需分别修 z-index 或隐藏导航，回归面限于既有 Modal 行为。
**Remedy**：无需修改。

#### 🟢 R3 · Knowledge Duplication：测试契约有受控重复

**Symptom**：app/backend 两个独立 spec 各自保留账号可见性 helper，1024px 契约同时出现在响应式与性能测试。
**Source**：Hunt & Thomas · *The Pragmatic Programmer* · DRY。
**Consequence**：未来断点变化需同步更新 UI-DESIGN 与三处测试；当前重复直接对应不同 context 生命周期，未产生冲突。
**Remedy**：不在两处使用时提前抽象；若出现第三个账号 spec，再提取 test-only contract helper。

#### 🟢 R4 · Accidental Complexity：没有外部基准编排器

**Symptom**：`package.json:14-16` 用三个脚本完成 22 项功能并行 + 2 项性能串行。
**Source**：Brooks · *No Silver Bullet* · Accidental Complexity。
**Consequence**：任一阶段非零即主命令失败，同时避免新增 runner、配置或依赖。
**Remedy**：无需修改。

#### 🟢 R5 · Dependency Disorder：依赖方向未变化

**Symptom**：生产组件只新增既有 `react-dom` 的 `createPortal`；测试只依赖 Playwright 公共 API。
**Source**：Martin · *Clean Architecture* · Dependency Rule。
**Consequence**：领域层、数据层和页面没有反向依赖测试或浏览器实现。
**Remedy**：无需修改。

#### 🟢 R6 · Domain Model Distortion：测试名称与用户行为一致

**Symptom**：账号、弹窗、数据完整读取和性能样本都以用户可见 UI 与真实 Data API 响应定义。
**Source**：Evans · *Domain-Driven Design* · Ubiquitous Language。
**Consequence**：测试不会因 React 内部重构而误报，失败直接对应用户行为或数据完整性。
**Remedy**：无需修改。

### 2.3 架构检查

未触发大型架构审计：没有新顶级模块、服务、中间件、migration 或跨五模块重构。依赖保持 `TodayPage state → Modal → React portal → document.body`，业务状态不进入 Modal。

## 第三轮 · UI 视觉与无障碍审查

| 检查项 | 结果 | 证据 |
|---|---|---|
| token / 字体 /颜色 / 间距 | ✅ | 本 diff 无 CSS 或 token 变更 |
| UI anti-pattern | ✅ | 无新字体、颜色、阴影、边框、布局、文案或动效 |
| 美学北极星 | ✅ | portal 实现 UI-DESIGN 的 Quiet Physical Layer；截图保持既有安静、克制界面 |
| 键盘与焦点 | ✅ | 初始焦点、Escape、恢复与焦点圈定回归通过 |
| reduced-motion | ✅ | page/Modal 无位移动画；Toast 时限通过 |
| 触控与层级 | ✅ | mobile 退出按钮 ≥44 × 44；普通保存 click 不被层级 10 导航拦截 |
| 视口 | ✅ | 320/390/768/1024/1440 无横向溢出；desktop/mobile 截图已人工检查 |

`src/styles.css` 中既有 brownfield 纯白表面、同字体层级与静态面板处理已在 UI-DESIGN 明确接受；本 diff 未扩大这些例外，因此不作为本次发现。

## 第四轮 · 补充审查

- 技术债评估：未触发；本 change 不是里程碑、重构或季度版本。
- 跨模型 spot-check：未触发强制条件；没有生产认证、安全、分布式并发或 >80 行新函数，覆盖率没有下降证据。
- 本地 `review` skill 的 specialist/subagent 分派未执行：当前会话策略禁止在用户未明确要求时生成子代理；主审已按同一 checklist 本地完成。

## 发现与处置

- Critical：0
- Major：0
- Minor：0 个需修项
- 报告引用更正：1（已更正 TEST 的实际组件测试路径）
- Fix task：0

## REVIEW 结论

APPROVED。实现满足 AC-1～AC-8，测试门槛未弱化，无阻塞项，可进入 INTEGRATION。
