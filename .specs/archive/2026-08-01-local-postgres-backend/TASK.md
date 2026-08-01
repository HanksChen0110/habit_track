# TASK: 为循迹接入本地 Postgres 后端

- **Change ID**: `local-postgres-backend`
- **关联**: `@.specs/local-postgres-backend/REQUIREMENT.md`、`@.specs/local-postgres-backend/DESIGN.md`、`@.specs/local-postgres-backend/UI-DESIGN.md`
- **状态**: ready_for_dev

---

## 执行前门禁

- T01、T02 在 DEV 中创建或修改 migration、执行 `supabase db reset` 前，必须再次取得用户明确批准；TASK 落盘不代表已批准。
- 每次已批准的高风险操作完成后，必须按 `@AGENTS.md` 向根目录 `harness-tool-audit.md` 追加审计记录。
- `.env.local` 已存在但本 TASK 不读取、不修改、不纳入 `write_files`；若 DEV 发现运行配置缺失或错误，必须先取得用户批准再修改。
- DEV 每个任务开始前按 R1.8 检查 `.specs/LESSONS.md`；文件不存在时按 Flow Kit DEV 规则建立空骨架。
- `write_files` 只声明产品、测试和配置实现边界；Flow Kit 自动生成的 SUMMARY、TASK 状态及强制审计工件仍按项目规则维护。

---

## 波次划分

```text
Wave 1 (parallel): T01[P], T03[P], T04[P]
Wave 2 (parallel): T02[P] (depends T01), T05[P] (depends T04), T06[P] (depends T01,T03,T04)
Wave 3 (parallel): T07[P] (depends T02,T06), T08[P] (depends T05,T06)
Wave 4:            T09 (depends T07,T08)
Wave 5:            T10 (depends T09)
Wave 6:            T11 (depends T10)
Wave 7 (parallel): T12[P], T13[P] (depends T09,T11)
Wave 8:            T14 (depends T12,T13)
Wave 9:            T15 (depends T14)
Wave 10 (parallel): T16[P], T17[P] (depends T15)
```

> 同 wave 且标记 `[P]` 的任务可并行；共享同一实现文件的任务已用依赖串行化。

---

## 任务清单

