# SUMMARY: T05 - 配置 main required checks 并验证 PR 合并门禁

- **Change ID**: `ci-quality-gates`
- **Task ID**: `T05`
- **完成时间**: 2026-08-02 14:18
- **AI 角色**: Dev

---

## 做了什么

根据真实 GitHub Actions check run 读取到的 context 与 integration ID，创建并回读了 `main` 的 active ruleset。ruleset 只匹配默认分支，要求 `lint`、`typecheck`、`test`、`build` 四项 GitHub Actions check 成功，且启用严格最新分支策略；没有增加审批、自动合并、分支删除或其他规则。

## 远端配置证据

- Ruleset：[main-ci-required-checks](https://github.com/HanksChen0110/habit_track/rules/20223088)，ID `20223088`，`target: branch`，`enforcement: active`。
- 匹配条件：`~DEFAULT_BRANCH`（当前为 `main`）。
- `required_status_checks`：`lint`、`typecheck`、`test`、`build`，均绑定 GitHub Actions integration ID `15368`。
- `strict_required_status_checks_policy: true`；`bypass_actors: []`；不添加人工审批或其他限制。

## PR 状态证据

PR [#1](https://github.com/HanksChen0110/habit_track/pull/1) 在 ruleset 生效后回读为：

```text
mergeStateStatus: CLEAN
lint: SUCCESS
typecheck: SUCCESS
test: SUCCESS
build: SUCCESS
```

这是“四关成功时不再由四关阻挡合并”的运行时证据。对“任一失败或未完成时阻止合并”，规则由 active required status checks 强制执行；没有故意提交失败代码来污染分支验证。

## AC 对照

- AC-4：GET 回读确认 main active ruleset 的四个精确 context 与严格最新分支策略。
- AC-5：受 ruleset 约束的 PR 在四项成功时为 `CLEAN`；规则定义保证任一 required check 未完成或失败时阻止合并。

## 完成判定

- T05 已完成；DEV 阶段的 T01～T05 均有可重复证据。
- 下一阶段：TEST，按 AC 汇总完整测试矩阵与 UAT 记录。
