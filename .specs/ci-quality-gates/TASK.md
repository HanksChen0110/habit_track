# TASK: 建立 GitHub CI 四关与合并保护

- **Change ID**: `ci-quality-gates`
- **关联**: `@.specs/ci-quality-gates/REQUIREMENT.md`、`@.specs/ci-quality-gates/DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P]
Wave 2:            T03      (depends on T01)
Wave 3:            T04      (depends on T01, T02, T03)
Wave 4:            T05      (depends on T04)
```

> 同 wave = 可并行；本次由单一执行者按依赖顺序落地，避免 package lockfile 冲突。

---

## 任务清单

```xml
<task id="T01" parallel="true" status="done">
  <name>建立 Oxlint 基线与本地 lint 命令</name>
  <read_files>
    package.json
    pnpm-lock.yaml
    tsconfig.app.json
    vite.config.ts
    src/**/*.{ts,tsx}
    tests/**/*.{ts,tsx}
    .specs/ci-quality-gates/DESIGN.md
  </read_files>
  <write_files>
    package.json
    pnpm-lock.yaml
    .specs/ci-quality-gates/T01-SUMMARY.md
  </write_files>
  <action>
    按 D1 添加 Oxlint，并新增 `pnpm lint`：检查 src 与 tests、将 warnings 视为失败、启用 React 规则、关闭 Unicorn 默认插件。不得引入可绕过失败的脚本或不兼容的 TypeScript parser。
  </action>
  <verify>pnpm exec oxlint --version</verify>
  <done>AC-1 的 lint 命令存在，并实际覆盖 TypeScript / React 文件；首次规则问题交由 T03 修复。（2026-08-02 14:06）</done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true" status="done">
  <name>添加四个独立 GitHub Actions 质量 job</name>
  <read_files>
    package.json
    pnpm-lock.yaml
    .specs/ci-quality-gates/REQUIREMENT.md
    .specs/ci-quality-gates/DESIGN.md
  </read_files>
  <write_files>
    .github/workflows/ci.yml
    .specs/ci-quality-gates/T02-SUMMARY.md
  </write_files>
  <action>
    按 D2～D4 创建一个只读 CI workflow：仅在 `pull_request → main` 和 `push → main` 运行，job 名称固定为 lint、typecheck、test、build，四者各自使用冻结 pnpm lockfile 并调用同名对应脚本。不得读取 secrets 或生产配置。
  </action>
  <verify>git diff --check -- .github/workflows/ci.yml; rg -n "pull_request:|push:|contents: read|^  (lint|typecheck|test|build):|--frozen-lockfile|secrets:" .github/workflows/ci.yml</verify>
  <done>workflow 静态结构满足 AC-2、AC-3；真实 GitHub Actions 运行由 T04 验证。（2026-08-02 14:08）</done>
  <depends_on></depends_on>
</task>

<task id="T03" parallel="false" status="done">
  <name>修复首次 lint 暴露的真实违规</name>
  <read_files>
    package.json
    src/**/*.{ts,tsx}
    tests/**/*.{ts,tsx}
    .specs/ci-quality-gates/DESIGN.md
  </read_files>
  <write_files>
    src/**/*.ts
    src/**/*.tsx
    tests/**/*.ts
    tests/**/*.tsx
    .specs/ci-quality-gates/T03-SUMMARY.md
  </write_files>
  <action>
    运行 T01 引入的 lint；若命中，按 DESIGN 0.5 仅做不改变产品行为和测试断言语义的最小修复。若 lint 已通过，记录零源码改动证据。不得降级核心规则或使用 disable 注释掩盖问题。
  </action>
  <verify>pnpm lint</verify>
  <done>AC-1 的 lint 检查通过，且任何源码/测试修改均可追溯为 lint 合规修复。（2026-08-02 14:14）</done>
  <depends_on>T01</depends_on>
</task>

<task id="T04" parallel="false" status="done">
  <name>推送 CI workflow 并核验真实四关运行</name>
  <read_files>
    package.json
    pnpm-lock.yaml
    package.json
    .github/workflows/ci.yml
    .specs/ci-quality-gates/REQUIREMENT.md
    .specs/ci-quality-gates/DESIGN.md
    .specs/ci-quality-gates/T01-SUMMARY.md
    .specs/ci-quality-gates/T02-SUMMARY.md
    .specs/ci-quality-gates/T03-SUMMARY.md
  </read_files>
  <write_files>
    .specs/ci-quality-gates/T04-SUMMARY.md
    harness-tool-audit.md
  </write_files>
  <action>
    对 T01～T03 的原子提交执行相关本地四关；推送当前交付分支，并创建或复用一个目标为 main 的 draft PR 触发真实 Actions。读取该 run 的 jobs、命令和结论，确认名称精确为 lint、typecheck、test、build，且四项均成功。高风险 push 与 PR 创建按用户本轮自动授权审计。
  </action>
  <verify>gh pr view --json number,headRefName,baseRefName,statusCheckRollup,isDraft; gh run list --branch codex/local-postgres-backend --limit 5</verify>
  <done>AC-2、AC-3 的真实 GitHub Actions 证据已记录，四项质量门均为成功。（2026-08-02 14:16）</done>
  <depends_on>T01,T02,T03</depends_on>
</task>

<task id="T05" parallel="false" status="done">
  <name>配置 main required checks 并验证 PR 合并门禁</name>
  <read_files>
    .specs/ci-quality-gates/REQUIREMENT.md
    .specs/ci-quality-gates/DESIGN.md
    .specs/ci-quality-gates/T04-SUMMARY.md
    harness-tool-audit.md
  </read_files>
  <write_files>
    .specs/ci-quality-gates/T05-SUMMARY.md
    harness-tool-audit.md
    STATE.md
  </write_files>
  <action>
    读取真实 GitHub Actions check context 后创建或更新仅匹配 main 的 active ruleset：lint、typecheck、test、build 均为 required，要求分支最新，不加审批或其他限制。GET 回读 ruleset，并从 T04 的 PR 读取 mergeStateStatus 与 statusCheckRollup，记录 “四关成功时门禁放行；未完成/失败时按 ruleset 阻止合并” 的配置与运行时证据。高风险远端规则写入按用户本轮自动授权审计。
  </action>
  <verify>gh api repos/HanksChen0110/habit_track/rulesets; gh pr view --json number,mergeStateStatus,statusCheckRollup,isDraft</verify>
  <done>AC-4、AC-5 的 ruleset 与 PR 状态证据已记录；main 的 required checks 是四个精确 context。（2026-08-02 14:18）</done>
  <depends_on>T04</depends_on>
</task>
```

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

## Fix 任务（来自 REVIEW / INTEGRATION）

```xml
<!-- 占位 -->
```
