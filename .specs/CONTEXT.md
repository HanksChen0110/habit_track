# CONTEXT — 项目共享上下文

> 本文件跨 change 长期使用，只记录已经由项目文件、代码或当前用户确认的事实。
> 业务与验收规则以 OpenSpec 为准；本文负责告诉后续 AI 应遵守什么、现有抽象在哪里。
> 首次整理：2026-07-31（I-intel-scan，老项目入场扫描）。

---

## 源文档与证据优先级

1. **业务、数据和统计规则**：`@openspec/changes/build-habit-review-mvp/design.md`、同目录能力 `spec.md`；洞察补充规则来自 `@openspec/changes/add-insights-dashboard/`。— 来源：`@AGENTS.md:12`、`@openspec/changes/build-habit-review-mvp/proposal.md:31-33`
2. **UI / UE 权威基线**：`@openspec/changes/build-habit-review-mvp/UI-spec.md`；它已标记“已确认并实现”。— 来源：`@openspec/changes/build-habit-review-mvp/UI-spec.md:3-5`
3. **项目协作规则**：`@AGENTS.md` 与 `@CLAUDE.md`；两份当前内容一致，修改任一份后必须同步核验。— 来源：`@AGENTS.md:1-4`
4. **当前实现事实**：`@src/`、`@tests/`、`@package.json`、构建与测试配置。文档与代码冲突时，不把已经被代码和更新规格替代的历史描述迁入本文。
5. **历史材料**：`@docs/` 与 `.superpowers/` 只用于解释来路或提供评审证据；不得覆盖上述当前规格。— 来源：`@AGENTS.md:14-18`

## 项目概要

“循迹”是面向单个个人用户的本地优先习惯记录与复盘 PWA。用户创建每日目标习惯、记录或纠正完成量、查看自然周复盘及长期洞察，并通过 JSON 导入导出备份数据。当前源码仍只使用浏览器 `localStorage`；项目级目标架构已确认改为本机 Supabase Auth + Postgres，以验证同一台电脑上同一账号跨浏览器读取同一份数据。产品仍只呈现执行事实，不推断未完成原因。— 来源：`@AGENTS.md:6-12`、`@src/data/repository.ts:11-72`、`@.specs/ARCHITECTURE.md#adr-006--使用本地-supabase-作为账号与数据后端`、用户于 2026-07-31 确认

## 技术栈（团队级默认 / 当前已实现）

| 类别 | 当前事实 | 来源 |
|---|---|---|
| 语言 / 运行时 | TypeScript；编译目标 ES2022；Node.js 版本未声明，待确认 | `@tsconfig.app.json:2-17`、`@package.json:1-6` |
| 包管理 | pnpm 10.14.0 | `@package.json:6` |
| 前端框架 | React 19 + React DOM + React Router；HashRouter 路由 | `@package.json:16-21`、`@src/App.tsx:1-42` |
| 构建 / PWA | Vite 8 + `vite-plugin-pwa`；静态客户端应用壳 | `@package.json:31-36`、`@vite.config.ts:1-29` |
| UI 依赖 | 项目内 Noto Sans SC Variable；Lucide 图标；原生 CSS / SVG | `@package.json:17-21`、`@src/main.tsx:1-10`、`@openspec/changes/build-habit-review-mvp/UI-spec.md:41-48` |
| 后端 / 数据库 | 当前实现仍是 `localStorage`；已接受的目标栈为项目内 Supabase CLI + Supabase JS、本地 Auth / Data API / Postgres。尚无业务 migration，`src/` 尚未接入 | `@src/data/repository.ts:11-37`、`@package.json:16-35`、`@supabase/config.toml`、`@.specs/ARCHITECTURE.md#adr-006--使用本地-supabase-作为账号与数据后端` |
| 测试 | Vitest + Testing Library + Playwright | `@package.json:7-14`、`@package.json:23-36`、`@playwright.config.ts:1-19` |
| 部署 | 可静态构建；实际托管平台待确认 | `@package.json:7-14`、`@openspec/changes/build-habit-review-mvp/design.md:147-149` |
| 栈卡片编号 | 2️⃣ Vite + React 前后端分离 SPA 的既有项目裁剪版；后端由本地 Supabase 提供，不另建 Node API | `@.specs/local-postgres-backend/DESIGN.md#0-技术栈选定`、用户确认 |

