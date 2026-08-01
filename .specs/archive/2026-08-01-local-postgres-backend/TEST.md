# TEST: 为循迹接入本地 Postgres 后端

- **Change ID**：`local-postgres-backend`
- **关联**：`@.specs/local-postgres-backend/REQUIREMENT.md`、`@.specs/local-postgres-backend/DESIGN.md`、`@flow-kit/reference/test-pyramid.md`
- **项目类型**：个人本地内部工具 / 全栈 Web
- **执行日期**：2026-08-01
- **最终结论**：✅ 本 change 已确认范围全部通过；可进入 REVIEW

---

## 0. 本次测试范围声明（5 轮金字塔）

| 轮次 | 状态 | 范围 | 裁剪理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ✅ 必跑且通过 | AC-1～AC-19、单元/组件/Repository/数据库/E2E/UAT | — |
| 第 2 轮 · 性能 | ✅ 必跑且通过 | 3650 条 Completion 的 20 次完整读取、分页完整性、生产构建主包 | REQUIREMENT 未定义 Lighthouse Web Vitals 预算；本 change 的性能契约是账号数据读取 |
| 第 3 轮 · 安全 | ✅ 必跑且通过 | 依赖、工作区及 Git 历史密钥、Semgrep、RLS/越权、OWASP | 依赖审计 1 个 RSC-only high 已完成不可达性接受，不按噪音忽略 |
| 第 4 轮 · 兼容 | ✅ 必跑且通过 | Windows 真实 Chrome↔Edge、320/390/768/1024/1440、up→down→up、Store v1 | 产品验收只承诺本机 Chrome 与 Edge；Firefox/Safari、真机移动端不在本 change 范围 |
| 第 5 轮 · 可观测 | ✅ 按需求裁剪且通过 | UI 可读错误类别、测试阶段/耗时、Auth health、无敏感日志 | REQUIREMENT 明确不新增外部埋点；单机本地工具不引入日志平台、trace、告警系统 |

---

## 第 1 轮 · 功能测试

### 1.1 测试矩阵（AC → 用例）

| AC | 证据 | 状态 |
|---|---|---|
| AC-1～AC-3 | `tests/ui/AuthContext.test.tsx`、`tests/ui/AuthGate.test.tsx`、`tests/e2e/app.spec.ts` | ✅ |
| AC-4～AC-6 | `tests/e2e/backend.spec.ts`、真实 Chrome↔Edge UAT-1 | ✅ |
| AC-7～AC-8 | `supabase/tests/database/001_schema_rls.sql`、`002_replace_user_store.sql`、`003_user_id_defaults.sql`、`tests/e2e/backend.spec.ts` | ✅ |
| AC-9～AC-10 | 既有领域/UI 回归、`tests/e2e/app.spec.ts` | ✅ |
| AC-11～AC-14 | `tests/data/repository.test.ts`、`tests/ui/ManageRecovery.test.tsx`、`tests/e2e/app.spec.ts`、`tests/e2e/backend.spec.ts` | ✅ |
| AC-15～AC-17 | `tests/ui/AppStoreWrites.test.tsx`、`tests/ui/AppStoreSession.test.tsx`、`tests/e2e/app.spec.ts` | ✅ |
| AC-18 | `tests/e2e/performance.spec.ts` | ✅ |
| AC-19 | `tests/data/supabase-client.test.ts`、`src`/`dist` 高权限凭据扫描 | ✅ |

自动化汇总：

```text
Vitest:       20 files, 188/188 PASS
pgTAP:         4 files, 174/174 PASS
Playwright:   12/12 PASS（desktop：app + backend + performance）
TypeScript:   PASS
Vite build:   PASS
```

### 1.2 UAT 脚本

#### UAT-1 · 同一账号在真实 Chrome 与 Edge 共享 Postgres 数据