```xml
<task id="T01" parallel="true" status="done">
  <name>建立账号关系表、约束与 RLS</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    .specs/local-postgres-backend/REQUIREMENT.md
    .specs/ARCHITECTURE.md
    supabase/config.toml
    src/domain/types.ts
    src/domain/store.ts
  </read_files>
  <write_files>
    supabase/migrations/202607310001_local_postgres_backend.sql
    supabase/tests/database/001_schema_rls.sql
  </write_files>
  <action>
    取得 migration 人工批准后，按 D4、D5 创建 user_data_state、habits、completions；账号 user_id 使用 uuid，Habit id 与 Completion habit_id 使用 text，并加入复合主外键、基础检查、授权和三表 RLS。
    pgTAP 覆盖 authenticated 账号 A/B 的读写隔离、anon 无权限、所有权不可转移及 Completion 唯一性；不修改 auth.users 内部结构，不加入高权限密钥。
    运行 reset 前再次取得批准，并按项目规则记录高风险工具审计。
  </action>
  <verify>pnpm exec supabase test db --local supabase/tests/database/001_schema_rls.sql</verify>
  <done>数据库测试证明账号 A/B 与未登录角色的表级读写隔离成立，满足 AC-7、AC-8 的数据库部分。</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true" status="done">
  <name>实现当前账号 Store 原子替换 RPC</name>
  <read_files>
    .specs/adr/008-atomic-account-store-replacement.md
    .specs/local-postgres-backend/DESIGN.md
    supabase/migrations/202607310001_local_postgres_backend.sql
    supabase/tests/database/001_schema_rls.sql
    src/domain/store.ts
    src/domain/types.ts
  </read_files>
  <write_files>
    supabase/migrations/202607310002_local_postgres_backend.sql
    supabase/tests/database/002_replace_user_store.sql
  </write_files>
  <action>
    取得 migration 人工批准后，实现 ADR-008 的 replace_user_store：默认 SECURITY INVOKER、空 search_path、只从 auth.uid() 取账号、不接收 user_id，并只向 authenticated 授权。
    在同一事务内校验 Store v1 必需结构、替换当前账号行并写初始化标记；测试有效替换、跨账号隔离、匿名拒绝、重复键、断裂引用和失败全量回滚。
    运行 reset 前再次取得批准，并按项目规则记录高风险工具审计。
  </action>
  <verify>pnpm exec supabase test db --local supabase/tests/database/002_replace_user_store.sql</verify>
  <done>RPC 只替换当前账号且任一错误完整回滚，满足 AC-10、AC-12、AC-13 的数据库原子性部分。</done>
  <depends_on>T01</depends_on>
</task>

<task id="T03" parallel="true" status="done">
  <name>将旧 Repository 收缩为纯 Store 编解码边界</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    src/data/repository.ts
    src/domain/store.ts
    src/domain/types.ts
    tests/data/repository.test.ts
  </read_files>
  <write_files>
    src/data/repository.ts
    tests/data/repository.test.ts
  </write_files>
  <action>
    沿用 validateStore，把 previewImport、serialize 和 StoreRepository 契约保留为无浏览器存储副作用的编解码边界；生产路径不再提供 localStorage read、write 或 subscribe。
    ImportPreview 不再要求页面从 data 层导入；测试覆盖完整预览、序列化和全部无效 Store，且断言不会读取、覆盖或删除 xunji.store.v1。
  </action>
  <verify>pnpm exec vitest run tests/data/repository.test.ts</verify>
  <done>Store v1 编解码保持兼容且旧键完全不参与账号数据，覆盖 AC-11、AC-13、AC-14 的纯函数边界。</done>
  <depends_on></depends_on>
</task>

<task id="T04" parallel="true" status="done">
  <name>建立唯一 Supabase 客户端与固定本地前端地址</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    package.json
    supabase/config.toml
    vite.config.ts
    src/vite-env.d.ts
  </read_files>
  <write_files>
    src/data/supabaseClient.ts
    vite.config.ts
    tests/data/supabase-client.test.ts
  </write_files>
  <action>
    复用现有 @supabase/supabase-js，建立唯一浏览器 client，只接受 Vite URL 与 publishable key 环境变量；缺配置时返回可分类错误，不硬编码本地 key。
    将 Vite dev server 固定为 127.0.0.1:3000 且 strictPort；不读取或修改 .env.local，不引入 service_role、数据库连接串或签名密钥。
  </action>
  <verify>pnpm exec vitest run tests/data/supabase-client.test.ts</verify>
  <done>客户端配置与 Auth site_url 对齐，缺配置可诊断且无高权限凭据入口，覆盖 D10、D11 与 AC-19 的源码部分。</done>
  <depends_on></depends_on>
</task>

<task id="T05" parallel="true" status="done">
  <name>实现 AuthContext 认证生命周期</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    .specs/local-postgres-backend/UI-DESIGN.md
    src/data/supabaseClient.ts
    src/app/AppStore.tsx
    tests/setup.ts
  </read_files>
  <write_files>
    src/auth/AuthContext.tsx
    tests/ui/AuthContext.test.tsx
  </write_files>
  <action>
    按 D2 实现 booting、signed_out、authenticated、error 状态以及 signUp、signIn、signOut；会话变化以当前 user.id 为边界，迟到响应不得恢复旧账号。
    将 Supabase 错误映射为可读类别，不回显 token、内部对象名或密码；注册成功直接进入账号数据门，登录失败保持 signed_out。
  </action>
  <verify>pnpm exec vitest run tests/ui/AuthContext.test.tsx</verify>
  <done>注册、登录失败、会话恢复、退出和账号切换状态均有自动化证据，覆盖 AC-1～AC-3、AC-8、AC-15 的认证部分。</done>
  <depends_on>T04</depends_on>
</task>

<task id="T06" parallel="true" status="done">
  <name>实现账号 Store 的完整分页读取</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    src/data/repository.ts
    src/data/supabaseClient.ts
    src/domain/store.ts
    src/domain/types.ts
    supabase/migrations/202607310001_local_postgres_backend.sql
  </read_files>
  <write_files>
    src/data/supabaseRepository.ts
    tests/data/supabase-repository-read.test.ts
  </write_files>
  <action>
    实现 user_data_state 检查、Habit 与 Completion 稳定排序分页、关系行到 Store v1 投影和最终 validateStore。
    每页最多 1000 行，任何一页失败都拒绝发布部分 Store；测试覆盖未初始化、已确认空 Store、3650 条 Completion 四页读取、页失败和无效服务端数据。
  </action>
  <verify>pnpm exec vitest run tests/data/supabase-repository-read.test.ts</verify>
  <done>读取不会被 Data API 单页上限截断且只返回完整校验 Store，覆盖 AC-3～AC-8、AC-11、AC-18 的 Repository 读取部分。</done>
  <depends_on>T01,T03,T04</depends_on>
</task>

<task id="T07" parallel="true" status="done">
  <name>实现记录级提交与 RPC 完整替换</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    .specs/adr/008-atomic-account-store-replacement.md
    src/data/supabaseRepository.ts
    src/data/repository.ts
    src/domain/store.ts
    src/domain/types.ts
    supabase/migrations/202607310001_local_postgres_backend.sql
    supabase/migrations/202607310002_local_postgres_backend.sql
  </read_files>
  <write_files>
    src/data/supabaseRepository.ts
    tests/data/supabase-repository-write.test.ts
  </write_files>
  <action>
    比较 previous 与 candidate，只接受一个逻辑 Habit 或 Completion 变化并走记录级 Data API；不可识别的多项变化必须拒绝。
    replace 先校验 candidate，再调用 replace_user_store，成功后完整重读；任何失败保留 previous。测试覆盖增改归档、upsert/delete、重复提交边界、RPC 失败、回读失败和账号隔离参数缺失。
  </action>
  <verify>pnpm exec vitest run tests/data/supabase-repository-write.test.ts</verify>
  <done>普通写入不整库覆盖，完整替换不信任客户端 user_id 且失败不改变确认值，覆盖 AC-4～AC-6、AC-10、AC-12、AC-13、AC-15。</done>
  <depends_on>T02,T06</depends_on>
</task>

<task id="T08" parallel="true" status="done">
  <name>实现 AppStore 的账号读取与迟到响应隔离</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    src/app/AppStore.tsx
    src/auth/AuthContext.tsx
    src/data/repository.ts
    src/data/supabaseRepository.ts
    src/domain/types.ts
    tests/setup.ts
  </read_files>
  <write_files>
    src/app/AppStore.tsx
    tests/ui/AppStoreSession.test.tsx
  </write_files>
  <action>
    沿用 React Context，把 AppStore 改为账号感知的 idle、loading、ready、saving、error 状态；认证 user 变化时清空旧 Store 并启动对应读取。
    用 user.id 与加载序号双检查丢弃迟到响应；未初始化返回 Onboarding，退出立即清空 Store。ImportPreview 在 app 契约导出，页面不再依赖 data 类型。
  </action>
  <verify>pnpm exec vitest run tests/ui/AppStoreSession.test.tsx</verify>
  <done>会话恢复、未初始化、读取失败、退出与快速切账号都不会泄露旧账号数据，覆盖 AC-2、AC-3、AC-6、AC-15。</done>
  <depends_on>T05,T06</depends_on>
</task>

<task id="T09" parallel="false" status="done">
  <name>实现 AppStore 的服务端确认写入状态机</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    src/app/AppStore.tsx
    src/data/demo.ts
    src/data/supabaseRepository.ts
    src/domain/store.ts
    src/domain/types.ts
    tests/ui/AppStoreSession.test.tsx
  </read_files>
  <write_files>
    src/app/AppStore.tsx
    tests/ui/AppStoreWrites.test.tsx
  </write_files>
  <action>
    将 commit、beginEmpty、beginDemo、confirmImport、reload 改为 Promise&lt;boolean&gt;；保存中拒绝重复动作，只有 Postgres 成功后发布候选或重读 Store。
    失败保留最后确认 Store并设置持续错误；成功清除错误并产生具体 notice；导出只序列化当前账号完整 Store，不回退 localStorage。
  </action>
  <verify>pnpm exec vitest run tests/ui/AppStoreWrites.test.tsx</verify>
  <done>初始化、普通写入、导入和失败路径都以服务端确认为准，覆盖 AC-9～AC-16 的应用状态部分。</done>
  <depends_on>T07,T08</depends_on>
</task>

<task id="T10" parallel="false" status="done">
  <name>实现账号入口、真实加载门与初始读取错误页</name>
  <read_files>
    .specs/local-postgres-backend/UI-DESIGN.md
    openspec/changes/build-habit-review-mvp/UI-spec.md
    src/App.tsx
    src/app/AppStore.tsx
    src/auth/AuthContext.tsx
    src/components/Brand.tsx
    src/pages/OnboardingPage.tsx
    src/pages/RecoveryPage.tsx
    src/styles.css
  </read_files>
  <write_files>
    src/App.tsx
    src/pages/OnboardingPage.tsx
    src/styles.css
    tests/ui/AuthGate.test.tsx
  </write_files>
  <action>
    按 UI-DESIGN 复用 Onboarding 的灰绿画布与单面板，增加默认登录、文字切换注册、显式 label、busy 文案和可读字段错误；不增加确认密码、找回密码或 OAuth。
    App 组合 AuthProvider 与 AppStoreProvider，区分会话恢复、账号读取、未初始化、认证失败和数据失败；加载时只显示真实文字，不显示旧 Store 或 skeleton。
    只补确认的 OKLCH 语义 alias、焦点、44px 控件和 reduced-motion 样式，不重做既有视觉体系。
  </action>
  <verify>pnpm exec vitest run tests/ui/AuthGate.test.tsx</verify>
  <done>未登录只能看到可访问账号入口，加载和失败状态真实可辨，注册登录成功才进入数据空间，覆盖 AC-1～AC-3、AC-10、AC-15～AC-17。</done>
  <depends_on>T09</depends_on>
</task>

<task id="T11" parallel="false" status="done">
  <name>扩展应用壳账号区与持久保存状态</name>
  <read_files>
    .specs/local-postgres-backend/UI-DESIGN.md
    openspec/changes/build-habit-review-mvp/UI-spec.md
    src/components/AppShell.tsx
    src/app/AppStore.tsx
    src/auth/AuthContext.tsx
    src/styles.css
  </read_files>
  <write_files>
    src/components/AppShell.tsx
    src/styles.css
    tests/ui/AppShell.test.tsx
  </write_files>
  <action>
    保持四项一级导航不变；桌面显示本机账号数据、邮箱与退出，手机显示标识和具名 44px 退出图标。
    保存成功沿用 aria-live Toast；写入失败改为持续 role=alert 错误条，直到成功、关闭或退出；退出不使用危险样式和确认框。
  </action>
  <verify>pnpm exec vitest run tests/ui/AppShell.test.tsx</verify>
  <done>账号、退出、保存中、已保存和未保存状态在桌面与手机均可读且不改变导航，覆盖 AC-3、AC-15、AC-17。</done>
  <depends_on>T10</depends_on>
</task>

<task id="T12" parallel="true" status="done">
  <name>改造管理与恢复页的异步账号数据操作</name>
  <read_files>
    .specs/local-postgres-backend/UI-DESIGN.md
    src/pages/ManagePage.tsx
    src/pages/RecoveryPage.tsx
    src/app/AppStore.tsx
    src/components/HabitForm.tsx
    src/components/Modal.tsx
    src/domain/store.ts
    src/domain/types.ts
  </read_files>
  <write_files>
    src/App.tsx
    src/app/AppStore.tsx
    src/data/repository.ts
    src/data/supabaseRepository.ts
    src/components/HabitForm.tsx
    src/components/Modal.tsx
    src/pages/ManagePage.tsx
    src/pages/RecoveryPage.tsx
    supabase/migrations/202608010002_replace_user_store_result.sql
    supabase/tests/database/004_replace_user_store_result.sql
    tests/data/supabase-repository.test.ts
    tests/data/supabase-repository-write.test.ts
    tests/ui/AppStoreSession.test.tsx
    tests/ui/AppStoreWrites.test.tsx
    tests/ui/AuthGate.test.tsx
    tests/ui/ManageRecovery.test.tsx
  </write_files>
  <action>
    所有创建、编辑、归档和确认导入都 await AppStore 结果；操作中禁用对应控件，只有成功才关闭表单或确认框。
    ImportPreview 从 app 契约取得；更新当前账号、本机数据库、完整 JSON 备份和原数据未覆盖文案。取消或无效导入不得调用 Repository。
    审查修复：区分初始读取的数据完整性失败与普通后端读取失败；前者进入可达的 RecoveryPage，并允许原子替换恢复，后者仍只允许重试或退出。恢复失败保留 ImportPreview 并可直接重试。习惯保存 pending 时提供可见且可播报的状态，关闭控件真实禁用，焦点保持在弹窗内。
    复审修复：replace_user_store 在同一事务内返回由落库行重建的完整 Store，客户端以该 RPC 结果作为服务端确认值，消除“RPC 已提交但后续回读失败却声称未覆盖”的歧义；无可用控件的 pending Modal 必须把 Tab/Shift+Tab 留在 dialog 内。
  </action>
  <verify>pnpm exec vitest run tests/ui/ManageRecovery.test.tsx tests/ui/AuthGate.test.tsx tests/ui/AppStoreSession.test.tsx tests/ui/AppStoreWrites.test.tsx tests/data/supabase-repository.test.ts tests/data/supabase-repository-write.test.ts; pnpm exec supabase db reset --local --no-seed; pnpm exec supabase test db --local</verify>
  <done>管理、导入导出与恢复不再把 Promise 当同步成功，失败保留界面和确认数据，覆盖 AC-9、AC-11～AC-15、AC-17。</done>
  <depends_on>T09,T11</depends_on>
</task>

<task id="T13" parallel="true" status="done">
  <name>改造今天页的异步打卡与最近七天纠正</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    .specs/local-postgres-backend/UI-DESIGN.md
    src/pages/TodayPage.tsx
    src/app/AppStore.tsx
    src/components/HabitForm.tsx
    src/components/HabitRow.tsx
    src/domain/dates.ts
    src/domain/store.ts
    src/domain/weeklyReport.ts
  </read_files>
  <write_files>
    src/pages/TodayPage.tsx
    tests/ui/TodayPage.test.tsx
  </write_files>
  <action>
    创建习惯、当天打卡和最近七天纠正全部 await commit；保存中阻止相同动作重复触发，失败保持最后确认完成量且不提前关闭创建框。
    不修改日期、目标锁定、有效期或周报领域函数，只验证持久化异步化未改变既有口径。
  </action>
  <verify>pnpm exec vitest run tests/ui/TodayPage.test.tsx</verify>
  <done>今天页只在服务端确认后呈现新完成量并保留既有七天规则，覆盖 AC-4、AC-5、AC-9、AC-15、AC-17。</done>
  <depends_on>T09,T11</depends_on>
</task>

<task id="T14" parallel="false" status="done">
  <name>迁移现有 React 回归到账号后端契约</name>
  <read_files>
    src/App.tsx
    src/app/AppStore.tsx
    src/auth/AuthContext.tsx
    src/data/repository.ts
    src/data/supabaseRepository.ts
    src/pages/*
    src/components/*
    tests/setup.ts
    tests/ui/App.test.tsx
    tests/ui/InsightsPage.test.tsx
    tests/domain/*
  </read_files>
  <write_files>
    tests/ui/App.test.tsx
    tests/ui/InsightsPage.test.tsx
  </write_files>
  <action>
    用可控 Auth 与 Repository 边界迁移现有 App 与 Insights 回归，保留创建、打卡、周报、洞察、归档、导入导出、焦点与弹窗测试；不得删除或弱化既有业务断言。
    新增旧 xunji.store.v1 与账号数据冲突、后端失败不采用候选值、退出清空内存但不删除服务端数据的回归。
  </action>
  <verify>pnpm test:run</verify>
  <done>全部 Vitest 通过，既有领域和 UI 闭环未退化且旧 localStorage 不成为权威，覆盖 AC-3、AC-9、AC-13～AC-15。</done>
  <depends_on>T12,T13</depends_on>
</task>

<task id="T15" parallel="false" status="done">
  <name>迁移核心 Playwright 流程并验证构建凭据边界</name>
  <read_files>
    .specs/local-postgres-backend/REQUIREMENT.md
    .specs/local-postgres-backend/UI-DESIGN.md
    playwright.config.ts
    vite.config.ts
    tests/e2e/app.spec.ts
    src/App.tsx
    src/styles.css
  </read_files>
  <write_files>
    src/styles.css
    src/app/AppStore.tsx
    tests/e2e/app.spec.ts
    tests/ui/AppStoreSession.test.tsx
  </write_files>
  <action>
    将现有 E2E 从 localStorage 首次进入改为测试账号注册或登录，保留创建、打卡、七天纠正、周报、洞察、归档、导入导出、离线应用壳与 320/390/768/1024/1440 响应式断言。
    离线断言改为应用壳可见但账号业务不可用；账号、状态、焦点、44px、role、aria-live 与 reduced-motion 按 UI-DESIGN 验证。
    使用非真实唯一测试邮箱；不得把密码、token 或个人数据输出到日志。构建后按 AC-19 扫描 src 与 dist。
    E2E 发现修复：1024～1199px 桌面顶栏不得由账号区遮挡导航；reduced-motion 必须取消新增页面/弹窗动画位移，而非仅缩短时长。
    审查修复：真实覆盖错误登录、退出与重登恢复；精确断言本次账号和写拦截命中；离线初始读取必须在有限时间进入明确失败 gate，恢复联网后可重试成功，禁止永久 loading。
  </action>
  <verify>powershell -NoProfile -Command 'pnpm build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; rg -n "service_role|SUPABASE_SERVICE_ROLE|postgresql://|signing_keys" src dist; if ($LASTEXITCODE -eq 0) { exit 1 }; if ($LASTEXITCODE -gt 1) { exit $LASTEXITCODE }; pnpm test:e2e -- tests/e2e/app.spec.ts --project=desktop'</verify>
  <done>核心浏览器闭环、响应式和可访问性 E2E 通过，且构建凭据扫描无高权限命中，覆盖 AC-1～AC-3、AC-9～AC-17、AC-19。</done>
  <depends_on>T14</depends_on>
</task>

<task id="T16" parallel="true" status="done">
  <name>验证同账号多浏览器上下文与账号隔离</name>
  <read_files>
    .specs/local-postgres-backend/REQUIREMENT.md
    src/data/supabaseRepository.ts
    supabase/tests/database/001_schema_rls.sql
    supabase/tests/database/002_replace_user_store.sql
    tests/e2e/app.spec.ts
  </read_files>
  <write_files>
    tests/e2e/backend.spec.ts
  </write_files>
  <action>
    使用两个独立 Playwright browser context 模拟独立浏览器会话：同账号在上下文 A 写入后，B 登录或刷新读取；B 修正后 A 刷新读取；退出重登仍恢复数据。
    再用账号 B 验证看不到账号 A 数据，并覆盖完整导出、原子导入、旧 localStorage 冲突与后端写入失败不本地回退。
    本任务提供自动化前置证据；TEST 阶段仍必须按 AC-4、AC-5 在真实 Chrome 与 Edge 完成人工 UAT，不能用两个 Chromium context 冒充最终跨浏览器结论。
  </action>
  <verify>pnpm test:e2e -- tests/e2e/backend.spec.ts --project=desktop</verify>
  <done>独立会话的同账号持久化、账号隔离和失败边界自动化通过，为真实 Chrome/Edge UAT 建立可重复前置条件，覆盖 AC-4～AC-8、AC-11～AC-15。</done>
  <depends_on>T15</depends_on>
</task>

<task id="T17" parallel="true" status="done">
  <name>建立 3650 条记录读取性能基线</name>
  <read_files>
    .specs/local-postgres-backend/REQUIREMENT.md
    .specs/local-postgres-backend/DESIGN.md
    src/app/AppStore.tsx
    src/data/supabaseRepository.ts
    tests/e2e/app.spec.ts
  </read_files>
  <write_files>
    tests/e2e/performance.spec.ts
  </write_files>
  <action>
    通过当前账号原子导入生成 10 个 Habit 与 3650 条 Completion，预热后连续刷新 20 次，从 Repository 开始读取计时到今天页列表和摘要可用。
    每次同时断言完整记录数，输出 20 个样本和 P95；门槛为至少 19 次不超过 1000ms。失败时只记录分段耗时，不自动增加索引或改变分页设计。
  </action>
  <verify>pnpm test:e2e -- tests/e2e/performance.spec.ts --project=desktop</verify>
  <done>20 次本机测量具有完整性与耗时证据，至少 19 次不超过 1 秒，满足 AC-18。</done>
  <depends_on>T15</depends_on>
</task>
```

