---
name: "循迹 · 移动端弹窗与响应式验证"
description: "沿用安静、克制、可信的极简工具界面；只修复弹窗实体层级，不改变既有视觉语汇"

# 本 change 不新增或修改 token；以下是 src/styles.css 现行权威值的索引化副本。
colors:
  brand: "oklch(70.4% 0.144 296.5)"
  brand-deep: "oklch(49.2% 0.165 293.3)"
  brand-soft: "oklch(95.5% 0.025 298.6)"
  bg: "oklch(94.0% 0.004 157.2)"
  surface: "oklch(100% 0 0)"
  surface-muted: "oklch(96.5% 0.003 145.5)"
  input: "oklch(98.7% 0.002 145.6)"
  text-primary: "oklch(22.0% 0.008 4.2)"
  text-action: "oklch(22.3% 0.012 359.0)"
  text-secondary: "oklch(52.7% 0.011 161.1)"
  text-tertiary: "oklch(55.9% 0.009 156.9)"
  border: "oklch(91.2% 0.006 153.8)"
  error: "oklch(50.5% 0.131 17.7)"
  focus-ring: "oklch(70.4% 0.144 296.5 / 0.38)"

typography:
  display:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.625rem)"
    fontWeight: 760
    lineHeight: 1.1
  headline:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 720
    lineHeight: 1.25
  title:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  supporting:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.4

spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "30px"
  "2xl": "38px"
  "3xl": "48px"

rounded:
  control: "12px"
  row: "16px"
  secondary: "20px"
  panel: "24px"
  pill: "999px"

motion:
  ease-standard: "ease"
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  duration-fast: "200ms"
  duration-base: "240ms"
  duration-reduced: "0.01ms"

shadow:
  navigation: "0 16px 40px rgba(34,31,32,.05)"
  panel: "0 24px 70px rgba(38,35,36,.07)"
  modal: "0 32px 90px rgba(29,24,25,.20)"

layer:
  content: 1
  topbar: 3
  mobile-navigation: 10
  modal: 20
  toast: 30
  skip-link: 50
---

# UI Design: 移动端与性能验证恢复全绿

- **Change ID**: `mobile-performance-green`
- **状态**: confirmed
- **关联**: `@.specs/mobile-performance-green/CHANGE.md`、`@.specs/mobile-performance-green/REQUIREMENT.md`、`@.specs/mobile-performance-green/DESIGN.md`
- **视觉权威**: `@openspec/changes/build-habit-review-mvp/UI-spec.md`、`@.specs/archive/2026-08-01-local-postgres-backend/UI-DESIGN.md`、`@src/styles.css`
- **范围**: 移动端创建习惯弹窗的覆盖与交互、桌面 / 移动账号区和今天页就绪状态的验证契约；不重做页面

## 0. 视觉语汇对齐

> 本项目是 brownfield。本 change 的目标是让修复后的元素与现有 UI 完全无法区分，而不是引入新的视觉方向。

### 0.1 观察报告（代码为源）

- **Token 源**：`@src/styles.css:1-34`；产品语义来自 `@openspec/changes/build-habit-review-mvp/UI-spec.md`。
- **主色实际比例**：灰绿画布、白色表面和深墨文字占绝大多数；淡紫只用于进度、选中和焦点，弹窗不新增紫色面积。
- **中性色**：画布 `oklch(94.0% 0.004 157.2)`、主文字 `oklch(22.0% 0.008 4.2)`、边框 `oklch(91.2% 0.006 153.8)`；保持轻微绿 / 暖倾向。
- **hover / focus**：可操作控件用边框加深、最多上移 1px 与低透明阴影；键盘焦点是 3px 淡紫外环。
- **动效语言**：CSS 驱动，颜色 / 边框 / transform 约 200ms，页面与弹窗 240ms 内完成一次入场；reduced-motion 时取消位移并把持续时间降到 `0.01ms`。
- **elevation / layer**：内容 1、顶栏 3、移动导航 10、弹窗 20、Toast 30、跳转链接 50；弹窗阴影是最高实体表面，不用任意的 `9999`。
- **卡片密度 / rounded**：受控留白，控件 12px、手机弹窗顶部 24px 圆角、桌面弹窗 22px；内部不套第二层装饰卡片。
- **图标**：统一 `lucide-react` 线性图标；移动退出是 19px 图标置于 44 × 44px 按钮，具有可读名称。
- **文案**：事实型、动作明确；“本机数据 / 本机账号数据 / 创建习惯 / 保存习惯 / 查看本周复盘”均保持现状。

