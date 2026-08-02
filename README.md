# 循迹

“循迹”是一个个人自用、本地优先的习惯完成量记录与每周执行复盘 PWA。用户通过本机 Supabase Auth 登录，习惯与打卡记录存入 Postgres；同一账号可在不同浏览器读取同一份数据，并可通过 JSON 导入导出备份。

## 本地运行

需要 Node.js、pnpm、Docker Desktop 与 Supabase CLI（项目已声明本地 CLI 依赖）。

首次运行先安装依赖并启动本地后端：

```bash
pnpm install
pnpm exec supabase start
```

前端需要未提交的 `.env.local`，其中配置 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`；本地值可从 `pnpm exec supabase status` 获取。不要把 `.env.local`、数据库密码或 service-role key 提交到 Git。

后端与 `.env.local` 就绪后，可以双击项目根目录的 `start-local.cmd`；它只负责启动 Vite 前端并自动打开浏览器。使用期间不要关闭命令窗口。

不要直接双击 `index.html`。Vite 项目必须通过 `http://` 本地服务器运行，使用 `file://` 打开会导致 React 模块无法加载。

也可以在终端运行：

```bash
pnpm install
pnpm dev
```

浏览器打开终端显示的本地地址。首次进入可以创建空白数据，也可以载入相对当前日期生成的两周示例。

## 验证

```bash
pnpm typecheck
pnpm test:run
pnpm exec supabase test db --local
pnpm build
pnpm test:e2e
openspec validate build-habit-review-mvp --type change --strict
```

端到端测试首次运行前，需要安装项目使用的 Chromium：

```bash
pnpm exec playwright install chromium
```

## 数据边界

- Store 固定为版本 1，结构为 `habits` 与 `completions`。
- 日期统一使用浏览器本地日历日 `YYYY-MM-DD`。
- 导入会先完整校验并预览，确认后才替换当前数据。
- 账号数据由 Postgres 关系表、RLS 与原子替换 RPC 保护；客户端不持有高权限凭据。
- 本地开发使用 Supabase CLI stack；生产边界为 Vercel 静态前端 + Supabase 云端 Auth/Data API/Postgres，前端部署尚未完成。
- 不包含提醒、连续天数、备注、社交或 AI 建议。

## 当前规格

产品基线来自 [OpenSpec 变更](openspec/changes/build-habit-review-mvp/)：

- [提案](openspec/changes/build-habit-review-mvp/proposal.md)
- [产品与交互设计（含双端低保真线框）](openspec/changes/build-habit-review-mvp/design.md)
- [能力规格](openspec/changes/build-habit-review-mvp/specs/)
- [实施任务](openspec/changes/build-habit-review-mvp/tasks.md)
- [多视角评审记录](openspec/changes/build-habit-review-mvp/review.md)

后续已确认的账号后端、响应式修复和验证证据见 [Flow Kit 归档](.specs/archive/)，项目级边界见 [共享上下文](.specs/CONTEXT.md) 与 [架构决策](.specs/ARCHITECTURE.md)。

最终高保真视觉与交互约定见 [设计系统与双端交互](docs/design/high-fidelity-prototype.md)。

三人 21 天验证流程见 [小范围试用说明](docs/trial/21-day-pilot.md)。
