# CHANGE: 为循迹接入本地 Postgres 后端

- **Change ID**: `local-postgres-backend`
- **创建日期**: 2026-07-31
- **路径建议**: 完整
- **状态**: active

---

## Why（为什么做）

当前 Habit 和 Completion 只保存在各浏览器自己的 `localStorage` 中，无法验证同一账号跨浏览器读取同一份数据。本次建立最小本地账号与 Postgres 数据闭环，为后续在不牺牲既有记录、复盘和恢复能力的前提下替换浏览器单点存储提供正式变更边界。— 来源：用户本次需求、`@src/data/repository.ts:11-72`、`@.specs/ARCHITECTURE.md#adr-006--使用本地-supabase-作为账号与数据后端`、`@.specs/ARCHITECTURE.md#adr-007--账号隔离的关系型持久化与-rls`

## What（做什么）

- 接入本地 Supabase Auth、Data API 和 Postgres，提供最小邮箱密码注册、登录、会话恢复和退出。— 来源：用户于 2026-07-31 确认 0-change 建议、ADR-006
- Habit、Completion 进入关联账号的关系表并启用 RLS；Postgres 成为业务数据唯一真相源。— 来源：ADR-007
- 保留创建、编辑、归档、打卡、周报、洞察、示例数据及 JSON 导入导出；切换持久化边界不得让现有核心能力退化。— 来源：用户于 2026-07-31 确认、`@openspec/changes/build-habit-review-mvp/specs/responsive-pwa-experience/spec.md:3-8`
- Store v1 继续作为客户端领域投影和 JSON 格式；导入仍须完整校验、用户确认并原子替换当前账号的数据。— 来源：用户确认、`@openspec/changes/build-habit-review-mvp/specs/local-data-management/spec.md:14-60`、ADR-007
- 在同一台电脑上验证 Chrome 与 Edge 登录同一账号后读取同一份数据；跨浏览器更新以刷新或重新进入页面后可见为验收边界。— 来源：用户本次需求及 2026-07-31 0-change 确认

## 视觉调性（前端项目必填，由 0-change 步骤 0.6 预选填入）

- **选定**：沿用现有 `openspec/changes/build-habit-review-mvp/UI-spec.md`，不重新编号或选择新调性。
- **理由**：本次只新增最小账号入口与后端状态，不改变现有产品视觉语言；登录、错误和加载状态继续使用当前克制的工具型应用表达。— 来源：用户于 2026-07-31 确认、`@.specs/CONTEXT.md#ui-资产索引只索引不复制全文`
- **参考产品**：不新增；继续以 `.specs/CONTEXT.md` 中已有 UI 资产索引为准，避免引入未经确认的参考。
- **明确排除**：账号头像、装饰性账号中心、深色模式、新设计体系；它们与本次最小本地验证无关。— 来源：用户确认、`@openspec/changes/build-habit-review-mvp/UI-spec.md:136-140`

> 此选择会被 `UI-DESIGN.md` 继承；UI-DESIGN 只补登录、会话恢复、退出和后端错误状态，不重做既有页面视觉。

## 影响面

- [x] 影响 `REQUIREMENT.md`：新增账号、跨浏览器读取、账号隔离和后端失败行为。
- [x] 影响 `DESIGN.md` / 引入新 ADR：落实已接受的 ADR-006、ADR-007。
- [x] 影响现有 AC：替换“无账号 / 无后端 / 不同浏览器相互独立”的边界，并重审离线、恢复、导入导出和失败保护。
- [x] 影响数据模型 / 迁移：新增 Postgres 业务 schema、migration 与 RLS policy；旧 localStorage 不迁移。
- [ ] 影响外部 API 兼容性：不提供对外公共 API；Supabase Data API 只作为应用内部后端边界。
- [ ] 仅修复 bug，无范围变化。

## 范围排除（这次不做）

- 不部署公网、托管云后端或生产环境；本地 Supabase 不得对外暴露。
- 不验证跨设备或局域网访问，只验证同一台电脑的两个浏览器。
- 不做邮箱确认、找回密码、OAuth、头像和账号设置。
- 不做 Realtime、离线写入队列或冲突自动合并。
- 不自动迁移、覆盖或删除旧 `xunji.store.v1`。
- 不新增提醒、连续天数、社交、AI 建议或其他产品功能。

## 验收线（粗粒度，不是 AC）

- Chrome 创建习惯并打卡后，Edge 登录同一账号能够读取相同 Habit 和 Completion。
- Edge 修改记录后，Chrome 刷新或重新进入页面能够读取最新值。
- 第二个账号无法读取或修改第一个账号的数据。
- 刷新、退出并重新登录后，当前账号数据仍存在。
- 创建、编辑、归档、打卡、周报、洞察、示例数据和 JSON 导入导出继续可用。
- 后端或鉴权失败时不显示虚假成功，也不回退到 localStorage 写业务数据。

## 风险与未知

- Postgres 主键、复合外键、删除策略和检查约束：待 DESIGN 确认。
- JSON 原子替换使用数据库事务还是 RPC：待 DESIGN 确认。
- `supabase/config.toml` 的 `site_url` 与前端实际开发地址如何统一：待 DESIGN 验证。— 来源：`@supabase/config.toml:155-163`、`@vite.config.ts:1-37`
- Data API 超过当前 `max_rows = 1000` 时的分页策略：待 DESIGN 确认。— 来源：`@supabase/config.toml:16-18`
- 同步 AppStore 改为异步账号数据层后的并发写入、错误恢复和测试改造：待 DESIGN 确认。— 来源：`@src/app/AppStore.tsx:32-121`
- migration 只生成还是在本地执行，必须在 DEV 阶段按项目红线另行取得人工确认；本 CHANGE 不授权执行 schema 变更。— 来源：`@AGENTS.md`「工具授权边界」

## 架构对齐声明

- 本 change 不再触发新的项目级架构选择；它负责落实 A-architect 已确认的 ADR-006 与 ADR-007。
- `domain` 保持纯函数；页面和组件不得直接访问 Supabase 或业务 localStorage；数据访问层不得依赖 UI。— 来源：`@.specs/ARCHITECTURE.md#22-模块依赖规则hard-rules`
- 若后续 DESIGN 需要偏离上述 ADR 或 hard rules，必须暂停并重新进入架构决策，不得在实现阶段自行扩大范围。

---

> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`，本文件不再扩展。
