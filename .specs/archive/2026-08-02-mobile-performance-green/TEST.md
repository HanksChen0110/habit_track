# TEST: 移动端与性能验证恢复全绿

- **Change ID**: `mobile-performance-green`
- **关联**: `@.specs/mobile-performance-green/REQUIREMENT.md`、`@.specs/mobile-performance-green/DESIGN.md`、`@flow-kit/reference/test-pyramid.md`
- **项目类型**: React SPA + 本地 Supabase 全栈 Web
- **执行时间**: 2026-08-02

## 0. 本次测试范围声明（5 轮金字塔）

| 轮次 | 状态 | 范围 | 裁剪理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ✅ 必跑且通过 | AC-1～AC-8、Vitest、pgTAP、desktop/mobile E2E | — |
| 第 2 轮 · 性能 | ✅ 必跑且通过 | 两视口各 20 次、3,650 条记录、分页完整性、生产包体 | REQUIREMENT 未定义 Lighthouse Web Vitals；本 change 的预算是账号数据完整读取 |
| 第 3 轮 · 安全 | ✅ 必跑且通过 | 依赖、密钥、Semgrep、OWASP 边界 | 1 个 RSC-only high 按不可达证据显式接受 |
| 第 4 轮 · 兼容 | ✅ 按需求必跑且通过 | Chromium desktop、Pixel 7、320/390/768/1024/1440 | REQUIREMENT 只承诺既有 Playwright 两项目，不扩展 Safari/Firefox |
| 第 5 轮 · 可观测 | ⚠️ 按需求部分且通过 | 性能样本、P95、完整性、分页、trace | 本地个人工具不新增生产日志平台、指标系统或告警 |

## 第 1 轮 · 功能测试

### 1.1 AC → 用例矩阵

| AC | 类型 | 用例 / 证据 | 状态 |
|---|---|---|---|
| AC-1 | E2E | `tests/e2e/app.spec.ts` empty start / re-login；`backend.spec.ts` 隔离 context | ✅ desktop/mobile |
| AC-2 | E2E | `app.spec.ts` account controls, modal focus and reduced motion | ✅ 普通 click 保存 |
| AC-3 | E2E + component | 同上；`tests/ui/App.test.tsx` | ✅ 焦点、Escape、reduce、Toast |
| AC-4 | E2E 性能 | `performance.spec.ts` 的两视口就绪与五段分页 | ✅ 20/20 完整 |
| AC-5 | E2E 性能 | `test:e2e:performance` 单 worker | ✅ 两视口均 20/20 ≤1s |
| AC-6 | E2E | `pnpm test:e2e` | ✅ 22 + 2 = 24 |
| AC-7 | 自动化门禁 | typecheck、Vitest、pgTAP、build | ✅ 0 / 188 / 174 / PASS |
| AC-8 | 静态审计 | `git diff --check` + `rg` 门槛/绕过词 | ✅ 无弱化 |

全部 AC 可自动化，本 change 无需人工 UAT 补位。

### 1.2 全量门禁

```text
pnpm typecheck                         PASS，TypeScript 0 错误
pnpm test:run                          PASS，20 files / 188 tests
pnpm exec supabase test db --local     PASS，4 files / 174 tests
pnpm build                             PASS，主 JS 516.66 kB / gzip 150.31 kB
pnpm test:e2e                          PASS，functional 22/22 + performance 2/2
git diff --check                       PASS
```

构建仍输出既有“单 chunk 大于 500 kB”提示；REQUIREMENT v2 已登记，未在本 change 扩大范围。

### 1.3 覆盖率

```text
pnpm exec vitest run --coverage
Tests       188/188
Statements  90.77% (1289/1420)
Branches    79.46% (944/1188)
Functions   92.85% (338/364)
Lines       93.63% (1163/1242)
AppStore lines 97.82%; Modal lines 100%
```

默认行覆盖 80% 与关键路径 90% 门槛均通过。分支覆盖 79.46% 作为信息保留；本 change 没有降低 Vitest 配置或覆盖门槛。

### 1.4 边界与错误路径

- 空值：空账号首次进入、空白 Store 创建首个 Habit。
- 极大值：10 Habit + 3,650 Completion，精确验证 1 + 4 个分页响应。
- 多视口边界：320、390、768、1024、1440；1024 为桌面/移动契约切换点。
- Unicode：中文 Habit、账号 UI 与 JSON 导入导出继续通过。
- 错误路径：错误密码、无效导入、Data API 写失败、离线恢复均有显式 E2E。

### 1.5 测试质量 6 维自检

| 维度 | 结果 | 证据 / 处理 |
|---|---|---|
| T1 测试晦涩 | ✅ 0 | 标题表达用户场景，失败信息附宽度/样本/P95 |
| T2 测试脆弱 | ✅ 0 | 新断言使用可访问角色、命名 group 与真实可见性，不断言 React 内部状态 |
| T3 测试重复 | 🟢 1 | `expectAccountControls` 在 app/backend 各一份；两个 spec 的 context 生命周期不同，暂不建立跨 spec 抽象，记低优先级 backlog |
| T4 Mock 滥用 | ✅ 0 | 性能与 backend 用例使用真实本地 Supabase；写失败仅在明确错误路径拦截请求 |
| T5 覆盖率幻觉 | ✅ 0 | 断言包含数据量、分页、DOM 可见性、触控尺寸和持久化结果 |
| T6 架构错配 | ✅ 0 | CSS 可见性、portal 层级和设备 context 必须由浏览器 E2E 验证 |

