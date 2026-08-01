# T04-SUMMARY — 建立唯一 Supabase 客户端与固定本地前端地址

- **状态**：done
- **Change ID**：`local-postgres-backend`
- **任务**：T04
- **提交**：`8920c226cba9d30682a888368240c930e4549198`
- **提交信息**：`feat(local-postgres-backend): T04 add Supabase client config`

## 完成内容

- 新增唯一浏览器 Supabase client，只读取 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`。
- 缺少 URL 或 publishable key 时抛出带稳定 `code` 的配置错误，不回显凭据。
- 固定 Vite dev server 为 `127.0.0.1:3000`，并启用 `strictPort`，对齐 Supabase Auth `site_url`。

## 实现文件

- `@src/data/supabaseClient.ts`
- `@vite.config.ts`
- `@tests/data/supabase-client.test.ts`

## 验证证据

- RED：固定 server 断言与缺 URL 分类错误断言先后按预期失败。
- GREEN：`pnpm exec vitest run tests/data/supabase-client.test.ts`，5/5 PASS。
- `pnpm typecheck`：PASS。
- 高权限凭据源码扫描：0 命中。
- 独立审查经两轮测试覆盖修复后，Spec compliance 与 Task quality 均 APPROVED。
- `git diff --cached --check`：通过。

## 范围与后续

- 未读取或修改 `.env.local`，未启动 Supabase，未执行真实认证请求。
- 真实 Auth / Data API 路径由后续 T05～T09 覆盖。