- **前置**：本机 Supabase 已启动；Vite production preview 运行于 `127.0.0.1:4173`；使用运行时生成的非真实邮箱和密码。
- **步骤**：
  1. 用 `C:\Program Files\Google\Chrome\Application\chrome.exe` 创建账号和目标为 3 的习惯，并打卡到 1/3。
  2. 用 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` 登录同一账号，读取到 1/3。
  3. 在 Edge 打卡到 2/3，刷新 Chrome。
- **期望**：Edge 首次读取 1/3；Chrome 刷新后读取 2/3；两个浏览器没有共享 localStorage。
- **实际**：PASS；`sameAccountRead=true`、`reverseWriteRefresh=true`。
- **环境**：Google Chrome 150.0.7871.187；Microsoft Edge 133.0.3065.51；Windows。
- **执行人 / 时间**：Codex / 2026-08-01。

#### UAT-2 · 失败、恢复与旧功能回归

- **步骤**：自动化执行登录失败、退出再登录、写入中断、非法/取消/有效导入、完整导出、最近 7 天纠正、周报、洞察、归档、PWA 离线壳和响应式用例。
- **期望**：失败不伪造成功、不回退 localStorage；已确认数据保留；旧功能不退化。
- **实际**：Playwright 12/12 PASS；Vitest 188/188 PASS。

### 1.3 覆盖率

```text
Statements : 90.77% (1289/1420)
Branches   : 79.37% (943/1188)
Functions  : 92.85% (338/364)
Lines      : 93.63% (1163/1242)
core src/app: 97.82% lines
core src/data: 100% lines
```

- 默认行覆盖门槛 80%：✅ 93.63%。
- core 90% 门槛：✅ `src/app` 97.82%、`src/data` 100%。
- 分支覆盖 79.34% 未作为本项目门槛；关键账号状态和 Repository 错误分支另有 E2E/pgTAP 证据。

### 1.4 边界 / 错误路径

- 空、null、undefined、未初始化 Store：Repository 与 AppStore 测试覆盖。
- 极大输入：10 个 Habit、3650 条 Completion；5 页 Data API 响应无遗漏。
- Unicode / 特殊字符：中文 UI、中文 Habit 名、Store v1 编解码覆盖。
- 错误路径：错误密码、无会话、读超时、写入网络失败、非法/取消导入、跨账号伪造所有权、离线业务写入均覆盖。

### 1.5 测试质量自检（T1～T6）

| 编号 | 风险 | 命中文件数 | 结论 |
|---|---|---:|---|
| T1 | Test Obscurity | 0 | 用例名称描述业务结果，性能用例输出完整样本 |
| T2 | Test Brittleness | 0 | `only/skip/todo` 0；固定 `waitForTimeout` 0 |
| T3 | Test Duplication | 0 | UI helper 与 E2E helper 各自限定层级，没有跨层复制断言实现 |
| T4 | Mock Abuse | 1 | 🟡 `tests/ui/AuthGate.test.tsx` 隔离路由时 mock 7 个边界模块；真实 pgTAP/E2E 已覆盖整链路 |
| T5 | Coverage Illusion | 0 | 每个 AC 有行为断言；不是只靠行覆盖率 |
| T6 | Architecture Mismatch | 0 | Vitest 测组件/边界，pgTAP 测 RLS/RPC，Playwright 测真实浏览器链路 |

测试质量记事：T4 为组件隔离取舍，不阻塞本 change；若 AuthGate 继续扩张，后续 change 应拆成更窄的路由状态测试，避免 mock 列表继续增长。

---

## 第 2 轮 · 性能测试

### 2.1 预算

```yaml
account_store_read:
  dataset: 10 habits + 3650 completions
  samples: 20 after warmup
  success: at least 19 samples <= 1000ms
  completeness: every sample must include all records
frontend:
  main_bundle_default_reference: < 200KiB gzip