测试质量记事：若后续第三个 spec 需要相同账号契约，再评估提取 test-only helper；当前两处直接实现更容易保持各自上下文清晰。

## 第 2 轮 · 性能测试

### 2.1 预算与实测

| 指标 | 预算 | TEST 实测 | 上一归档基线 | 判定 |
|---|---:|---:|---:|---|
| desktop 完整读取 | 20/20 完整 | 20/20 | 20/20 | ✅ |
| desktop ≤1,000ms | ≥19/20 | 20/20，P95 385.4ms | 19/20，P95 931.7ms | ✅，P95 下降 58.6% |
| mobile 完整读取 | 20/20 完整 | 20/20 | 无同口径 | ✅ |
| mobile ≤1,000ms | ≥19/20 | 20/20，P95 238.4ms | 无同口径 | ✅ |
| 分页证据 | Habit 1 段 + Completion 4 段 | 两视口每轮精确命中五段 | 同规模 | ✅ |
| 主 JS gzip | 无本 change 预算 | 150.31 kB | 150.28 kB | ℹ️ 基本不变 |

性能输出保留全部 20 个样本、P95、达标数、完整数和五个 `Range`；失败时 Playwright 保留 trace。两项性能用例通过 `--workers=1` 串行执行。

## 第 3 轮 · 安全测试

### 3.1 依赖漏洞

```text
pnpm audit --prod --json
critical=0, high=1, moderate=0, low=0
react-router 7.18.1 / GHSA-qwww-vcr4-c8h2
```

公告说明仅影响 unstable RSC API；当前 `src`、`tests`、Vite 配置与 package 关键字可达性扫描为 0。沿用已归档接受：不为不可达告警执行 React Router 7→8 主版本升级；引入 RSC 前必须先升级并复测。

### 3.2 密钥与 SAST

```text
当前 tracked 高风险密钥文件：0
Git 历史高风险密钥路径：0
Semgrep configs: p/typescript + p/react + p/secrets
Targets: 34 tracked files; Rules: 110; Findings: 0
```

扫描未读取或输出 `.env.local` 内容。

### 3.3 OWASP Top 10

| 项 | 状态 | 说明 |
|---|---|---|
| A01 越权 | ✅ | pgTAP 174 与跨账号 E2E 继续验证 RLS/隔离 |
| A02 加密失败 | ✅ | 高权限密钥扫描 0；未改凭据边界 |
| A03 注入 | ✅ | 结构化 Supabase API；Semgrep 0 |
| A04 不安全设计 | ✅ | 保存等待真实后端结果；测试不以 force 绕过 |
| A05 配置错误 | ✅ | typecheck/build/本地数据库测试通过 |
| A06 漏洞组件 | ✅ 已接受 | 1 个 RSC-only high 有不可达证据与触发升级条件 |
| A07 鉴权 | ✅ | 错误登录、退出、重登、同/异账号均通过 |
| A08 数据完整性 | ✅ | 3,650 条完整读取与精确分页；写失败不污染 UI |
| A09 日志监控 | ⚠️ | 见第 5 轮；本 change 仅要求测试可观测证据 |
| A10 SSRF | N/A | SPA 不接受服务端 URL 或发起服务器侧请求 |

## 第 4 轮 · 兼容性测试

| 项 | 结果 | 说明 |
|---|---|---|
| Desktop Chromium 1440 × 1000 | ✅ | 11 功能 + 1 性能 |
| Pixel 7 Chromium 390 × 844 | ✅ | 11 功能 + 1 性能，手工 context 继承设备参数 |
| 320 / 390 / 768 / 1024 / 1440 | ✅ | 导航、横向溢出、44px 触控区与关键页面 |
| reduced-motion | ✅ | 无位移动画；Toast 时限保持 |
| 数据 migration | N/A | 本 change 无 schema、migration、RLS 或 RPC 变更 |
| Store / 编码兼容 | ✅ | JSON 导入导出、中文数据与旧 Store 回归通过 |

Firefox、Safari、真机 iOS/Android 不在 REQUIREMENT 的兼容范围，未用 Chromium 结果冒充这些浏览器。

## 第 5 轮 · 可观测性验证

| 项 | 状态 | 说明 |
|---|---|---|
| 性能样本与 P95 | ✅ | 两视口各输出 20 个样本、P95、达标数 |
| 数据完整性 | ✅ | 输出完整行数与五段 Data API 分页范围 |
| 失败定位 | ✅ | Playwright `trace: retain-on-failure`；错误路径有用户可见状态 |
| PII / 密钥日志 | ✅ | 扫描 0；性能日志只含计时和范围 |
| 生产指标 / trace-id / 告警 | N/A | 本地个人工具且 REQUIREMENT 不新增外部遥测或生产服务 |

## 新增 / 修复测试登记

| 用例文件 | 类型 | 覆盖 AC | 说明 |
|---|---|---|---|
| `tests/e2e/app.spec.ts` | E2E | AC-1～AC-3、AC-6、AC-8 | 响应式账号、真实保存、焦点与视口回归 |
| `tests/e2e/backend.spec.ts` | E2E | AC-1、AC-6 | 手工隔离 context 继承 desktop/mobile 设备 |
| `tests/e2e/performance.spec.ts` | E2E/性能 | AC-4～AC-5、AC-8 | 视口就绪、20 次完整读取、精确分页 |

## TEST 结论

五轮适用范围全部通过；无 Critical/Major 测试缺口。允许进入 REVIEW。唯一已知接受项为不可达的 React Router RSC-only high，触发条件与处理边界已明确。