## 域语言（术语表）

| 术语 | 定义 | 来源 |
|---|---|---|
| 循迹 | 当前习惯记录与复盘应用名称 | `@README.md:1-3` |
| Store v1 | 仅含 `version: 1`、`habits`、`completions` 的领域投影与 JSON 导入导出格式；目标架构下不再是 localStorage 权威快照 | `@src/domain/types.ts:17-21`、`@.specs/ARCHITECTURE.md#adr-007--账号隔离的关系型持久化与-rls` |
| 账号数据空间 | 由当前已登录账号拥有的全部 Habit 与 Completion；其他账号及未登录访问者不得读取或修改 | `@.specs/local-postgres-backend/REQUIREMENT.md:62-74` |
| 后端不可用 | 本地 Auth、Data API 或 Postgres 任一不可访问，导致账号业务数据无法可靠读取或写入的状态 | `@.specs/local-postgres-backend/REQUIREMENT.md:118-130` |
| 服务端确认状态 | 已由 Postgres 成功持久化并可在重新读取后恢复的数据；只有该状态可以向用户显示为“已保存” | `@.specs/local-postgres-backend/REQUIREMENT.md:118-123` |
| Habit | 每日目标习惯，包含名称、每日目标、创建日和可空归档日 | `@src/domain/types.ts:3-9` |
| Completion | 某习惯在某本地自然日的完成次数；`(habitId, date)` 唯一 | `@src/domain/types.ts:11-15`、`@openspec/changes/build-habit-review-mvp/design.md:35-39` |
| 本地自然日 | 浏览器本地日历日，格式为 `YYYY-MM-DD`，不使用 UTC 日期替代 | `@openspec/changes/build-habit-review-mvp/specs/weekly-execution-review/spec.md:3-12`、`@src/domain/dates.ts:3-25` |
| activeOn(date) | 习惯在创建日至归档日（均含）有效；归档次日起失效 | `@openspec/changes/build-habit-review-mvp/specs/habit-lifecycle-and-recording/spec.md:14-23`、`@src/domain/store.ts:15-20` |
| 修正漏记 | 仅允许修改今天减 6 天至今天（含）范围内、当日有效习惯的记录 | `@openspec/changes/build-habit-review-mvp/specs/habit-lifecycle-and-recording/spec.md:40-49` |
| 自然周 | 周一至周日；当前周只统计周一至今天，已结束周统计七天 | `@openspec/changes/build-habit-review-mvp/specs/weekly-execution-review/spec.md:3-12` |
| 整体执行率 | 有效习惯日实际完成量总和除以计划完成量总和；部分完成计入 | `@openspec/changes/build-habit-review-mvp/specs/weekly-execution-review/spec.md:14-27` |
| 洞察观察窗口 | 截止到昨天的连续 7、30 或 90 个本地自然日 | `@openspec/changes/add-insights-dashboard/specs/long-term-habit-insights/spec.md:10-15` |
| 同日共现 | 只在两项习惯共同有效的日期比较同时达标、同时未达标或表现相反；不代表因果 | `@openspec/changes/add-insights-dashboard/specs/long-term-habit-insights/spec.md:31-44` |
| 样本等级 | 少于 7 天为积累中，7–13 天为初步线索，至少 14 天才可参与排序 | `@src/domain/coOccurrence.ts:17-18`、`@openspec/changes/add-insights-dashboard/specs/long-term-habit-insights/spec.md:34-44` |

## 已锁决策