### 0.2 用户校准结论

- 用户于 2026-07-31 对既有 brownfield 观察回复“看对了”，并以“go”确认 `@.specs/archive/2026-08-01-local-postgres-backend/UI-DESIGN.md`。
- 本 change 的 `CHANGE.md` 明确选择沿用该体系；用户又授权本次 change 后续批准并推动至全绿，因此本轮不重新选择调性或重复 v0 视觉评审。
- 本次唯一视觉结果是：移动端弹窗仍长得与现在相同，但成为真正位于底部导航之上的实体层。

### 0.3 应用策略

- **沿用**：全部字体、颜色、间距、圆角、阴影、Lucide 图标、文案、1024px 断点与页面信息架构。
- **延伸**：不新增视觉 token；只把现有弹窗层级规则落实到顶层 DOM 挂载边界。
- **打破**：无。禁止为修测试显示隐藏的桌面元素或新增移动端账号信息。

## 1. 美学北极星

**Quiet Physical Layer** —— 弹窗打开时应像一张明确覆盖当前工作区的实体纸面：视觉仍安静，但交互边界必须坚决。用户点击保存时，底部导航不应穿透或抢走动作；关闭后，原页面与焦点位置原样恢复。

### v0 确认摸路

- **已确认**：既有调性、token、账号信息架构和弹窗外观全部不变；仅修复挂载层级。
- **已确认**：手机保持“本机数据 + 退出图标”，不显示桌面邮箱或“本机账号数据”。
- **已确认**：手机今天页以“查看本周复盘”作为真实可见入口，桌面摘要保持隐藏。
- **已确认**：普通用户点击、键盘、Escape、焦点恢复和 reduced-motion 均是交付行为，不以 `force` 或隐藏节点断言替代。
- **偏差**：无；本轮没有新增图片、图表、组件或文案。

## 2. 4 个决策问题

- **目的**：让手机用户在创建习惯弹窗中完成填写与保存，并让自动化验证桌面 / 手机各自真实可见的账号和 Store 就绪状态；核心动作是填、保存、关闭和刷新后查看。
- **调性**：**极简**，具体为既有“安静、克制、可信”。
  - **理由**：这是个人高频记录工具；本次是交互缺陷修复，任何视觉翻新都会稀释问题并扩大回归面。
- **约束**：React 19 SPA + 原生 CSS；不新增依赖；Pixel 7 390 × 844 与 desktop 1440 × 1000；1024px 断点不变；触控目标至少 44 × 44px；完整键盘操作；`prefers-reduced-motion` 必须生效；性能门槛不变。
- **差异化**：安静但不含糊——弹窗视觉克制，层级和焦点行为却明确到不能被底部导航打断。

## 3. `ui-ux-pro-max` 候选与五维决策

### 3.1 字体

查询：

```text
py -3 C:\Users\admin\.cc-switch\skills\ui-ux-pro-max\scripts\search.py "calm minimal Chinese habit tracker productivity" --domain typography -n 3
```

前三候选：Wellness Calm（Lora + Raleway）、Chinese Simplified（Noto Sans SC）、Chinese Traditional（Noto Serif TC + Noto Sans TC）。

- **选择**：继续使用项目内置 `Noto Sans SC Variable`。
- **理由**：候选 2 与现有简体中文产品和本地字体资产完全一致；另外两组会引入在线字体、语言覆盖偏差或新的视觉性格。
- **brownfield 例外**：Display 与 Body 使用同一字体是已确认 UI-SPEC 约束；层级通过字号、字重、字距建立。本次不为通用“双字体”建议扩栈。

### 3.2 颜色

查询：

```text
py -3 C:\Users\admin\.cc-switch\skills\ui-ux-pro-max\scripts\search.py "calm minimal habit tracker grey green purple" --domain color -n 3
```

前三候选：Habit Tracker（琥珀 + 绿色）、Mood Tracker（紫 + 靛 + 琥珀）、Healthcare App（青 + 绿色）。

