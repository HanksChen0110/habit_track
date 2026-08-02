# LESSONS — 跨任务失败知识库

> 仅记录已经发生、可复用且有证据的失败模式。DEV 开始任务前按关键词检查；没有命中时不臆造经验。

## 索引

- L-001：PostgREST 省略所有权列时，RLS 不会自动替 insert 补值
- L-002：不要用 CSS animationend 管理业务状态生命周期
- L-003：Supabase credential Promise 与 auth event 的顺序不是单一权威
- L-004：UI 触发异步持久化后不要立刻用刷新验证无关行为
- L-005：Supabase CLI start 返回成功不代表 Auth/Data API 已可承接并行 E2E

## 条目

### L-001 · [postgres, rls, postgrest] 省略所有权列时，RLS 不会自动替 insert 补值

- **首发**：local-postgres-backend · T07 / T-FIX-01 · 2026-08-01
- **上次复核**：2026-08-01
- **适用栈**：Supabase Data API / PostgREST / Postgres RLS
- **状态**：active
- **关键词**：RLS PostgREST upsert insert user_id auth.uid default ownership 42501

**问题场景**
客户端按“不信任客户端 user_id”原则省略所有权列，直接向带 `user_id NOT NULL` 与 RLS 的表 insert/upsert。

**当时尝试的方案**
只写 RLS `with check (auth.uid() = user_id)`，期待数据库自动知道当前账号。

**为什么不行**
RLS 只校验行，不生成列值；没有 default 时 PostgREST payload 缺 `user_id`，真实写入以 `42501` 失败。单元 mock 没暴露，pgTAP RED 为 23/27。

**当前推荐做法**
所有权列使用 `DEFAULT auth.uid()`，保留 NOT NULL、复合键和 RLS；同时测试“省略所有权成功”与“显式伪造其他账号仍失败”。见 `@.specs/archive/2026-08-01-local-postgres-backend/T-FIX-01-SUMMARY.md`。

**何时可重新评估**
改为只通过 SECURITY INVOKER RPC 写入、记录级 Data API 不再使用时。

### L-002 · [react, accessibility, motion] 不要用 CSS animationend 管理业务状态生命周期

- **首发**：local-postgres-backend · T-FIX-04 · 2026-08-01
- **上次复核**：2026-08-01
- **适用栈**：React 18+ / CSS prefers-reduced-motion
- **状态**：active
- **关键词**：toast notice animationend reduced-motion timer aria-live lifecycle

**问题场景**
短暂成功 Toast 需要自动清除，视觉上同时支持 reduced-motion。

**当时尝试的方案**
只在 Toast 的 `animationend` 事件中清除 notice。

**为什么不行**
`prefers-reduced-motion: reduce` 将动画设为 `none` 后不会触发事件，成功提示永久残留并持续表达过期状态。

**当前推荐做法**
React effect/timer 管理状态生命周期并在新值/卸载时 cleanup；CSS 动画只负责视觉。见 `@.specs/archive/2026-08-01-local-postgres-backend/T-FIX-04-SUMMARY.md`。

**何时可重新评估**
改用自身提供状态生命周期且明确覆盖 reduced-motion 的 Toast 组件时。

### L-003 · [supabase, auth, race] credential Promise 与 auth event 的顺序不是单一权威

- **首发**：local-postgres-backend · T05 · 2026-08-01
- **上次复核**：2026-08-01
- **适用栈**：React / Supabase Auth browser client
- **状态**：active
- **关键词**：Supabase Auth onAuthStateChange SIGNED_IN signIn promise race session switch signOut

**问题场景**
登录、切账号、退出与会话恢复可能交错；既有账号仍在 UI 中时又发起 credential 请求。

**当时尝试的方案**
把 credential Promise 返回或任意一次 `SIGNED_IN` 事件直接当最终权威并立即覆盖当前 Session。

**为什么不行**
事件和 Promise 会以不同顺序到达；迟到 `SIGNED_IN`、失败切账号、signOut 与 pending credential 交错可能恢复错误账号。T05 经 4 轮竞态修复才关闭。

**当前推荐做法**
串行 credential 请求；用 generation、请求邮箱、起始账号和权威 Session 共同判定；对迟到事件恢复权威 Session，所有外部失败只返回脱敏类别。见 `@.specs/archive/2026-08-01-local-postgres-backend/T05-SUMMARY.md`。

**何时可重新评估**
Supabase Auth 明确提供原子账号切换 API，或应用禁止已登录状态下发起其他账号 credential 请求时。

### L-004 · [playwright, e2e, persistence, race] UI 触发异步持久化后不要立刻用刷新验证无关行为

- **首发**：mobile-performance-green · T02 · 2026-08-02
- **上次复核**：2026-08-02
- **适用栈**：React / Playwright / 异步后端持久化
- **状态**：active
- **关键词**：Playwright click page.goto reload async persistence demo seed landing race flaky

**问题场景**
E2E 点击会异步写入后端的“载入示例”后，响应式布局用例立即 `page.goto('/')`，但该用例实际只需要切换视口和站内导航。

**当时尝试的方案**
每切换一个宽度都强制刷新，以为这样能得到更“干净”的页面状态。

**为什么不行**
用户可见页面已经切换，但持久化 Promise 尚未结束；并发负载下刷新读到空 Store，回到体验选择页。隔离时通过、全套时 21/22，形成典型负载相关假阴性。

**当前推荐做法**
先问刷新是不是 AC 的必要动作：不是就只调整视口并走站内导航；确实要验证持久化时，等待可观察的保存完成或服务端回读证据后再刷新。见 `@.specs/archive/2026-08-02-mobile-performance-green/T02-SUMMARY.md`。

**何时可重新评估**
相关 UI action 明确定义为等待后端持久化完成才 resolve，且有回归测试证明刷新不会抢跑时。

### L-005 · [supabase, e2e, tool, race] Supabase CLI start 返回成功不代表 Auth/Data API 已可承接并行 E2E

- **首发**：ci-quality-gates · INTEGRATION · 2026-08-02
- **上次复核**：2026-08-02
- **适用栈**：Supabase CLI 本地 stack / Playwright 并行 E2E / React Supabase browser client
- **状态**：active
- **关键词**：supabase start status readiness Auth Data API 401 Playwright parallel E2E

**问题场景**
刚执行 `supabase start` 后立即以多 worker 启动需要注册、获取 session、读取 `user_data_state` 的 Playwright E2E。

**当时尝试的方案**
把 CLI 命令 exit 0 当作所有网关、Auth 与 PostgREST 已完成就绪，立即运行 `pnpm test:e2e`。

**为什么不行**
首次并行运行 22 项功能用例时，只有最早开始的 desktop/mobile `backend.spec.ts` 在注册成功后读取 `user_data_state` 得到 401，最终 20/22 通过；稍后的账户用例全部成功。执行 `supabase status` 后重跑失败用例 2/2 通过，随后完整 24 项 E2E 全绿，证明是启动就绪竞争而不是产品逻辑失败。

**当前推荐做法**
本地 stack 启动后先运行 `pnpm exec supabase status --output json`（至少确认 API、REST、DB endpoint 可用），再启动并行浏览器测试；若首轮只在最早用例出现 401，保留失败证据、就绪后重跑完整命令，不能直接把失败归因于业务代码。见 `@.specs/ci-quality-gates/UAT.md`。

**何时可重新评估**
项目将 E2E harness 显式接入可轮询的 Auth/Data API health check，或 Supabase CLI 提供包含全部服务就绪语义的稳定等待命令时。