- `[2026-07-25]` UI / UE 参数统一以 `UI-spec.md` 为当前基线；设计说明和参考包只能补充，不能覆盖它。— 来源：`@openspec/changes/build-habit-review-mvp/UI-spec.md:3-5`、Git `2b369e0`
- `[2026-07-25]` 洞察保持 Store v1，图表使用原生 SVG / CSS，不迁移 Tailwind 或 shadcn。— 来源：`@openspec/changes/add-insights-dashboard/design.md:1-4`
- `[2026-07-31]` 项目级目标架构采用本地 Supabase Auth + Data API + Postgres；本轮只验证同一台电脑两个浏览器使用同一邮箱密码账号读取同一份数据，不接公网服务。— 来源：`@.specs/ARCHITECTURE.md#adr-006--使用本地-supabase-作为账号与数据后端`、用户确认
- `[2026-07-31]` Habit / Completion 以关联 `user_id` 的关系表持久化并启用 RLS；Postgres 是业务数据唯一真相源，页面不得直接访问 Supabase 或业务 localStorage。— 来源：`@.specs/ARCHITECTURE.md#adr-007--账号隔离的关系型持久化与-rls`
- `[2026-07-31]` 旧 `xunji.store.v1` 不自动迁移、不删除；Store v1 继续作为领域投影与 JSON 格式。自动迁移若需要应另开 change。— 来源：用户于 2026-07-31 确认
- `[2026-07-31]` 本地读取性能基线为 10 个习惯、3,650 条完成记录、有效会话下连续测量 20 次，至少 19 次在 1 秒内使今天页列表和摘要可用，并且不得因单页限制遗漏记录。— 来源：用户于 2026-07-31 确认、`@.specs/local-postgres-backend/REQUIREMENT.md#ac-18--同账号数据读取性能`
- `[2026-07-31]` 未登录角色无业务数据权限；不同账号必须由数据库 RLS 隔离；客户端禁止包含可绕过 RLS 的高权限凭据。— 来源：`@.specs/local-postgres-backend/REQUIREMENT.md#ac-7--不同账号相互隔离`、`@.specs/local-postgres-backend/REQUIREMENT.md#ac-19--客户端不得包含高权限密钥`
- `[2026-07-31]` 账号初始化状态由服务端 `user_data_state` 标记；普通操作记录级写入，空白 / 示例 / JSON 导入通过受控事务 RPC 原子替换。— 来源：用户确认、`@.specs/local-postgres-backend/DESIGN.md#1-决策清单`、`@.specs/adr/008-atomic-account-store-replacement.md`
- `[2026-07-31]` 账号 Store 读取按稳定主键分页，每页最多 1000 行；只有服务端确认成功后才发布候选 Store，失败保留最后确认状态。— 来源：用户确认、`@.specs/local-postgres-backend/DESIGN.md#25-数据库契约`
- `[2026-07-31]` 本地前端固定使用 `127.0.0.1:3000` 对齐 Supabase Auth site URL；实际配置和端口验证留到 DEV，当前尚未实现。— 来源：用户确认、`@.specs/local-postgres-backend/DESIGN.md#1-决策清单`
- `[2026-07-24 · 已由 ADR-006 替代]` 应用采用纯浏览器单页 PWA，不引入账号、API、后端或第三方数据服务。— 来源：`@openspec/changes/build-habit-review-mvp/design.md:22-33`
- `[2026-07-24 · 持久化部分已由 ADR-007 替代]` Store 采用版本化完整快照，写入必须先校验和持久化，成功后才更新界面；领域校验、失败不伪造成功和 JSON 格式仍保留。— 来源：`@openspec/changes/build-habit-review-mvp/design.md:35-64`
- `[2026-07-24]` 每日目标从创建次日或首次产生完成记录后锁定；修改目标需归档旧习惯并新建。— 来源：`@openspec/changes/build-habit-review-mvp/design.md:35-41`、`@openspec/changes/build-habit-review-mvp/review.md:20-26`
- `[2026-07-24]` 周报只比较紧邻上一个已结束自然周，不跨过空周寻找更早数据。— 来源：`@openspec/changes/build-habit-review-mvp/specs/weekly-execution-review/spec.md:48-57`
- `[2026-07-24]` 手机、平板和桌面拥有相同核心功能；小于 1024px 使用单列与底部导航，桌面突出周摘要。— 来源：`@openspec/changes/build-habit-review-mvp/specs/responsive-pwa-experience/spec.md:3-37`、`@openspec/changes/build-habit-review-mvp/UI-spec.md:67-81`

> **实现状态提示（2026-07-31）**：Supabase JS client、CLI 和 `supabase/config.toml` 已被用户确认为下一项架构方向，但当前 `src/`、`tests/` 与 OpenSpec 仍未接入，仓库也没有业务 migration。不得把“架构已确认”表述成“功能已完成”；必须先走 `local-postgres-backend` 的 CHANGE → REQUIREMENT → DESIGN → TASK。— 来源：`@package.json:16-35`、`@supabase/config.toml`、`@.specs/ARCHITECTURE.md`、用户确认

## UI 资产索引（只索引，不复制全文）