- **选择**：三者都不采用，沿用 frontmatter 的低 chroma 灰绿中性 + 单一淡紫记录强调。
- **理由**：候选均含两个以上高辨识 hue，会破坏既有 One Voice 规则；本 change 不需要任何新增语义色。
- **主色用途**：淡紫只用于焦点、选择和记录进度；弹窗遮罩、按钮和账号区不扩大紫色使用。

### 3.3 动效与触控

查询：

```text
py -3 C:\Users\admin\.cc-switch\skills\ui-ux-pro-max\scripts\search.py "mobile modal overlay bottom navigation focus reduced motion touch target" --domain ux -n 3
```

前三候选规则：Reduced Motion、Touch Target Size、Touch Spacing。

- **选择**：三项全部作为强制门槛；沿用现有 reduced-motion CSS，退出按钮保持 44 × 44px，弹窗内并列动作保持至少 8px 间距。
- **理由**：它们直接对应 AC-1～AC-3；portal 不应改变任何既有动效或控件尺寸。
- **禁止**：不加 bounce，不延长动画，不用强制点击，不让导航与弹窗形成重叠点击区域。

### 3.4 空间布局与层级

验证查询：

```text
py -3 C:\Users\admin\.cc-switch\skills\ui-ux-pro-max\scripts\search.py "animation accessibility z-index loading" --domain ux -n 5
```

与本 change 直接相关的前三候选规则：Stacking Context、Z-Index Management、Loading States。

- **选择**：保留 `1 / 3 / 10 / 20 / 30 / 50` 的既有层级刻度；Modal 呈现节点置于 body 顶层，使 `20` 真正高于导航 `10`。
- **理由**：问题来自 `.page-enter` transform 创建的嵌套堆叠上下文，而不是数字太小；提高到任意大值仍无法跨父级 context。
- **移动布局**：≤640px 继续是底部 sheet，宽 100%、顶部圆角 24px、底部包含 safe-area inset；≥641px 居中 dialog。
- **背景关系**：遮罩覆盖顶栏、内容与移动导航；页面不可接受点击，dialog 内部保持独立滚动。

### 3.5 背景、质感与 React 适配

React 查询：

```text
py -3 C:\Users\admin\.cc-switch\skills\ui-ux-pro-max\scripts\search.py "portal modal accessibility responsive testing" --stack react
```

前三候选规则：Use testing-library queries、Test behavior not implementation、Label form controls。

- **选择**：保留当前 `rgba(30, 25, 26, .32)` + 7px blur 遮罩、白色实体面板和既有 modal shadow；测试继续用 `dialog`、`button`、`label` 等可访问查询。
- **理由**：现有质感已经确认，本 change 只改变物理挂载；行为测试比断言 portal 容器或内部 React 状态更稳定。
- **图表**：本 change 不新增或修改图表，`ui-ux-pro-max --domain chart` 不适用。

## 4. Design Tokens

- frontmatter 是 `@src/styles.css:1-34` 的现行索引，不是新 token 提案。
- 本 change **不得**物化、重命名或批量转换 token，也不得借机把遗留 Hex / rgba 全局改写为 OKLCH。
- 唯一需要兑现的层级契约是：`mobile-navigation: 10 < modal: 20 < toast: 30 < skip-link: 50`；通过挂载边界兑现，不新增更大 z-index。

## 5. 关键组件规约

### 5.1 Modal Backdrop / Dialog

- **外观**：保持现有遮罩、模糊、白色表面、22px 桌面圆角和 modal shadow；≤640px 保持底部 sheet 外观。
- **挂载**：呈现层必须位于 `document.body` 顶层；业务状态仍归调用页面，不新增第二个 Modal 组件。
- **层级**：backdrop 的 20 必须实际覆盖 mobile nav 的 10；背景和导航不得接收点击。
- **滚动**：dialog 最大高度继续受视口限制，内容超出时只在 dialog 内滚动；移动底部保留 `env(safe-area-inset-bottom)`。
- **关闭**：关闭图标按钮至少 44 × 44px 的可操作区域，名称为“关闭{标题}”；背景点击只在直接点击 backdrop 且未禁用关闭时生效。
- **焦点**：打开后焦点进入第一个可操作项（当前是关闭按钮）；Tab / Shift+Tab 圈定；Escape 关闭；卸载后恢复触发按钮。
- **busy**：`closeDisabled` 时关闭按钮为原生 disabled，Escape 与背景点击均不关闭；保存动作保留现有尺寸和状态反馈。