```xml
<task id="T-FIX-04" parallel="false" status="done">
  <name>让成功 Toast 生命周期独立于动效</name>
  <read_files>
    .specs/local-postgres-backend/UI-DESIGN.md
    .specs/local-postgres-backend/REVIEW.md
    src/components/AppShell.tsx
    src/styles.css
    tests/ui/AppShell.test.tsx
    tests/e2e/app.spec.ts
  </read_files>
  <write_files>
    src/components/AppShell.tsx
    tests/ui/AppShell.test.tsx
    tests/e2e/app.spec.ts
  </write_files>
  <action>
    用组件 effect/timer 在固定时长后清除成功 notice，新 notice 或卸载时取消旧 timer；不得再依赖 CSS animationend 改变状态。保留现有视觉动画和失败持续显示。补 fake-timer 组件测试，并在 prefers-reduced-motion E2E 中证明成功 Toast 会自动消失。
  </action>
  <verify>pnpm exec vitest run tests/ui/AppShell.test.tsx；pnpm exec playwright test tests/e2e/app.spec.ts --project=desktop；pnpm typecheck</verify>
  <done>普通与 reduced-motion 下成功 Toast 都会按时消失；失败条仍持续，且验证全通过。</done>
  <depends_on>T15</depends_on>
</task>
```

