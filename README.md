# 循迹

“循迹”是一个单人、本地优先的习惯完成量记录与每周执行复盘 PWA。它没有账号或后端，全部数据保存在当前浏览器，可通过 JSON 备份迁移。

## 本地运行

需要 Node.js 和 pnpm。

最简单的方法是双击项目根目录的 `start-local.cmd`，它会启动本地服务器并自动打开浏览器。使用期间不要关闭命令窗口。

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
- 本地数据损坏时不会自动初始化或覆盖，必须使用有效备份恢复。
- 不包含账号、云同步、提醒、连续天数、备注、社交或 AI。

## 当前规格

唯一可实施来源是 [OpenSpec 变更](openspec/changes/build-habit-review-mvp/)：

- [提案](openspec/changes/build-habit-review-mvp/proposal.md)
- [产品与交互设计（含双端低保真线框）](openspec/changes/build-habit-review-mvp/design.md)
- [能力规格](openspec/changes/build-habit-review-mvp/specs/)
- [实施任务](openspec/changes/build-habit-review-mvp/tasks.md)
- [多视角评审记录](openspec/changes/build-habit-review-mvp/review.md)

不纳入 MVP：账号、云同步、提醒、连续天数、长期热力图、备注、社交与 AI 建议。数据仅保存在当前浏览器；导入导出用于备份或迁移，不是日常同步。

最终高保真视觉与交互约定见 [设计系统与双端交互](docs/design/high-fidelity-prototype.md)。

三人 21 天验证流程见 [小范围试用说明](docs/trial/21-day-pilot.md)。
