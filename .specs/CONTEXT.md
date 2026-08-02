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

“循迹”是面向单个个人用户的本地优先习惯记录与复盘 PWA。用户创建每日目标习惯、记录或纠正完成量、查看自然周复盘及长期洞察，并通过 JSON 导入导出备份数据。账号、Supabase Repository、关系表、RLS 与原子替换 RPC 已在本地落地；本地开发继续使用 Supabase CLI stack，生产前端使用 Vercel、生产数据使用 Supabase 云端项目。产品仍只呈现执行事实，不推断未完成原因。— 来源：`@.specs/archive/2026-08-01-local-postgres-backend/UAT.md`、ADR-006～ADR-009、用户于 2026-08-02 授权

## 技术栈（团队级默认 / 当前已实现）

| 类别 | 当前事实 | 来源 |
|---|---|---|
| 语言 / 运行时 | TypeScript；编译目标 ES2022；Node.js 版本未声明，待确认 | `@tsconfig.app.json:2-17`、`@package.json:1-6` |
| 包管理 | pnpm 10.14.0 | `@package.json:6` |
| 前端框架 | React 19 + React DOM + React Router；HashRouter 路由 | `@package.json:16-21`、`@src/App.tsx:1-42` |
| 构建 / PWA | Vite 8 + `vite-plugin-pwa`；静态客户端应用壳 | `@package.json:31-36`、`@vite.config.ts:1-29` |
| UI 依赖 | 项目内 Noto Sans SC Variable；Lucide 图标；原生 CSS / SVG | `@package.json:17-21`、`@src/main.tsx:1-10`、`@openspec/changes/build-habit-review-mvp/UI-spec.md:41-48` |
| 后端 / 数据库 | Supabase JS + Auth + Data API + Postgres/RLS；本地用 CLI stack，生产用 Supabase 云端项目；4 个 migration 是 schema 发布源 | `@src/data/supabaseClient.ts`、`@src/data/supabaseRepository.ts`、`@supabase/migrations/`、ADR-006～ADR-009 |
| 测试 | Vitest + Testing Library + Playwright | `@package.json:7-14`、`@package.json:23-36`、`@playwright.config.ts:1-19` |
| 部署 | 本地开发：Vite + Supabase CLI；生产：Vercel 静态前端 + Supabase 云端 Auth/Data API/Postgres | ADR-009、用户于 2026-08-02 授权 |
| 栈卡片编号 | 2️⃣ Vite + React 前后端分离 SPA 的既有项目裁剪版；后端使用 Supabase 托管能力，不另建 Node API | `@.specs/archive/2026-08-01-local-postgres-backend/DESIGN.md#0-技术栈选定`、ADR-009 |

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
| 视口就绪状态 | 账号 Store 完整读取后，当前视口真实应显示的主要内容已可用；桌面可用周摘要作辅助信号，手机使用移动周报入口，不要求隐藏元素可见 | `@.specs/archive/2026-08-02-mobile-performance-green/REQUIREMENT.md#AC-4--桌面与移动使用各自的页面就绪信号` |
| 性能基线隔离 | 资源敏感的 3,650 条记录读取测量不与另一同类基准并发，避免测试编排竞争被误判为产品性能回归 | `@.specs/archive/2026-08-02-mobile-performance-green/REQUIREMENT.md#AC-5--性能基线不受同类测量并发污染` |
| CI 四关 | 本 change 约定的四个独立质量检查：`lint`、`typecheck`、`test`、`build`；其 job 名称也是 GitHub required check context | 用户于 2026-08-02 确认、`@.specs/ci-quality-gates/REQUIREMENT.md` |
| Required status check | GitHub ruleset 中必须成功才能合并到受保护分支的检查 context；未完成或失败时合并被阻止 | 用户于 2026-08-02 确认、`@.specs/ci-quality-gates/REQUIREMENT.md#ac-4--main-将四关设为-required-status-checks` |

## 已锁决策