```xml
<task id="T-FIX-03" parallel="false" status="done">
  <name>纳管本地后端运行与 TEST 覆盖率依赖</name>
  <read_files>
    .specs/local-postgres-backend/REQUIREMENT.md
    .specs/local-postgres-backend/DESIGN.md
    package.json
    pnpm-lock.yaml
    supabase/config.toml
  </read_files>
  <write_files>
    package.json
    pnpm-lock.yaml
    supabase/config.toml
    supabase/.gitignore
  </write_files>
  <action>
    将已确认目标栈所需的 @supabase/supabase-js、Supabase CLI、本地 Postgres 17/Auth/Data API 配置纳入版本控制；加入与 Vitest 同版本的 coverage-v8 项目级插件，保证 TEST 覆盖率可复现。不得读取或纳管 .env.local，不改变全局依赖或系统配置。
  </action>
  <verify>pnpm install --frozen-lockfile；pnpm exec vitest run --coverage --coverage.reporter=text；pnpm typecheck；pnpm exec supabase test db --local</verify>
  <done>干净安装可获得本地后端与覆盖率工具；覆盖率达到默认门槛，类型检查及 174 项数据库测试通过。</done>
  <depends_on>T04,T-FIX-02</depends_on>
</task>
```

```xml
<task id="T-FIX-02" parallel="false" status="done">
  <name>补齐本地 Postgres change 可执行回滚链路</name>
  <read_files>
    .specs/local-postgres-backend/TEST.md
    supabase/migrations/202607310001_local_postgres_backend.sql
    supabase/migrations/202607310002_local_postgres_backend.sql
    supabase/migrations/202608010001_account_user_id_defaults.sql
    supabase/migrations/202608010002_replace_user_store_result.sql
  </read_files>
  <write_files>
    supabase/rollback/local_postgres_backend.down.sql
  </write_files>
  <action>
    提供可执行的整 change down 脚本，按依赖逆序删除 replace_user_store RPC、completions、habits 与 user_data_state；不得触碰 auth schema 或其他既有对象。TEST 阶段以空库完整 up、执行 down、catalog 证明对象消失、再次完整 up 与 pgTAP 回归证明回滚链路。
  </action>
  <verify>pnpm exec supabase db reset --local --no-seed；执行 down 并验证 4 个对象均不存在；再次 reset 后运行 pnpm exec supabase test db --local</verify>
  <done>up→down→up 可重复，回滚只移除本 change 对象，恢复后 174 项数据库测试全部通过。</done>
  <depends_on>T01,T02,T-FIX-01,T12</depends_on>
</task>
```

