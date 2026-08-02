# SUMMARY: T04 - 推送 CI workflow 并核验真实四关运行

- **Change ID**: `ci-quality-gates`
- **Task ID**: `T04`
- **完成时间**: 2026-08-02 14:16
- **AI 角色**: Dev

---

## 做了什么

对包含 T01～T03 的交付分支执行本地四关，再推送到 GitHub 并创建目标为 `main` 的 draft PR。GitHub Actions 的真实 PR run 成功运行了精确的四个 job：`lint`、`typecheck`、`test`、`build`；每个 job 都执行冻结安装与对应 pnpm 命令。

## 远端证据

- PR：[\#1](https://github.com/HanksChen0110/habit_track/pull/1)，`codex/local-postgres-backend` → `main`，创建时为 draft。
- CI run：[30735572011](https://github.com/HanksChen0110/habit_track/actions/runs/30735572011)，事件为 `pull_request`，结论 `success`。
- 实际 GitHub Actions check integration：`github-actions`，ID `15368`；四个 context 均来自该 integration。

| Job | 结论 | 实际命令 |
|---|---|---|
| `lint` | success | `pnpm lint` |
| `typecheck` | success | `pnpm typecheck` |
| `test` | success | `pnpm test:run` |
| `build` | success | `pnpm build` |

GitHub runner 为 action 内部 Node 20 弃用提示给出了 annotation，但 Actions 强制以本 workflow 配置的 Node 24 执行，四个 job 均成功；这不是应用或 CI gate 失败。

## 本地 verify 输出

```text
$ pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
lint: exit 0
typecheck: exit 0
test: 20 files / 188 tests passed
build: exit 0
```

## AC 对照

- AC-1：本地四关均实际通过。
- AC-2：真实 PR run 显示精确 job 名 `lint`、`typecheck`、`test`、`build`，且全部成功。
- AC-3：workflow 仍为 `contents: read`，每个 job 运行 `pnpm install --frozen-lockfile`，无 secrets 或生产配置引用。

## 完成判定

- 已满足 T04；下一步 T05 以真实 check context 绑定 `main` ruleset。
