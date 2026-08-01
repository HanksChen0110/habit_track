# T17 完成摘要

## 结果

- **状态**：完成，独立复审 APPROVED。
- **提交**：
  - `cf8d469 test(local-postgres-backend): T17 baseline paginated read performance`
  - `800d46d test(local-postgres-backend): T17 bind samples to refresh requests`

## 基线方法

- 通过 UI 注册测试账号并原子导入 10 个 Habit × 365 个有效日历日，共 3650 条 Completion。
- 预热刷新不计入样本；随后严格测量 20 次刷新。
- 起点为该轮首个 `user_data_state` GET；终点为今天页 10 行 Habit 与摘要可用。
- 只统计本轮起点后捕获的同一 Playwright `Request` 对象响应，并用唯一 `Content-Range` 强制恰好：habits `0-9/*` 一页；completions `0-999/*`、`1000-1999/*`、`2000-2999/*`、`3000-3649/*` 四页。
- 每个样本都从响应 JSON 精确累计 10/3650，旧响应、背景请求或重复页不能静默计入。

## 本轮新鲜结果

- 20 个样本：172.5～281.0ms。
- P95：259.1ms。
- 完整性：20/20。
- ≤1000ms：20/20（门槛要求至少 19/20）。
- 独立复审复跑 P95 258.9ms，同样 20/20 完整且 20/20 ≤1s；APPROVED。

## 范围说明

- 未修改索引、分页、生产逻辑或 `.env.local`；未输出凭据，未 push、未部署。
- 本结果是当前本机/local Supabase 基线，不外推到生产网络或其他硬件。
