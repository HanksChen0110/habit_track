# 习惯追踪仪表盘项目约定

> 本文件与 `CLAUDE.md` 内容相同。Claude Code 读 `CLAUDE.md`，Codex 读 `AGENTS.md`。
> 修改任意一份后必须同步另一份，用 `diff CLAUDE.md AGENTS.md` 确认一致。

## 目标与产品边界

这是一个个人自用、本地优先的习惯记录与每周执行复盘工具。产品面向单个个人用户；本地开发使用 Supabase CLI Auth/Data API/Postgres，生产边界为 Vercel 静态前端 + Supabase 云端后端。

核心闭环：创建每日目标习惯、记录完成量、查看每周整体执行率与日期规律、导出或导入自己的数据。

产品基线以 `openspec/changes/build-habit-review-mvp/` 为准；已确认的账号后端与后续变更以 `.specs/archive/`、`.specs/CONTEXT.md` 和 `.specs/ARCHITECTURE.md` 为准。不扩展多人协作、提醒、连续天数、长期热力图、社交或 AI 建议。

## 结构

- `docs/`：历史产品设计、实施计划和使用说明；其中标注为"已替代"的文档不得作为实现依据。
- `openspec/changes/build-habit-review-mvp/`：当前 MVP 的提案、设计、能力规格、任务与评审记录。
- `src/`、`tests/`：应用源码与测试，遵循与其相邻的项目约定。

## 实现偏好

- 选择依赖少、可本地运行的 Web 技术栈。
- 数据结构优先保证可读、可导出、可恢复；所有日期使用本地日历日（`YYYY-MM-DD`）。
- 不为尚未确认的多人协作、跨账号共享或复杂计划规则预留抽象。

## 修改原则

- 只实现已确认范围；新增范围先更新设计文档并取得确认。
- 业务数据通过既有 Supabase Repository 写入 Postgres，账号隔离由 RLS 保证；页面和组件不得绕过数据层直接访问 Supabase。
- 修改后必须运行与改动相关的检查或测试，并报告结果。
- 不提交密钥、令牌或真实个人数据。

## 验证

- 实现行为必须有自动化测试或可重复的手动验证步骤。
- 发布前至少验证：创建习惯、当天打卡、最近 7 天纠正、周报统计、导入导出、刷新后数据保留。

## 提交与高风险操作

- 提交前先展示变更与验证结果。
- 删除文件、修改密钥或 CI/CD、数据库迁移、推送远端等操作必须先获得用户明确授权。

## 你正在协作一个使用 flow-kit 流程的项目

完整流程：`CHANGE → REQUIREMENT → DESIGN → TASK → DEV → TEST → REVIEW → INTEGRATION → ARCHIVE`

每阶段产物存到 `.specs/<change-id>/`，跨 change 文件存到 `.specs/`：
- `CHANGE.md` — 一次变更提案
- `REQUIREMENT.md` — 需求 + AC（Given/When/Then）+ v1·v2·out
- `DESIGN.md` — 技术决策 + ADR + 风险
- `TASK.md` — 原子任务（XML，含 verify + done）
- `<task-id>-SUMMARY.md` — 每任务完成报告
- `<task-id>-PROGRESS.md` — 任务中途清窗的快照（临时）
- `TEST.md` — 测试矩阵 + UAT
- `REVIEW.md` — 双轮审查
- `UAT.md` — 集成验证
- `.specs/CONTEXT.md` — 项目级共享上下文（术语、决策、偏好）
- `.specs/LESSONS.md` — 跨任务失败知识库
- `STATE.md`（仓库根）— 跨会话状态

## 角色红线（**必须遵守**）

- Architect 不写实现代码
- Dev 不改 REQUIREMENT.md / DESIGN.md（发现问题开新 CHANGE）
- Reviewer 不修代码（只产报告 + 修复 task）
- 同会话同时间只扮演一个角色，切换角色必须清窗

---

## R1 · 上下文与 Token

