# SUMMARY: T02 - 添加四个独立 GitHub Actions 质量 job

- **Change ID**: `ci-quality-gates`
- **Task ID**: `T02`
- **完成时间**: 2026-08-02 14:08
- **AI 角色**: Dev

---

## 做了什么

新增单一 CI workflow，只在目标为 `main` 的 PR 或 `main` 推送时运行。workflow 以四个独立且精确命名的 job 执行现有 pnpm 脚本：`lint`、`typecheck`、`test`、`build`。每个 job 都使用 Node 24、pnpm 10.14.0、锁定依赖和只读仓库权限；没有 secrets、部署或生产配置引用。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `.github/workflows/ci.yml` | 新增 | 四个独立 GitHub Actions 质量 job |

## verify 输出

```text
$ git diff --check -- .github/workflows/ci.yml
(exit 0)

$ rg -n "pull_request:|push:|contents: read|^  (lint|typecheck|test|build):|--frozen-lockfile|secrets:" .github/workflows/ci.yml
4:  pull_request:
6:  push:
10:  contents: read
17:  lint:
29:      - run: pnpm install --frozen-lockfile
32:  typecheck:
44:      - run: pnpm install --frozen-lockfile
47:  test:
59:      - run: pnpm install --frozen-lockfile
62:  build:
74:      - run: pnpm install --frozen-lockfile
```

真实 Actions YAML 解析、job 显示名与日志将在 T04 的远端 run 中验证。

## 沿用既有抽象 grep（R6.4）

- CI workflow：实现前检查 `.github/`，结果为不存在；按 DESIGN D2 新建唯一 workflow。
- 质量命令：`package.json` 已存在 `lint`、`typecheck`、`test:run`、`build`；workflow 只调用这些公开 scripts，不复制命令逻辑。

## LESSONS 检查（R1.8）

- 运行 `rg -n -i "github actions|workflow|ruleset|required check|ci" .specs/LESSONS.md`，无命中 active 条目。

## 6 维自查

本任务仅新增 GitHub Actions 配置，不含生产代码。

- R1～R6：无业务逻辑、领域模型或应用模块依赖变化；四个重复 setup 块是独立 job 必需的可读性取舍，不引入运行时抽象。

## 数据库迁移

N/A。

## 越界检查

```text
✅ 越界检查（R6.5）：
  - TASK write_files：2 项（.github/workflows/ci.yml、T02-SUMMARY.md）
  - 实际实现 diff：1 项（.github/workflows/ci.yml）
  - Summary/TASK 状态作为流程工件由 4-dev 步骤 6/7 写入
  - 越界：0
```

## 破坏性变更

N/A。未删除或修改既有代码、公共导出或 API。

## 决策与偏离

- 无。真实 GitHub Actions 运行留给 T04，避免以本地文本检查代替远端验证。

## 是否触发新工作

- [ ] 触发新 fix-plan
- [ ] 触发 CONTEXT.md 更新
- [ ] 发现需求/设计问题

## 完成判定

- TASK.md 中对应任务已标记：是
- 提交：`chore(ci-quality-gates): T02 add CI workflow`（最终 hash 以 Git 历史为准）
