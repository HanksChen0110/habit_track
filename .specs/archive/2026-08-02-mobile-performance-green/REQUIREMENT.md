# REQUIREMENT: 移动端与性能验证恢复全绿

- **Change ID**: `mobile-performance-green`
- **关联**: `@.specs/mobile-performance-green/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

- **US-1**：作为手机端用户，我想在创建习惯弹窗中正常完成保存，以便底部导航不会阻断核心记录流程。
- **US-2**：作为手机端用户，我想看到符合移动布局的账号控制和页面就绪状态，以便界面无需暴露桌面专属信息也能被可靠使用和验证。
- **US-3**：作为维护者，我想在完整测试套件中得到无并发污染的性能基线，以便性能失败代表真实回归而不是验证任务之间的资源争抢。
- **US-4**：作为维护者，我想一次运行覆盖桌面和移动端的完整自动化验证，以便只有全部真实行为通过后才提交和推送。

## 验收准则（AC）

### AC-1 · 移动账号区按既有契约可用

- **Given** 用户已登录且视口为 Playwright Pixel 7 配置（390 × 844）
- **When** 用户首次进入空白账号数据空间，或退出后使用同一账号重新登录
- **Then** 顶栏显示移动账号组、“本机数据”标识和至少 44 × 44 px 的“退出账号”按钮；桌面账号组、桌面邮箱和“本机账号数据”不要求可见
- **验证方式**: `pnpm exec playwright test tests/e2e/app.spec.ts tests/e2e/backend.spec.ts --project=mobile --workers=1`

### AC-2 · 移动端弹窗覆盖导航并可保存

- **Given** 用户在 390 × 844 移动视口打开“创建习惯”弹窗
- **When** 用户填写合法习惯名称并点击“保存习惯”
- **Then** 保存按钮接收点击而不被底部导航或其图标拦截，习惯创建成功且弹窗关闭
- **验证方式**: `pnpm exec playwright test tests/e2e/app.spec.ts --project=mobile --grep "account controls, modal focus" --workers=1`

### AC-3 · 弹窗键盘与减弱动态行为保持

- **Given** 用户启用 `prefers-reduced-motion: reduce` 并用键盘操作移动端页面
- **When** 用户打开创建习惯弹窗、按 Escape 关闭，再次打开并完成保存
- **Then** 初始焦点进入关闭按钮，Escape 关闭后焦点返回触发按钮，页面与弹窗无位移动画，保存结果 Toast 居中且按既有时限消失
- **验证方式**: `pnpm exec playwright test tests/e2e/app.spec.ts --project=mobile --grep "account controls, modal focus" --workers=1`

### AC-4 · 桌面与移动使用各自的页面就绪信号

- **Given** 当前账号包含 10 个习惯和 3,650 条完成记录
- **When** 桌面或移动项目刷新今天页并等待账号 Store 读取完成
- **Then** 两种视口均显示 10 条习惯；桌面以可见周摘要作为辅助就绪信号，移动端以可见的移动周报入口作为辅助就绪信号且桌面摘要保持隐藏；读取必须覆盖全部预期分页
- **验证方式**: `pnpm exec playwright test tests/e2e/performance.spec.ts --project=desktop --project=mobile --workers=1`

### AC-5 · 性能基线不受同类测量并发污染

- **Given** 本机 Supabase 正常运行、会话有效，且每个性能场景拥有独立账号数据
- **When** 桌面和移动性能场景以隔离、非并发方式各连续测量 20 次完整读取
- **Then** 每个受测视口均至少 19 次在 1,000 ms 内达到 AC-4 的页面就绪状态，每次读取完整 3,650 条完成记录，输出全部样本、P95、达标次数和分页证据
- **验证方式**: `pnpm exec playwright test tests/e2e/performance.spec.ts --project=desktop --project=mobile --workers=1`

### AC-6 · 完整桌面与移动 E2E 全绿

- **Given** 本地前端、Auth、Data API 和 Postgres 可用
- **When** 在当前工作树执行完整 Playwright 配置
- **Then** 24 项桌面与移动 E2E 全部通过，不允许 `skip`、`fixme`、强制点击或只执行 desktop 项目绕过失败
- **验证方式**: `pnpm test:e2e`

### AC-7 · 既有自动化与构建无回归

- **Given** 本 change 的代码和测试修改已完成
- **When** 执行项目现有类型、应用、数据库和生产构建验证
- **Then** TypeScript 0 错误、Vitest 188 项全部通过、pgTAP 174 项全部通过、生产构建成功；已知 Vite 500 kB chunk 提示不在本 change 处理范围
- **验证方式**: `pnpm typecheck && pnpm test:run && pnpm exec supabase test db --local && pnpm build`

### AC-8 · 验证门槛未被弱化

- **Given** 本 change 相对开始时的提交差异
- **When** 审查 Playwright 配置、性能测试和移动端断言
- **Then** 性能阈值仍为 20 次中至少 19 次不超过 1,000 ms；没有扩大超时来隐藏失败，没有删除移动项目或关键行为断言，也没有对被遮挡控件使用强制点击
- **验证方式**: `git diff --check && rg -n "SAMPLE_COUNT|1_000|underLimit|test\.(skip|fixme)|force:\s*true" playwright.config.ts tests/e2e`

## 范围切分

### v1（本次必做）

- 修复移动端弹窗被底部导航拦截的真实交互缺陷。
- 将账号、摘要和页面就绪断言对齐既有桌面/移动 UI 契约。
- 隔离桌面与移动的大数据性能测量，保留原有 19/20、1 秒门槛和完整分页证据。
- 完成类型检查、Vitest、pgTAP、构建和 24 项 E2E 的全绿验证。

### v2（下一轮考虑，不本次）

- 将性能基线拆成独立 CI 作业并积累多次历史趋势。
- 优化超过 500 kB 的前端主 chunk，单独建立可量化加载性能 change。
- 清理本地 E2E 运行残留的临时账号并设计自动回收策略。

### out（永远不做）

- 通过降低性能门槛、跳过移动端、删除失败测试、使用强制点击或把隐藏桌面元素强行显示在手机上制造全绿。
- 为本次测试修复新增业务功能、账号中心、第五个导航项或数据库字段。

---

## 非功能性需求

- **性能**: 10 个习惯 + 3,650 条完成记录；每个受测视口连续 20 次完整读取，至少 19 次在 1,000 ms 内达到视口就绪状态；性能场景之间不得并发争抢同一本机基线资源。
- **可访问性**: 弹窗保持 `role="dialog"`、焦点进入/圈定/恢复和 Escape 关闭；移动退出按钮触控尺寸至少 44 × 44 px；减弱动态下无位移动画。
- **安全**: 不改变认证、RLS、业务数据或凭据边界；测试账号继续使用随机临时凭据，不输出真实账号密码或 `.env.local` 内容。
- **兼容性**: Playwright Desktop Chrome 1440 × 1000 与 Pixel 7 390 × 844 两个既有项目均通过；不改变 1024 px 响应式断点。
- **可观测性**: 性能验证必须输出 20 个耗时样本、P95、达标计数、完整性计数和预期 Data API 分页范围；失败时保留 Playwright trace。

## 依赖与假设

- 依赖项目现有 React 19、React Router、Vite、Playwright、Supabase CLI 和本机 Docker 运行环境；不新增依赖。
- 依赖 `@.specs/archive/2026-08-01-local-postgres-backend/REQUIREMENT.md#AC-18` 的既有性能数据规模和阈值。
- 依赖 `@.specs/archive/2026-08-01-local-postgres-backend/UI-DESIGN.md` 已确认的响应式账号契约：桌面显示邮箱，手机只显示本机数据标识和可读名称的退出图标。
- 假设性能基线在同一台验证电脑、没有额外同类基准并发的条件下评估；全套功能 E2E 仍可并行，只有资源敏感的性能测量必须隔离。

---

> AC 是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