- **R1.1** 出现以下任一信号必须触发清窗：① 输入 token > 50k；② 复读已说过的内容；③ 同类错误连续 ≥ 2 次；④ 用户感觉对话打转
- **R1.2** 阶段切换时输出本阶段工件文件作为后续唯一上下文来源
- **R1.3** 引用历史决策必须用 `@文件路径`，禁止粘贴正文
- **R1.4** 不允许"我记得我们之前说过……"。所有决策必须可在 `.md` 里查到
- **R1.5 · 重启协议** 清窗前必须：① 写 `<task-id>-PROGRESS.md`（已完成 / 当前 / **已排除方案** / 待确认假设）；② 更新 STATE.md 中断任务字段；③ 输出"重启指令"给用户
- **R1.6 · 反重复** 清窗恢复后第一件事：读 PROGRESS.md「已排除方案」段，确认下一步不在该清单里。撞了必须先回答"本次与上次差异是 X"
- **R1.7 · 任务过大** 半路触发清窗 = task 拆得不够细。恢复后第一动作是在 TASK.md 里就地拆为 ≥ 2 个子任务
- **R1.8 · LESSONS 检查** DEV 任务进入实现前必须 grep `.specs/LESSONS.md`；命中条目必须显式声明"差异是 X"或"仍适用所以不重试"。INTEGRATION ARCHIVE 前必须按提名条件扫描并入库

## R2 · 阶段门

- **R2.1** 没 `CHANGE.md` 不能进 REQUIREMENT
- **R2.2** 没 `REQUIREMENT.md` 不能进 DESIGN
- **R2.3** 没正式 `TASK.md` 或用户显式提供的临时最小 TASK，不能写代码；每任务必含可执行 `verify`
- **R2.4** verify 未通过禁止标记完成
- **R2.5** REVIEW 标 Critical 项必须修复或显式接受
- **R2.6** UAT 失败自动重试 ≤ 3 轮，超限暂停
- **R2.7** 进入任意阶段前必须跑 Artifact Preflight Gate，检查上游 `.md` 工件是否齐全
- **R2.8** 缺上游工件必须回退生成，禁止伪造"已满足"
- **R2.9** `4-dev` 单点调用必须有正式 TASK 或用户显式提供的临时最小 TASK；AI 不得自行编造
- **R2.10** 前端 / UI 任务缺 `UI-DESIGN.md` 禁止进入 DEV；纯后端 / CLI / lib 才能跳过 2a

## R3 · 角色红线

见上方「角色红线」段。

## R4 · 提交与产物

- **R4.1** DEV 每任务一次原子提交，格式 `<type>(<change-id>): <task-id> <subject>`
- **R4.2** 代码改动必须伴随测试改动
- **R4.3** Bug 修复必须伴随回归测试
- **R4.4** 不能声称"完成"而没跑过 verify

## R5 · 测试纪律

- **R5.1** 测试用例必须从 AC 派生，禁止从实现派生
- **R5.2** 禁止用 mock 屏蔽真实失败
- **R5.3** 禁止删除 / 弱化测试来"修复"失败

## R6 · 反幻觉

- **R6.1** 引用外部 API / 字段名前必须 grep 验证存在性
- **R6.2** 不确定的事实必须明示"待确认"，禁止伪装已知
- **R6.3** 不能假设代码"应该可以工作"——必须实际跑 verify

## R7 · 范围控制

- **R7.1** 严禁悄悄扩大范围；超出 TASK.md 必须先停下更新或开新 CHANGE
- **R7.2** 同次提交不允许混入多个无关任务

## R8 · 语言

- **R8.1** 工件 `.md` 与项目主语言一致
- **R8.2** 代码标识符英文，注释允许中文

---

## 违规处理

检测到自己即将违反任一规则时，先输出：
` 规则 R{编号} 触发：<原因>。需要人工决策。`
然后停下等待，**禁止"自我授权"绕开规则**。

---

> 完整方法论与机制详见 `@flow-kit/METHODOLOGY.md`，本文件是其精简注入版。

## 工具授权边界

### 需要人工确认才能执行
- git push、强制推送、分支删除
- 删除、移动或归档文件与目录
- 修改 .env、密钥、CI 配置
- 新建或修改 schema、migration，执行 `supabase db reset`
- 安装新的全局依赖
- Docker Desktop 安装或系统级配置变更

### 可自主执行
- 本地测试、构建、lint（静态代码检查）、typecheck（类型检查）
- 项目内文件读写（受 write_files 边界约束）
- git add、commit（在已绑定的分支上）
- `supabase status`、只读查询和不改变 schema 的本地验证

### 审计
高风险操作每次执行后，在 harness-tool-audit.md 追加一行：
时间 | 工具 | 操作 | 是否需人批 | 结果 | 对应 TASK.md 条目

| 分级     | 新增项                                                             |
| ------ | --------------------------------------------------------------- |
| 需要人工确认 | 生产库任何 schema 变更、任何 delete、任何 `db push`、Vercel 生产环境变量修改、读取真实用户数据 |
| 可自主执行  | 本地测试与构建、开发/预发布环境的 schema 和 policy 只读查询                          |