- `[2026-07-25]` UI / UE 参数统一以 `UI-spec.md` 为当前基线；设计说明和参考包只能补充，不能覆盖它。— 来源：`@openspec/changes/build-habit-review-mvp/UI-spec.md:3-5`、Git `2b369e0`
- `[2026-07-25]` 洞察保持 Store v1，图表使用原生 SVG / CSS，不迁移 Tailwind 或 shadcn。— 来源：`@openspec/changes/add-insights-dashboard/design.md:1-4`
- `[2026-07-31]` 本地开发与验证采用 Supabase CLI Auth + Data API + Postgres；本地 stack 不对公网暴露。— 来源：`@.specs/ARCHITECTURE.md#adr-006--使用本地-supabase-作为开发与验证后端`
- `[2026-08-02]` 生产前端使用 Vercel，生产 Auth / Data API / Postgres 使用专用 Supabase 云端项目；schema 只由仓库 migration 经 CLI link / dry-run / push 发布。— 来源：`@.specs/ARCHITECTURE.md#adr-009--vercel-前端--supabase-云端生产环境`、用户授权
- `[2026-08-02]` Vercel Production 稳定域名固定为 `https://xunji-nu.vercel.app`；生产构建从 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY` 连接 Supabase，Auth Site URL 使用同一稳定域名。— 来源：2026-08-02 Vercel / Supabase 配置实测、`@harness-tool-audit.md`
- `[2026-08-02]` `main` 的 CI 质量门固定为 `lint`、`typecheck`、`test`、`build` 四个独立 job，并以同名 context 设为 required status checks；本次不叠加人工审批、E2E、pgTAP、性能、覆盖率或安全扫描。— 来源：用户确认、`@.specs/ci-quality-gates/REQUIREMENT.md`
- `[2026-07-31]` Habit / Completion 以关联 `user_id` 的关系表持久化并启用 RLS；Postgres 是业务数据唯一真相源，页面不得直接访问 Supabase 或业务 localStorage。— 来源：`@.specs/ARCHITECTURE.md#adr-007--账号隔离的关系型持久化与-rls`
- `[2026-07-31]` 旧 `xunji.store.v1` 不自动迁移、不删除；Store v1 继续作为领域投影与 JSON 格式。自动迁移若需要应另开 change。— 来源：用户于 2026-07-31 确认
- `[2026-07-31]` 本地读取性能基线为 10 个习惯、3,650 条完成记录、有效会话下连续测量 20 次，至少 19 次在 1 秒内使今天页列表和摘要可用，并且不得因单页限制遗漏记录。— 来源：用户于 2026-07-31 确认、`@.specs/local-postgres-backend/REQUIREMENT.md#ac-18--同账号数据读取性能`
- `[2026-08-02]` 性能门槛继续保持 20 次至少 19 次不超过 1 秒；桌面与移动使用各自真实可见的就绪信号，资源敏感的性能场景必须隔离执行，不得用并发争抢结果判定产品回归。— 来源：`@.specs/archive/2026-08-02-mobile-performance-green/REQUIREMENT.md` AC-4～AC-5、用户授权推进全绿修复
- `[2026-08-02]` 响应式自动化不得要求隐藏的桌面账号区或摘要在手机可见，也不得用 `force` 点击绕过遮挡；断言必须对应已确认 UI 契约与真实用户操作。— 来源：`@.specs/archive/2026-08-02-mobile-performance-green/REQUIREMENT.md` AC-1～AC-3、AC-8
- `[2026-07-31]` 未登录角色无业务数据权限；不同账号必须由数据库 RLS 隔离；客户端禁止包含可绕过 RLS 的高权限凭据。— 来源：`@.specs/local-postgres-backend/REQUIREMENT.md#ac-7--不同账号相互隔离`、`@.specs/local-postgres-backend/REQUIREMENT.md#ac-19--客户端不得包含高权限密钥`
- `[2026-07-31]` 账号初始化状态由服务端 `user_data_state` 标记；普通操作记录级写入，空白 / 示例 / JSON 导入通过受控事务 RPC 原子替换。— 来源：用户确认、`@.specs/local-postgres-backend/DESIGN.md#1-决策清单`、`@.specs/adr/008-atomic-account-store-replacement.md`
- `[2026-07-31]` 账号 Store 读取按稳定主键分页，每页最多 1000 行；只有服务端确认成功后才发布候选 Store，失败保留最后确认状态。— 来源：用户确认、`@.specs/local-postgres-backend/DESIGN.md#25-数据库契约`
- `[2026-07-31]` 本地前端固定使用 `127.0.0.1:3000` 对齐 Supabase Auth site URL；实际配置和端口验证留到 DEV，当前尚未实现。— 来源：用户确认、`@.specs/local-postgres-backend/DESIGN.md#1-决策清单`
- `[2026-07-24 · 已由 ADR-006 替代]` 应用采用纯浏览器单页 PWA，不引入账号、API、后端或第三方数据服务。— 来源：`@openspec/changes/build-habit-review-mvp/design.md:22-33`
- `[2026-07-24 · 持久化部分已由 ADR-007 替代]` Store 采用版本化完整快照，写入必须先校验和持久化，成功后才更新界面；领域校验、失败不伪造成功和 JSON 格式仍保留。— 来源：`@openspec/changes/build-habit-review-mvp/design.md:35-64`
- `[2026-07-24]` 每日目标从创建次日或首次产生完成记录后锁定；修改目标需归档旧习惯并新建。— 来源：`@openspec/changes/build-habit-review-mvp/design.md:35-41`、`@openspec/changes/build-habit-review-mvp/review.md:20-26`
- `[2026-07-24]` 周报只比较紧邻上一个已结束自然周，不跨过空周寻找更早数据。— 来源：`@openspec/changes/build-habit-review-mvp/specs/weekly-execution-review/spec.md:48-57`
- `[2026-07-24]` 手机、平板和桌面拥有相同核心功能；小于 1024px 使用单列与底部导航，桌面突出周摘要。— 来源：`@openspec/changes/build-habit-review-mvp/specs/responsive-pwa-experience/spec.md:3-37`、`@openspec/changes/build-habit-review-mvp/UI-spec.md:67-81`