| 资产 | 实际路径 | 已确认用途 / 边界 | 来源 |
|---|---|---|---|
| UI / UE 权威基线 | `openspec/changes/build-habit-review-mvp/UI-spec.md` | 色彩、字体、间距、页面层级、断点、动效和无障碍的当前参考源 | `@openspec/changes/build-habit-review-mvp/UI-spec.md:3-13` |
| 本地账号与后端状态增量设计 | `.specs/local-postgres-backend/UI-DESIGN.md` | 已确认；账号入口、账号标识、真实加载、保存成功、持续错误与退出状态的唯一增量依据，不重做既有视觉体系 | 用户于 2026-07-31 确认、`@.specs/local-postgres-backend/UI-DESIGN.md` |
| 高保真实现说明 | `docs/design/high-fidelity-prototype.md` | 记录已实现的视觉、布局和交互；冲突时服从 UI-spec | `@docs/design/high-fidelity-prototype.md:1-4` |
| 设计参考包 | `design-system/xunji-habit-tracker/MASTER.md` | 只采用顶部“项目约束”；第 28 行后的工具原始输出已被明确覆盖 | `@design-system/xunji-habit-tracker/MASTER.md:1-28` |
| 洞察设计审阅包 | `.superpowers/brainstorm/codex-visual-integration/content/` | 历史设计讨论和待审页面，仅作来路索引 | `@.superpowers/brainstorm/codex-visual-integration/content/design-ready-for-review.html:120-130` |
| 静态视觉评审原型 | `review_test/` | 独立 HTML/CSS/JS 演示，不保存真实用户数据 | `@review_test/AGENTS.md:1-8` |
| 原型桌面截图 | `output/playwright/review-test-desktop.png` | 静态视觉原型桌面证据 | 2026-07-31 路径与图片核验 |
| 原型手机截图 | `output/playwright/review-test-mobile.png` | 静态视觉原型手机证据 | 2026-07-31 路径与图片核验 |
| 最终实现复审结果 | `.superpowers/sdd/progress.md` | 记录最终复审 GO 与当时质量门 | `@.superpowers/sdd/progress.md:15-17` |
| 最终修复证据 | `.superpowers/sdd/final-fixes-report.md` | 洞察最终审查问题、修复范围与验证 | `@.superpowers/sdd/final-fixes-report.md:1-62` |

## 默认偏好（AI 在缺省时按此决策）

- 范围：只实现当前规格确认的能力；新增范围先更新设计文档并取得确认。— 来源：`@AGENTS.md:26-31`
- 数据：优先可读、可导出、可恢复；目标架构只使用本机 Supabase，不发送到公网第三方服务。Habit / Completion 的服务端权限必须由 RLS 保证，不能只靠前端过滤。— 来源：`@AGENTS.md:20-24`、ADR-006、ADR-007
- 状态管理：当前使用 React Context 的 `AppStoreProvider` 统一协调 Store、通知、错误和持久化提交；不为未确认场景引入额外状态库。— 来源：`@src/app/AppStore.tsx:16-30`、`@src/app/AppStore.tsx:75-121`、`@AGENTS.md:20-24`
- 错误处理：写入、导入、读取、鉴权或本地后端不可用时必须保留最后一次已确认状态并显示可读错误，不伪造成功；不得静默回退到 localStorage 写业务数据。— 来源：`@src/app/AppStore.tsx:75-90`、ADR-006、ADR-007
- 账号默认行为：无有效会话时只显示账号入口；会话恢复后读取当前账号数据；退出时清除界面中的账号数据但不删除 Postgres 数据。— 来源：`@.specs/local-postgres-backend/REQUIREMENT.md#ac-3--恢复会话与退出`
- 跨浏览器默认行为：不承诺 Realtime；另一浏览器通过登录、刷新或重新进入页面读取服务端最新状态。— 来源：`@.specs/local-postgres-backend/REQUIREMENT.md#ac-4--chrome-写入后-edge-读取`、`@.specs/local-postgres-backend/REQUIREMENT.md#ac-5--edge-更新后-chrome-读取最新值`
- UI 增量：账号相关界面沿用既有灰绿画布、深墨主操作和淡紫记录强调；登录为默认模式，注册只通过文字切换；会话恢复显示真实文字状态，退出不确认，后端写入失败持续显示且不得伪报成功。— 来源：用户于 2026-07-31 确认、`@.specs/local-postgres-backend/UI-DESIGN.md`
- 测试策略：行为和边界从 OpenSpec AC 派生；修改后运行相关自动化测试或可重复手动验证。— 来源：`@AGENTS.md:33-36`、`@AGENTS.md:103-108`
- 当前命名风格：React 组件与组件文件使用 PascalCase，领域函数使用 camelCase，import 使用相对路径；这是当前实现事实，不自动升级为新的 hard rule。— 来源：`@src/App.tsx:1-9`、`@src/domain/store.ts:11-142`
- 提交格式：DEV 原子提交使用 `<type>(<change-id>): <task-id> <subject>`。— 来源：`@AGENTS.md:98-102`