### 5.2 Button（Primary / Secondary）

- **Primary**：保持深墨背景、白字、12px 圆角、至少 44px 高；“保存习惯”是 dialog 内唯一主动作。
- **Secondary**：保持白色 / 边框或文字型；取消与关闭不得比保存更突出。
- **状态**：hover 最多上移 1px；focus 使用 3px 淡紫环；disabled 降低强调并不可点击；普通点击必须能完成 AC-2，不允许测试 `force`。

### 5.3 Input / Field

- 显式 label 始终存在；习惯名称与每日目标保持 48px 最小高度、16px 输入文字、12px 圆角。
- focus 使用品牌边框和 3px soft ring，不改变控件尺寸；错误用相邻文字表达，不能只靠红色。
- portal 不改变 label / input 的可访问关系、表单提交或浏览器自动聚焦行为。

### 5.4 Account Cluster

| 视口 | 可见组 | 可见内容 | 隐藏内容 |
|---|---|---|---|
| desktop ≥1024px | `桌面账号` | “本机账号数据”、邮箱、文字“退出账号” | `移动账号` |
| mobile <1024px | `移动账号` | “本机数据”、44 × 44px 退出图标 | `桌面账号`、桌面邮箱、“本机账号数据” |

- 退出图标继续使用 Lucide LogOut 19px，并保留 `aria-label="退出账号"`；不增加头像、账号菜单或邮箱挤占手机顶栏。
- 1024～1199px 可按现有规则隐藏桌面本机标识并截断邮箱；完整值仍在可访问名称 / title 中。

### 5.5 Navigation 与 Today 响应式内容

- 四项导航、顺序和图标不变；移动导航固定在 safe-area 上方并继续使用层级 10。
- desktop 今天页：右侧 `.summary-panel` 可见，`.mobile-week-link` 隐藏。
- mobile ≤640px 今天页：`.summary-panel` 隐藏，习惯列表下的“查看本周复盘”可见。
- 测试的“就绪”必须跟随上述真实可见状态；禁止显示隐藏节点来满足自动化。

### 5.6 Card / Container 与 Typography Hierarchy

- 主要页面、Habit 行、摘要卡和 topbar 的外观全部不变；本 change 不新增卡片，也不允许 card 套 card。
- 标题、正文、Supporting、Label 全部沿用 frontmatter 与现有 CSS；不新增字号、字体或营销式文案。

## 6. Do's and Don'ts

### Do

- 让弹窗在视觉和点击层面完整覆盖移动导航。
- 使用命名账号 group、dialog role、按钮名称和 label 验证用户行为。
- 保留 44px 触控目标、焦点环、Escape、焦点恢复和 reduced-motion。
- 让桌面和手机各自使用真实可见的账号与今天页状态。
- 保持现有层级刻度，用正确 DOM 边界解决堆叠上下文。

### Don't

- 不用 `z-index: 9999`、强制点击或临时隐藏导航掩盖层级问题。
- 不把桌面邮箱、桌面账号标识或摘要强行显示在手机。
- 不新增紫色渐变、玻璃卡、装饰 glow、emoji、图片或第二套弹窗。
- 不改变 1024px 产品断点，不新增第五个导航项或账号中心。
- 不借修复全局清理遗留 Hex、阴影、动画或 CSS 排版。

## 7. 占位符策略

本 change 不需要新素材或占位符；如实现中意外出现素材需求，视为范围漂移并停止。

| 缺的东西 | 本项目现状 | 缺时处理 | 禁止 |
|---|---|---|---|
| 图标 | 已有 Lucide React | 复用现有语义图标；没有时使用文字按钮 | emoji、AI 自绘 SVG |
| 头像 | 明确不做 | 不显示、不预留 | AI 人脸、网抓图 |
| 图片 / 插画 | 本 change 不需要 | 不创建图片区 | stock photo、AI 生图 |
| 数据 | 来自真实账号 Store | 未加载完成显示真实文字状态 | 编造 Habit、完成率或性能样本 |
| logo | 已有 Brand | 原样复用 | 新绘 logo |
| 客户推荐 / KPI | 不适用 | 不创建区域 | 编用户名、评论或数字 |

