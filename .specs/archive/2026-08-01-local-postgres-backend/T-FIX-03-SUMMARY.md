# T-FIX-03-SUMMARY — 纳管本地后端运行与 TEST 覆盖率依赖

- **状态**：done
- **来源 finding**：TEST 发现 Supabase 运行依赖与本地配置未进入分支，且项目缺少可复现覆盖率工具
- **提交**：`7db05ce`
- **提交信息**：`chore(local-postgres-backend): T-FIX-03 register local toolchain`

## 完成内容

- 在 `@package.json` 与 `@pnpm-lock.yaml` 纳管 `@supabase/supabase-js`、项目级 Supabase CLI 与 `@vitest/coverage-v8@4.1.10`。
- 纳管 `@supabase/config.toml`：本地 Postgres 17、Auth、Data API 与既定端口配置。
- 纳管 `@supabase/.gitignore`，排除 Supabase 临时目录与本地环境文件。
- 未读取、修改或纳管 `.env.local`。

## 验证证据

- `pnpm install --frozen-lockfile`：PASS，lockfile 无变化。
- 覆盖率：187/187 PASS；Statements 90.72%、Branches 79.34%、Functions 92.81%、Lines 93.61%。
- `pnpm typecheck`：PASS。
- pgTAP：4 文件、174/174 PASS。

## 边界

- 未安装全局依赖，未修改系统配置。
- 未纳管根 `.gitignore`、README、AGENTS/CLAUDE、OpenSpec 或其他既有工作区改动。