## 既有抽象索引（防重复实现）

### HTTP 客户端

- **当前路径**：`src/` 尚未发现 HTTP / Supabase client 封装。
- **已确认目标**：复用 `@supabase/supabase-js`；唯一客户端放在 `src/data/supabaseClient.ts`，只允许数据访问或认证适配层调用，页面和组件不得直接散落 Supabase 请求。— 来源：`@package.json:16-22`、`@.specs/local-postgres-backend/DESIGN.md#05-既有架构对齐`

### 数据访问

- **当前模式**：`LocalStoreRepository` 包装浏览器 `localStorage`，入口为 `read / write / previewImport / serialize / subscribe`。— 来源：`@src/data/repository.ts:11-72`
- **目标模式**：`src/data/supabaseRepository.ts` 作为账号感知的异步 Repository，通过 Supabase 进行记录级读写、分页和 Store 投影；完整替换走 ADR-008 RPC；Postgres 为业务数据唯一真相源。— 来源：`@.specs/local-postgres-backend/DESIGN.md#25-数据库契约`
- **ID 契约**：账号 `user_id` 使用 Supabase Auth `uuid`；Habit `id` 与 Completion `habit_id` 在 Postgres 使用 `text`，保持 Store v1 非空字符串契约并兼容内置 `demo-*` ID 与既有合法 JSON。— 来源：用户于 2026-07-31 确认、`@src/domain/store.ts:162-180`、`@src/data/demo.ts:14-36`、`@.specs/local-postgres-backend/DESIGN.md#表与约束`
- **旧固定键**：`xunji.store.v1` 只保留未迁移历史，不自动读取进账号、不删除、也不得继续写成权威数据。— 来源：`@src/data/repository.ts:11-14`、用户确认

### 状态管理

- **库**：React Context + 组件本地 state；未引入 Redux、Zustand 或服务端状态库。
- **路径**：`src/app/AppStore.tsx`。
- **入口**：`AppStoreProvider`、`useAppStore`。— 来源：`@src/app/AppStore.tsx:16-30`、`@src/app/AppStore.tsx:93-128`
- **已确认目标契约**：`commit`、初始化和导入动作改为 `Promise<boolean>`；`ManagePage`、`TodayPage`、`OnboardingPage` 与 `RecoveryPage` 的直接调用必须等待服务端结果，不得把 Promise 当作同步成功。— 来源：用户于 2026-07-31 确认、`@.specs/local-postgres-backend/DESIGN.md#05-既有架构对齐`、`@src/pages/TodayPage.tsx:37-40`、`@src/pages/TodayPage.tsx:123`

### 工具与领域函数

| 工具类型 | 路径 | 入口符号 | 来源 |
|---|---|---|---|
| 日期 | `src/domain/dates.ts` | `parseLocalDate / formatLocalDate / addDays / getWeekStart / recentSevenDays` | `@src/domain/dates.ts:3-66` |
| Store 命令与校验 | `src/domain/store.ts` | `createHabit / editHabit / archiveHabit / adjustCompletion / validateStore` | `@src/domain/store.ts:41-235` |
| 周报 | `src/domain/weeklyReport.ts` | `buildWeeklyReport` | `@src/domain/weeklyReport.ts:29-74` |
| 长期洞察 | `src/domain/insights.ts` | `getInsightWindow / buildInsightReport / buildHabitTrend` | `@src/domain/insights.ts:29-199` |
| 共现 | `src/domain/coOccurrence.ts` | `buildCoOccurrenceReport` | `@src/domain/coOccurrence.ts:99-122` |
| 示例数据 | `src/data/demo.ts` | `createDemoStore` | `@src/data/demo.ts:13-53` |

