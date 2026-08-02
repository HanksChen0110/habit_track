# SUMMARY: T01 - 建立 Oxlint 基线与本地 lint 命令

- **Change ID**: `ci-quality-gates`
- **Task ID**: `T01`
- **完成时间**: 2026-08-02 14:06
- **AI 角色**: Dev

---

## 做了什么

删除了未提交且已验证不支持 TypeScript 7 的 ESLint 配置与 6 个相关依赖（用户已明确批准），新增 Oxlint 1.76.0 与 `pnpm lint`。命令检查 `src` 和 `tests`，将 warning 视为失败，启用 React 规则并关闭本项目不采用的 Unicorn 默认插件。首次真实运行定位两处待 T03 修复的违规；T01 只建立可执行基线，不伪报 lint 已绿。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `package.json` | 修改 | 新增 Oxlint 开发依赖和 `lint` script |
| `pnpm-lock.yaml` | 修改 | 锁定 Oxlint 及平台可选 binary |

## verify 输出

```text
$ pnpm exec oxlint --version
Version: 1.76.0
```

## 沿用既有抽象 grep（R6.4）

- Lint 配置 / 命令：实现前运行 `rg -n -i "eslint|biome|oxlint|lint" package.json pnpm-lock.yaml vite.config.ts tsconfig.app.json src tests`，未发现既有 lint 配置或 script；因此按 DESIGN D1 新增单一 `package.json` 入口。
- 包管理：`package.json` 声明 `pnpm@10.14.0`，沿用 pnpm 与 lockfile，不引入第二个包管理器。

## LESSONS 检查（R1.8）

- 运行 `rg -n -i "eslint|lint|package|dependency|lockfile|pnpm" .specs/LESSONS.md`，无命中 active 条目；本次与既有 Auth 竞态、响应式测试问题无关。

## 6 维自查

本任务仅修改依赖与 package script，不含生产代码，6 维生产代码审查不适用。

- R1～R6：未新增应用逻辑、领域模型、模块依赖或重复实现。

## 数据库迁移

N/A。本任务未触及 schema、migration 或 Supabase。

## 越界检查

```text
✅ 越界检查（R6.5）：
  - TASK write_files：3 项（package.json、pnpm-lock.yaml、T01-SUMMARY.md）
  - 实际实现 diff：2 项（package.json、pnpm-lock.yaml）
  - Summary/TASK 状态作为流程工件由 4-dev 步骤 6/7 写入
  - 越界：0
```

## 破坏性变更

N/A。删除的是本任务中刚创建、从未提交的 `eslint.config.js`；未删除既有代码、未改公共导出/API。

## 决策与偏离

- 原 D1 选择 ESLint，但真实 `pnpm lint` 报 `typescript-eslint does not support TS 7.0`。用户明确批准后切换为 Oxlint；CHANGE、REQUIREMENT、DESIGN 与 TASK 已同步修订。
- Oxlint 初次运行已定位两处真实违规，留给 T03 按既有行为做最小修复；没有通过降低 warnings 或 allow-failure 获取绿色。

## 是否触发新工作

- [ ] 触发新 fix-plan
- [x] 触发设计修订：用户批准 TypeScript 7 兼容的 Oxlint 替换
- [ ] 发现未解决需求/设计问题

## 完成判定

- TASK.md 中对应任务已标记：是
- 提交：`chore(ci-quality-gates): T01 add Oxlint baseline`（最终 hash 以 Git 历史为准）