---

## AC 覆盖索引

| AC | 任务 |
|---|---|
| AC-1～AC-3 | T04、T05、T08、T10、T11、T15 |
| AC-4～AC-6 | T06、T07、T13、T16 |
| AC-7～AC-8 | T01、T02、T05、T06、T16 |
| AC-9 | T03、T09、T12～T15 |
| AC-10 | T02、T07、T09、T10、T15 |
| AC-11 | T03、T06、T09、T12、T16 |
| AC-12～AC-13 | T02、T03、T07、T09、T12、T14～T16 |
| AC-14 | T03、T09、T14、T16 |
| AC-15～AC-16 | T05、T07～T16 |
| AC-17 | T10～T13、T15 |
| AC-18 | T06、T17 |
| AC-19 | T01、T04、T15 |

---

## 状态字段说明

- `status="pending"` — 未开始。
- `status="in_progress"` — 正在执行；同一时间只允许一个非并行任务为此状态。
- `status="done"` — verify 已通过并已生成任务 SUMMARY。
- `status="blocked"` — 阻塞，必须在下方记录原因与人工决策。

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| T03 | write_files 只允许改 Repository 与其测试，而 AppStore 调用方到 T08 才切换 | 已解除：用户授权连续执行整个 change；T03 仅建立纯编解码边界，调用方迁移仍由 T08 完成，最终交付前必须恢复全量 typecheck/test | 2026-08-01 DEV 恢复 |
| T04、T15～T17 | `.env.local` 不在任务修改范围，且内容未读取核验 | 只有运行时证明配置缺失或错误时，才请求修改批准 | 待执行 |