```

### 2.2 实测

| 指标 | 预算 | 实测 | 上版基线 | 判定 |
|---|---:|---:|---:|---|
| 完整读取 ≤1s | ≥19/20 | 19/20 | N/A（首次账号后端基线） | ✅，达到下限 |
| 完整读取 P95 | ≤1000ms | 931.7ms | N/A（首次账号后端基线） | ✅，距阈值 68.3ms |
| 分页完整性 | 20/20 | 20/20；10 Habit + 3650 Completion | N/A（旧版无账号后端） | ✅ |
| Data API 分页 | 不遗漏 | Habit 1 页；Completion 4 页（1000/1000/1000/650） | N/A（旧版无 Data API） | ✅ |
| 主 JS gzip | 默认参考 <200KiB | 150.28KiB | 待确认（旧构建未留基线） | ✅ 对预算；无法判断相对退步 |
| 主 CSS gzip | 无硬预算 | 53.49KiB | 待确认（旧构建未留基线） | 记录值 |

注：最终 INTEGRATION 并行执行完整 E2E 时有 1/20 样本为 1059.4ms，19/20 达标且 P95 931.7ms，满足 REQUIREMENT 的硬门槛；主 JS 有 Vite `>500kB` 原始体积警告，gzip 未超默认参考值，记为非阻塞优化项。

---

## 第 3 轮 · 安全测试

### 3.1 依赖漏洞

```text
pnpm audit --prod --json
critical=0, high=1, moderate=0, low=0
package=react-router 7.18.1
advisory=GHSA-qwww-vcr4-c8h2
```

- 上游公告明确该 CSRF 问题只影响 unstable RSC API：<https://github.com/advisories/GHSA-qwww-vcr4-c8h2>。
- 仓库可达性扫描：RSC API 0、`use server` 0、`@vitejs/plugin-rsc` 0；项目使用 Vite SPA 声明式路由，没有 server action/RSC request handler。
- **处理**：显式接受为不可达依赖告警；不为此执行 React Router 7→8 主版本升级。若未来引入 RSC，必须先升级至已修复版本并重新测试。

### 3.2 密钥扫描

```text
Semgrep p/secrets + 受控正则扫描：
工作区可疑私钥/JWT/live key 文件 = 0
Git 历史可疑密钥命中 = 0
src + dist 高权限凭据命中文件 = 0
```

`service_role` 字面量仅出现在 Supabase 配置注释和“拒绝高权限变量”的测试夹具中，不是凭据。

### 3.3 SAST

```text
Semgrep 1.172.0（隔离 uvx 运行）
configs: p/typescript, p/react, p/secrets
targets: 38 tracked files
rules: 110
findings: 0
```

补充规则：`dangerouslySetInnerHTML`/`innerHTML=` 0、`eval`/`new Function` 0、Node child process 0。

### 3.4 OWASP Top 10

| 项 | 状态 | 证据 |
|---|---|---|
| A01 越权 | ✅ 已测 | 强制 RLS、A/B 同键隔离、伪造 user_id 拒绝、anon 无权限 |
| A02 加密失败 | ✅ 已测 | 客户端仅 publishable key；高权限凭据扫描 0；本地 HTTP 仅回环地址 |
| A03 注入 | ✅ 已测 | 结构化 Supabase API、RPC JSON 结构校验、Semgrep 0 |
| A04 不安全设计 | ✅ 已测 | 服务端确认后更新 UI；原子替换；失败不降级 localStorage |
| A05 配置错误 | ✅ 已测 | 缺配置可分类失败；客户端构建无高权限密钥 |
| A06 漏洞组件 | ✅ 已处理 | RSC-only high 有不可达证明与触发升级条件 |
| A07 鉴权 | ✅ 已测 | 注册、错误登录、恢复、退出、切账号、无会话 |
| A08 数据完整性 | ✅ 已测 | FK/PK/check、Store v1 校验、原子 import、up/down/up |
| A09 日志监控 | ✅ 按范围 | 见第 5 轮；不新增外部遥测 |
| A10 SSRF | 不适用 | 客户端只连接固定配置的本机 Supabase；无服务端 URL 抓取入口 |

---

## 第 4 轮 · 兼容性测试

### 4.1 浏览器与视口

| 环境 | 实测 | 状态 |
|---|---|---|
| Windows Chrome 150 | 创建账号、写入 1/3、刷新读取 Edge 更新 | ✅ |
| Windows Edge 133 | 同账号登录读取 1/3、更新到 2/3 | ✅ |
| Playwright Chromium | 全链路 12/12 | ✅ |
| 320 / 390 / 768 / 1024 / 1440 | 无水平溢出、导航形态、44px 触控、焦点/减弱动效 | ✅ |
| Firefox / Safari / 真机移动 | 未跑 | 不在 REQUIREMENT 的 Windows Chrome/Edge 本地验收范围 |

### 4.2 数据迁移

- [x] migration 路径已由 T01、T02、T-FIX-01、T12 SUMMARY trace。
- [x] 空库重放 4 个 migration：35 秒（含本地容器重启），全部成功。
- [x] 可执行 down：`@supabase/rollback/local_postgres_backend.down.sql`。
- [x] up→down→catalog 4/4 对象消失→up→pgTAP 174/174。
- [x] down 不触碰 auth schema 或 Supabase 内置对象。
- [ ] 生产快照预演：N/A；本 change 是未上线的本地初始 schema，没有生产实例或生产数据。
- [ ] 双写/灰度：N/A；一次性从非权威 localStorage 切到新账号空间，旧键明确保持原样但不读写。

### 4.3 跨版本 / 编码

- Store v1 导入导出继续兼容；旧 `xunji.store.v1` 保持原样且不作为账号数据来源。
- 旧 schema：N/A；这是三张业务表的初始 schema。
- API：同一版本本地 Supabase Auth/Data API；无公开 v1/v2 API 契约。
- UTF-8 中文账号 UI、Habit 名与 JSON 备份通过；UTF-16 不属于 JSON/数据库契约。

---

## 第 5 轮 · 可观测性验证

### 5.1 已验证

- UI 对登录、会话恢复、读取、写入、导入失败显示稳定且可读的类别；失败不显示“已保存”。
- 性能测试输出 20 个样本、P95、完整样本数、≤1s 数和预期分页范围。
- E2E/单测使用非真实随机账号；日志不打印密码、token 或 session。
- 工作区、构建产物和 Git 历史敏感值扫描为 0。
- Supabase Auth health：HTTP 200、`application/json`。

### 5.2 按 REQUIREMENT 明确不新增

- 外部日志聚合、业务埋点/RUM、RED/USE 指标、分布式 trace、PagerDuty/告警/runbook。
- 原因：个人本机工具没有生产服务或 on-call；新增外部遥测与 REQUIREMENT“不得新增外部埋点”冲突。
- 若后续部署共享/远程环境，应另开 change 补 health readiness、结构化服务端日志、请求关联 ID 和告警。

### 5.3 可观测性逐项清单

| 项 | 状态 | 说明 |
|---|---|---|
| 登录/恢复/读取/写入/导入异常可定位 | ✅ | UI 稳定错误类别 + 对应单测/E2E 阶段名称 |
| 性能耗时与失败阶段 | ✅ | 20 个样本、P95、完整性、分页范围 |
| 日志不含 PII/密码/token | ✅ | 随机假账号；密钥扫描 0；认证上下文不暴露 session |
| 健康检查 | ✅ | 本机 Auth health HTTP 200；无独立应用服务器可拆 liveness/readiness |
| 结构化集中日志 + trace-id | N/A | 无生产服务；引入外部收集与本 change 边界冲突 |
| 业务/RED/USE 指标 | N/A | REQUIREMENT 明确不新增外部埋点 |
| 分布式 trace | N/A | 无分布式服务调用 |
| 告警 + runbook | N/A | 个人本机工具，无 on-call 或生产告警目标 |

---

## 新增测试登记

| 用例文件 | 类型 | 覆盖 AC | 轮次 |
|---|---|---|---|
| `supabase/tests/database/001_schema_rls.sql` | pgTAP | AC-7、AC-8、AC-19 | 1、3 |
| `supabase/tests/database/002_replace_user_store.sql` | pgTAP | AC-10、AC-12、AC-13 | 1、3 |
| `supabase/tests/database/003_user_id_defaults.sql` | pgTAP | AC-7、AC-15 | 1、3 |
| `supabase/tests/database/004_replace_user_store_result.sql` | pgTAP | AC-12、AC-15 | 1、3 |
| `tests/data/supabase-client.test.ts` | unit | AC-19 | 1、3 |
| `tests/data/supabase-repository*.test.ts` | unit/integration | AC-3～AC-8、AC-11、AC-15、AC-18 | 1 |
| `tests/ui/AuthContext.test.tsx`、`AuthGate.test.tsx` | component | AC-1～AC-3、AC-8、AC-15、AC-17 | 1、5 |
| `tests/ui/AppStoreSession.test.tsx`、`AppStoreWrites.test.tsx` | component | AC-3、AC-6、AC-9～AC-16 | 1、5 |
| `tests/ui/ManageRecovery.test.tsx`、`TodayPage.test.tsx` | component | AC-9、AC-11～AC-17 | 1 |
| `tests/e2e/app.spec.ts` | E2E | AC-1～AC-3、AC-9～AC-17、AC-19 | 1、4、5 |
| `tests/e2e/backend.spec.ts` | E2E | AC-4～AC-8、AC-11～AC-15 | 1、3、4 |
| `tests/e2e/performance.spec.ts` | benchmark E2E | AC-18 | 2 |
| `supabase/rollback/local_postgres_backend.down.sql` | migration UAT | schema rollback | 4 |

## 回归保护

- 创建习惯、当天打卡、最近 7 天纠正、周报、洞察、归档、示例数据、完整导入导出、刷新持久化和 PWA 离线壳均已回归。
- 结果：Vitest 188/188、Playwright 12/12、pgTAP 174/174，全部通过。
- 非阻塞记事：主 JS 原始体积 516.51kB 触发 Vite warning；依赖审计保留 1 个 RSC-only 不可达 high；AuthGate mock 边界若继续扩大需在后续 change 收窄。
