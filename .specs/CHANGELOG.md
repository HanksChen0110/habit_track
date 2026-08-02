# Flow Kit CHANGELOG

| 日期 | Change ID | 摘要 | PR | LESSONS |
|---|---|---|---|---|
| 2026-08-01 | `local-postgres-backend` | 接入本机 Supabase Auth + Postgres/RLS，实现同账号 Chrome↔Edge 数据共享、原子导入导出与完整验证 | —（未创建） | L-001、L-002、L-003 |
| 2026-08-02 | `mobile-performance-green` | 修复移动端弹窗层级，对齐响应式账号契约，并将 22 项功能与 2 项隔离性能基线恢复全绿 | —（直接 push 分支） | L-004 |
| 2026-08-02 | `ci-quality-gates` | 建立 Oxlint、GitHub Actions lint/typecheck/test/build 四关，并为 main 设置 required status checks；PR #1 与 main push 均验证全绿 | [#1](https://github.com/HanksChen0110/habit_track/pull/1) | L-005 |