本项目默认不使用 emoji。

## 8. 反 AI-slop 与 `ui-ux-pro-max` 自检结果

已逐条对照 `@flow-kit/reference/ui-anti-patterns.md`、`ui-ux-pro-max` quick-reference §1～§3 以及移动 UI pre-delivery checklist：

- [x] **字体**：不新增 Inter / Roboto / Arial / Helvetica / system-ui；沿用本地 Noto Sans SC brownfield 例外。
- [x] **颜色**：无新增 hue、渐变文字、紫色渐变或霓虹色。
- [x] **阴影**：只复用既有弹窗实体阴影，不新增静态卡片阴影或高 alpha 装饰阴影。
- [x] **边框 / 质感**：无彩色侧条、渐变边框或新 glassmorphism；现有 backdrop blur 只服务 modal 背景隔离。
- [x] **动效**：只沿用 opacity / transform；支持 reduced-motion；无 bounce、elastic 或布局属性动画。
- [x] **布局**：无新卡片、网格或横向滚动；mobile sheet 继续处理底部 safe-area。
- [x] **文案 / 素材**：无营销空话、Lorem ipsum、emoji 或编造数据。
- [x] **组件**：Modal 可 Escape，表单有 label，按钮有明确名称；移动端不依赖 hover。
- [x] **触控**：退出与关闭按钮至少 44 × 44px；相邻动作保持至少 8px；弹窗与导航不再形成冲突点击区域。
- [x] **层级**：保留可审计的 z-index scale；不使用任意大值跨越错误 stacking context。

### 已接受的 brownfield 例外

- `surface` 是既有纯白，Display / Body 同为 Noto Sans SC，主要大面板静止时有已确认阴影；本 change 不扩大这些例外。
- 现有 modal scrim 为 32% 深色并叠加 7px blur，低于原生移动规则常见的 40～60%参考范围；当前前景可读且视觉已确认，本 change 不改变 opacity。若未来做全站对比审计，应单独测量后再决策。
- pre-delivery checklist 中 dark mode、Dynamic Type 最大字号和横屏全站验证不属于本 change 已确认 AC；本轮必须验证的是 390 × 844、desktop 1440 × 1000、reduced-motion、44px 触控和无导航遮挡，不虚报其他项目已通过。

## 9. UI 相关 AC 映射

| AC | UI 落点 |
|---|---|
| AC-1 | desktop / mobile 命名账号组与各自可见内容；移动退出按钮 44 × 44px |
| AC-2 | body 顶层 Modal、backdrop 20 覆盖 mobile nav 10、普通保存点击成功 |
| AC-3 | 初始焦点、Tab 圈定、Escape、焦点恢复、reduced-motion 与居中 Toast |
| AC-4 | desktop 摘要可见；mobile 周报入口可见且摘要隐藏；两者均显示 10 个 Habit |
| AC-5 | 无新增 UI；以 AC-4 的真实可见节点定义性能完成时刻 |
| AC-6 | desktop / mobile 全量行为均执行，不跳过、不 force |
| AC-7 | 既有 UI 测试、类型和构建无回归 |
| AC-8 | 不改断点、隐藏规则、超时或视觉契约来制造全绿 |

## 10. 触发任务

进入 `3-task` 时，UI 相关任务必须包含：

- **T-UI-01**：以测试先行把既有 Modal 呈现挂载到 body 顶层；保留全部外观、焦点、Escape、busy、背景点击和 safe-area 规则。
- **T-UI-02**：修正 app / backend E2E 的响应式账号断言和手工 browser context 设备继承；不改 AppShell 产品结构。
- **T-UI-03**：修正 performance E2E 的桌面 / 手机真实就绪节点，并与串行性能编排一起验证 24 项完整覆盖。

不生成“物化 design tokens / 重写 Typography / 新建 Button、Input、Card”的任务，因为这些资产已经存在且本 change 明确不修改；机械生成此类任务会违反精准修改和范围控制。

---

> 本文件只定义视觉与交互契约，不包含 React 或 CSS 实现。