---

## Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 REVIEW / INTEGRATION 阶段追加，编号 `T-FIX-XX`。

```xml
<task id="T-FIX-01" parallel="false" status="done">
  <name>为记录级 Data API 写入注入当前账号所有权</name>
  <read_files>
    .specs/local-postgres-backend/DESIGN.md
    .specs/local-postgres-backend/T07-SUMMARY.md
    supabase/migrations/202607310001_local_postgres_backend.sql
    supabase/tests/database/001_schema_rls.sql
    src/data/supabaseRepository.ts
  </read_files>
  <write_files>
    supabase/migrations/202608010001_account_user_id_defaults.sql
    supabase/tests/database/003_user_id_defaults.sql
  </write_files>
  <action>
    为 public.habits.user_id 和 public.completions.user_id 设置 DEFAULT auth.uid()，使客户端不传 user_id 的 Data API insert/upsert 能以当前认证账号落库；保留 NOT NULL、外键、复合主键和全部 RLS 不变。
    pgTAP 覆盖账号 A 不传 user_id 时 Habit/Completion insert 成功且归属 A、复合冲突键重复 upsert 更新、A/B 相同逻辑键隔离、Completion 仅按 habit_id+date 删除时 RLS 只删当前账号行，以及显式伪造其他账号 user_id 仍被拒绝。
  </action>
  <verify>pnpm exec supabase db reset --local --no-seed; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; pnpm exec supabase test db --local supabase/tests/database/003_user_id_defaults.sql</verify>
  <done>真实 Postgres/RLS 证据证明 T07 无 user_id payload 的记录级 insert/upsert/delete 可用且账号隔离，关闭 T07 审查 Important。</done>
  <depends_on>T01,T07</depends_on>
</task>
```