> **实现状态提示（2026-08-02）**：本地后端 change 已归档并通过完整验证；4 个 migration 已发布到 `xunji-habit-review` 云端项目，远端历史、lint、类型契约、pgTAP 174/174、Auth、匿名拒绝、账号 RLS 隔离和 `replace_user_store` RPC 已核验。Vercel Production 已发布 `main@71da466` 至 `https://xunji-nu.vercel.app`。生产真实账号已注册并确认，3 条习惯经前端写入；主界面显示账号邮箱和退出入口，实际退出成功，用户重新登录后恢复同一账号的“学外语、跑步、阅读”3 条习惯。Vercel→Supabase Auth/Data API/Postgres 生产闭环 UAT 通过。— 来源：`@STATE.md`、ADR-009、2026-08-02 用户截图及 Chrome / Supabase 生产实测

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
- 数据：优先可读、可导出、可恢复；本地开发连接本地 Supabase，生产连接专用 Supabase 云端项目。Habit / Completion 的服务端权限必须由 RLS 保证，客户端只能持有 publishable key。— 来源：ADR-006、ADR-007、ADR-009
- 状态管理：当前使用 React Context 的 `AppStoreProvider` 统一协调 Store、通知、错误和持久化提交；不为未确认场景引入额外状态库。— 来源：`@src/app/AppStore.tsx:16-30`、`@src/app/AppStore.tsx:75-121`、`@AGENTS.md:20-24`
- 错误处理：写入、导入、读取、鉴权或本地后端不可用时必须保留最后一次已确认状态并显示可读错误，不伪造成功；不得静默回退到 localStorage 写业务数据。— 来源：`@src/app/AppStore.tsx:75-90`、ADR-006、ADR-007
- 账号默认行为：无有效会话时只显示账号入口；会话恢复后读取当前账号数据；退出时清除界面中的账号数据但不删除 Postgres 数据。— 来源：`@.specs/local-postgres-backend/REQUIREMENT.md#ac-3--恢复会话与退出`
- 跨浏览器默认行为：不承诺 Realtime；另一浏览器通过登录、刷新或重新进入页面读取服务端最新状态。— 来源：`@.specs/local-postgres-backend/REQUIREMENT.md#ac-4--chrome-写入后-edge-读取`、`@.specs/local-postgres-backend/REQUIREMENT.md#ac-5--edge-更新后-chrome-读取最新值`
- UI 增量：账号相关界面沿用既有灰绿画布、深墨主操作和淡紫记录强调；登录为默认模式，注册只通过文字切换；会话恢复显示真实文字状态，退出不确认，后端写入失败持续显示且不得伪报成功。— 来源：用户于 2026-07-31 确认、`@.specs/local-postgres-backend/UI-DESIGN.md`
- 测试策略：行为和边界从 OpenSpec AC 派生；修改后运行相关自动化测试或可重复手动验证。— 来源：`@AGENTS.md:33-36`、`@AGENTS.md:103-108`
- 响应式验证：同一语义存在桌面/移动重复节点时，测试必须选择当前视口真实可见的节点；弹窗操作必须使用普通用户点击，禁止强制点击掩盖层级缺陷。— 来源：`@.specs/archive/2026-08-02-mobile-performance-green/REQUIREMENT.md` AC-1～AC-3、AC-8
- 当前命名风格：React 组件与组件文件使用 PascalCase，领域函数使用 camelCase，import 使用相对路径；这是当前实现事实，不自动升级为新的 hard rule。— 来源：`@src/App.tsx:1-9`、`@src/domain/store.ts:11-142`
- 提交格式：DEV 原子提交使用 `<type>(<change-id>): <task-id> <subject>`。— 来源：`@AGENTS.md:98-102`