### 自定义 hooks（前端）

- 未发现独立 `src/hooks/` 或 `use*.ts(x)` 文件；应用级共享入口是 `useAppStore`。— 来源：`@src/app/AppStore.tsx:124-128`、2026-07-31 文件扫描

### 错误处理

- **前端 ErrorBoundary**：未发现。
- **恢复页面**：`src/pages/RecoveryPage.tsx`，读取损坏数据时不静默清空。— 来源：`@src/pages/RecoveryPage.tsx:23-49`
- **通知**：`AppShell` 使用 `aria-live="polite"` Toast 显示成功或错误。— 来源：`@src/components/AppShell.tsx:27-36`

### Schema / 迁移

- **服务器 schema / migration**：已确认目标为 `habits`、`completions` 关系表、`user_id` 所有权和 RLS；当前仍未发现业务 migration 或 policy，必须由后续 change 生成可审查 migration，并在执行前取得用户确认。— 来源：ADR-007、`@AGENTS.md:143-146`、2026-07-31 文件扫描
- **本地数据 schema**：TypeScript `Store` 接口 + `validateStore` 运行时校验。— 来源：`@src/domain/types.ts:17-21`、`@src/domain/store.ts:142-235`
- **迁移边界**：旧 localStorage 本轮不自动迁移；Postgres schema 变化必须有 migration、回滚策略和数据库验证，不得只改客户端类型。— 来源：用户确认、`@flow-kit/RULES.md:100-110`

### 禁动清单

- 尚未确认长期项目级禁动模块。
- 2026-07-31 本次初始化仅新增 `.specs/CONTEXT.md`、`.specs/ARCHITECTURE.md` 和根 `STATE.md`；现有 OpenSpec、UI-spec、设计参考、原型、源码、`CLAUDE.md` 与 `AGENTS.md` 均不修改。— 来源：用户本次明确指令
- 后端 change 落地前不得删除或覆盖旧 `xunji.store.v1`；不得把 Supabase 本地栈暴露到公网；不得在页面组件中直接写 Supabase 数据调用。— 来源：用户于 2026-07-31 确认、ADR-006、ADR-007

### 技术债与流程缺口

| 债项 / 缺口 | 来源 | 影响 | 处理边界 |
|---|---|---|---|
| `README.md` 当前部分链接指向仓库内不存在的相对路径 | `@README.md:47-60` + 2026-07-31 路径核验 | 仓库内点击会失效 | 本次不修改，另开文档 change |
| 尚无 `.specs/LESSONS.md` | `@AGENTS.md:57`、`@AGENTS.md:76-78` | 未来 DEV 无跨任务失败库可扫描 | 首次需要记录 lesson 时按模板创建 |
| 浏览器存储与统计性能未形成证据 | 2026-07-31 代码与规格扫描 | 无法声明容量上限 | 后端落地后改为 Postgres / Data API 容量验证 |
| 目标架构已确认但尚无业务 migration、RLS 或源码接入 | ADR-006、ADR-007、2026-07-31 文件扫描 | 后续 AI 可能误报功能已完成 | 先完成 `local-postgres-backend` Flow Kit change；未过 verify 前只称“目标架构” |
| Supabase `site_url` 与前端实际开发地址未对齐验证 | `@supabase/config.toml:155-163`、`@vite.config.ts:1-37` | 登录回调可能失败 | DESIGN 阶段先验证并记录决定，不在 A-architect 修改配置 |
| Data API `max_rows = 1000` | `@supabase/config.toml:16-18` | 完整历史或导出可能被静默截断 | Repository 必须分页；测试覆盖超过单页边界 |

## intel-scan 元数据

- **last_intel_scan**: `2026-07-31`
- **scanner**: `flow-kit/prompts/I-intel-scan.md`
- **扫描范围**：项目规则、OpenSpec、UI 资产、原型评审、`src/`、`tests/`、构建与测试配置；写入后又二次扫描了并行出现的 Supabase 依赖与配置
- **本轮验证**：`pnpm typecheck` 通过；Vitest 9 个文件、51/51 通过；两个 OpenSpec change strict 校验通过
- **下次重扫建议**：框架升级、Store 版本变化、主要模块重组，或距本次扫描超过 90 天

---

> 文件长度建议保持在 300 行以内；历史条目过长时归档，不在此复制完整规格或评审正文。
