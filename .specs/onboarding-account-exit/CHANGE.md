# CHANGE: 补齐初始化页账号与退出入口

- **Change ID**: `onboarding-account-exit`
- **创建日期**: 2026-08-02
- **路径建议**: 最短（极简模式；增量 REQUIREMENT → DESIGN → UI-DESIGN → TASK → DEV → TEST → REVIEW → INTEGRATION）
- **状态**: withdrawn（当前主界面已满足目标，不进入 REQUIREMENT / DEV）

---

## 撤回说明

本提案源于对“账号尚未选择初始化方式”的过渡页观察，不能代表用户当前使用的已初始化主界面。用户随后提供当前 Chrome 截图并经同一生产页面复核：主界面已显示当前账号邮箱、“本机账号数据”和“退出账号”；实际点击退出成功返回登录入口，且重新登录后恢复同一账号的“学外语、跑步、阅读”3 条习惯。因此本 change 不再推进，不产生实现代码。文件保留作为误判更正记录，不删除、不移动。— 来源：2026-08-02 用户截图及 Chrome 生产 UAT

---

## Why（为什么做）

生产环境关闭错误开启的邮箱确认后，真实账号已可注册，Chrome 已获得有效会话，Supabase 也已有 1 个账号和 1 条账号初始化状态；这证明 Vercel 前端、Supabase Auth 与 Postgres 主链路已经连接。随后实测发现：当账号 Store 尚未选择“空白开始”或“载入示例”时，应用直接渲染 `OnboardingPage`，没有进入 `AppShell`，因此看不到当前账号邮箱，也没有“退出账号”入口，用户无法在初始化前切换账号。— 来源：2026-08-02 Chrome / Supabase 实测、`@src/App.tsx:182-218`、`@src/pages/OnboardingPage.tsx:7-63`、`@src/components/AppShell.tsx:74-107`

同一轮注册排障还确认：Supabase 的 `email_address_invalid` 与 `over_email_send_rate_limit` 会被当前 `mapAuthError` 统一转为“账号操作失败，请重试”，未满足已确认的“鉴权失败必须显示可读类别”约定。— 来源：2026-08-02 Supabase Auth 日志、`@src/auth/AuthContext.tsx:77-105`、`@.specs/archive/2026-08-01-local-postgres-backend/REQUIREMENT.md:195`

## What（做什么）

在已登录但尚处于初始化选择页时，显示当前账号邮箱和可直接操作的“退出账号”入口；退出沿用既有 Auth 契约，不删除 Postgres 数据、不弹确认框，失败时在当前页面持续显示安全可读错误。同时为生产已出现的无效邮箱与邮件额度错误补充明确的中文分类，不暴露 Supabase 原始错误内容。

## 视觉调性（前端项目必填，由 0-change 步骤 0.6 预选填入）

- **选定**：沿用既有“循迹” brownfield 视觉体系，不重新选型
- **理由**：本次是账号可达性热修复；既有灰绿画布、深墨操作、淡紫强调和 Noto Sans SC 已确认，实现应与当前界面无法区分
- **参考产品**：仓库现有 `UI-spec.md`、账号增量 `UI-DESIGN.md` 与已部署实现
- **明确排除**：不改为玩具、复古未来、奢华或其他新调性；它们会扩大范围并破坏既有产品一致性

> 来源：`@openspec/changes/build-habit-review-mvp/UI-spec.md`、`@.specs/archive/2026-08-01-local-postgres-backend/UI-DESIGN.md`、用户于 2026-08-02 确认采用极简 hotfix 路径。

## 影响面

- [x] 影响 `REQUIREMENT.md`
- [x] 影响 `DESIGN.md` / 引入新 ADR（只需增量 DESIGN，不新增 ADR）
- [x] 影响现有 AC（补强 AC-3“退出后返回账号入口”与鉴权失败可读类别 NFR）
- [ ] 影响数据模型 / 迁移
- [ ] 影响外部 API 兼容性
- [x] 仅修复 bug，无范围变化

## 范围排除（这次不做）

- 不新增邮箱确认、找回密码、OAuth、账号资料或删除账号能力。
- 不修改数据库 schema、RLS、Repository 数据结构、Vercel 环境变量或 Supabase密钥。
- 不自动替用户选择“空白开始”或“载入示例”，也不写入习惯或打卡测试数据。
- 不重做登录页、初始化页或 AppShell 的整体布局与视觉体系。

## 验收线（粗粒度，不是 AC）

- 已登录账号在初始化选择页能看见当前账号邮箱，并能直接退出到登录入口。
- 退出失败时保留当前会话页面并显示安全、可读、可重试的错误；成功退出不删除 Postgres 业务数据。
- 无效邮箱与邮件发送限额不再显示统一的“账号操作失败”，且生产部署后真实 Chrome 能完成注册、初始化、数据读取和退出闭环。

## 风险与未知

- 初始化页在桌面与手机布局不同，账号入口必须在两类视口都可见且不能遮挡现有选择卡片；具体布局进入 `UI-DESIGN.md`。
- “邮件发送限额”在当前生产配置关闭邮箱确认后不应再阻塞注册，但仍保留错误映射以覆盖未来配置漂移和找回密码等后续调用；本 change 不新增邮件能力。

---

> 后续 AC 与设计细节进入 `REQUIREMENT.md` / `DESIGN.md`，本文件不再扩展。
