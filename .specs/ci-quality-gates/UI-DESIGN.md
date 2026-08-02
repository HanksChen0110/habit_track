---
name: "循迹 · CI lint 交互修复补充"
description: "零视觉变更；Modal 的 React Hooks 合规修复必须继续使用既有灰绿画布、深墨操作和淡紫记录强调。"
colors:
  brand: "oklch(70.4% 0.144 296.5)"
  brand-deep: "oklch(49.2% 0.165 293.3)"
  bg: "oklch(94% 0.004 157.2)"
  surface: "oklch(100% 0 0)"
  text-primary: "oklch(22% 0.008 4.2)"
  text-secondary: "oklch(52.7% 0.011 161.1)"
  border: "oklch(91.2% 0.006 153.8)"
typography:
  body:
    fontFamily: '"Noto Sans SC Variable", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
rounded:
  control: "12px"
  panel: "24px"
motion:
  fast: ".2s ease"
---

# UI Design: CI lint 交互修复补充

## 0. 视觉语汇对齐

### 0.1 观察报告（代码为源）

- **Token 源**：`src/styles.css:1-37`；已有颜色、圆角、阴影和动效均以 CSS custom properties 定义。
- **中性色与强调色**：灰绿 `--color-bg` 为画布、深墨 `--color-text-action` 为主操作、淡紫 `--color-brand` 只作记录/焦点强调；本次不增加任何 token 或硬编码色值。
- **交互反馈**：已有控件用 `var(--motion-fast)` 做颜色/位移反馈，焦点使用 `--focus-ring`；Modal 的焦点恢复修复不改变这些表现。
- **图标与文案**：沿用 `lucide-react` 和已有“循迹”中性文案；本次不新增可见文案或图标。

### 0.2 用户校准结论

- 既有 UI 基线已由用户确认；本 change 的 CHANGE.md 明确排除 UI 重做。
- 用户于 2026-08-02 授权自动完成后续流程；因本次没有可见布局或 token 变更，不再单独发起 v0 视觉确认。

### 0.3 应用策略

- **沿用**：所有既有 token、Modal CSS class、键盘焦点与 close 按钮外观。
- **延伸**：无。
- **打破**：无。

## 1. 美学北极星

“循迹”保持安静、低干扰的记录界面；本次 lint 修复只保障 effect cleanup 的焦点恢复正确，不对视觉北极星产生任何可见变化。

### v0 确认摸路

- **已确认的假设**：本次没有新增界面元素、颜色、字体、间距或文案。
- **用户指出的偏差**：无；本 change 的范围是 CI 质量门，不是视觉改版。

## 2. 4 个决策问题

- **目的**：保障 Modal 的键盘焦点恢复实现通过 lint，同时保持用户当前看到的界面不变。
- **调性**：沿用既有“灰绿画布 + 深墨操作 + 淡紫强调”；理由是没有新增 UI 功能，任何重设调性都是范围扩大。
- **约束**：React 19、既有 `src/styles.css` token、键盘可达和可见焦点；不新增 UI 依赖。
- **差异化**：用户不会感知视觉差异，但键盘用户在关闭 Modal 后继续获得可靠的焦点恢复。

## 3. 颜色系统

不新增、不修改颜色。实现必须继续使用 `src/styles.css` 中的既有 token；不允许为 lint 修复写新的 CSS 或内联样式。

## 4. 字体系统

不新增、不修改字体。沿用 `Noto Sans SC Variable` 及既有本地中文 fallback；本次不引入 Inter、Roboto、Arial 或 Helvetica。

## 5. 间距、圆角与动效

不新增、不修改间距、圆角、阴影或动效。Modal 的 DOM class 与 CSS 选择器保持原样。

## 6. 关键组件规约

| 组件 | 本次约束 |
|---|---|
| Modal | 保持 `modal` / `modal-backdrop` class、dialog role、ESC 关闭和焦点陷阱；仅修正 cleanup 中对已捕获焦点节点的引用。|
| Button | 外观、尺寸、hover/focus token 不变。|
| Input / Field | 不触碰。|
| Card / Container | 不触碰。|
| Navigation | 不触碰。|

## 7. Do's and Don'ts

### Do

- 保持关闭 Modal 后焦点回到打开前的元素。
- 继续使用语义化 `role="dialog"`、`aria-modal` 与可见 focus ring。

### Don't

- 不新增 CSS、内联样式、颜色、字体、阴影或动效。
- 不以 `oxlint-disable` 注释绕过 React Hooks 警告。
- 不因 lint 修复改变 ESC、Tab、Shift+Tab、关闭按钮或 backdrop 的可见行为。

## 8. 占位符策略

本次无图标、图片、头像、数据或品牌素材新增；不使用 emoji、虚构数据或占位素材。

## 9. 反 AI-slop 自检结果

- [x] 未新增字体、颜色、渐变、阴影、边框或动效。
- [x] 未新增卡片、营销 KPI、占位图片或文案。
- [x] 保留现有可见焦点与键盘可达行为。
- [x] 未引入 UI 依赖或强制点击绕过。

## 10. 触发任务

- T03：只修复 `src/components/Modal.tsx` 的 effect cleanup ref 使用；不产生新的 UI 任务。

---

> 来源：`@src/styles.css:1-37`、`@src/components/Modal.tsx:1-79`、`@.specs/ci-quality-gates/CHANGE.md`、用户 2026-08-02 自动推进授权。