## 既有抽象索引（防重复实现）

### HTTP 客户端

- **当前路径**：`src/data/supabaseClient.ts` 通过 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY` 创建唯一 Supabase client。
- **边界**：只允许数据访问或认证适配层调用，页面和组件不得直接散落 Supabase 请求；不得向浏览器环境注入 service-role、数据库密码或 CLI access token。— 来源：`@src/data/supabaseClient.ts`、ADR-009

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

- **服务器 schema / migration**：`supabase/migrations/` 有 4 个 migration，覆盖 `user_data_state`、`habits`、`completions`、RLS 与 `replace_user_store`；本地 174 项 pgTAP 通过，云端 `xunji-habit-review` 已应用全部 4 个版本。后续仍只允许通过 linked project 的 `db push` 发布。— 来源：2026-08-02 本地与云端 CLI 验证、ADR-007～ADR-009
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
| 云端 pgTAP 直连受本机 IPv6 网络限制 | 2026-08-02 direct DB connection timeout；IPv4 session pooler 已通过云端 174/174 pgTAP | 不阻塞发布；后续远端数据库测试不能直接复用 `--linked` 默认直连 | 在用户终端临时注入数据库密码，通过 linked `pooler-url` 运行；不得落盘 |
| Vercel Preview 域名尚未加入 Supabase Redirect allowlist | ADR-009、2026-08-02 生产配置实测 | Preview 环境未来若启用邮箱确认或 OAuth，回调可能被拒；Production 稳定域名不受影响 | 首次需要 Preview Auth 时另行配置精确 Preview allowlist |
| Data API `max_rows = 1000` | `@supabase/config.toml:16-18` | 完整历史或导出可能被静默截断 | Repository 必须分页；测试覆盖超过单页边界 |

## intel-scan 元数据

- **last_intel_scan**: `2026-07-31`
- **scanner**: `flow-kit/prompts/I-intel-scan.md`
- **扫描范围**：项目规则、OpenSpec、UI 资产、原型评审、`src/`、`tests/`、构建与测试配置；写入后又二次扫描了并行出现的 Supabase 依赖与配置
- **本轮验证**：`pnpm typecheck` 通过；Vitest 9 个文件、51/51 通过；两个 OpenSpec change strict 校验通过
- **下次重扫建议**：框架升级、Store 版本变化、主要模块重组，或距本次扫描超过 90 天

---

> 文件长度建议保持在 300 行以内；历史条目过长时归档，不在此复制完整规格或评审正文。
