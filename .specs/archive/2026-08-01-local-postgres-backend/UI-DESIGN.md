---
name: "循迹 · 本地账号与后端状态"
description: "安静、克制、可信的极简工具界面；灰绿画布、深墨主操作、淡紫记录强调"

# 均为现有 UI-SPEC Hex 色的 OKLCH 等价表示；不借本 change 改变既有视觉。
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
  danger: "oklch(42.3% 0.110 18.6)"
  error: "oklch(50.5% 0.131 17.7)"
  focus-ring: "oklch(70.4% 0.144 296.5 / 0.38)"

typography:
  display:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.625rem)"
    fontWeight: 760
    lineHeight: 1.1
    letterSpacing: "-0.055em"
    italic: false
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
    textTransform: "none"
    letterSpacing: "0"
  micro-label:
    fontFamily: "Noto Sans SC Variable, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.4
    textTransform: "uppercase"
    letterSpacing: "0.08em"

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
  duration-fast: "180ms"
  duration-base: "240ms"
  duration-reduced: "1ms"

shadow:
  navigation: "0 16px 40px rgba(34,31,32,.05)"
  panel: "0 24px 70px rgba(38,35,36,.07)"
  modal: "0 32px 90px rgba(29,24,25,.20)"
---

# UI Design: 循迹 · 本地账号与后端状态

- **Change ID**: `local-postgres-backend`
- **状态**: confirmed
- **关联**: `@.specs/local-postgres-backend/REQUIREMENT.md`、`@.specs/local-postgres-backend/DESIGN.md`、`@openspec/changes/build-habit-review-mvp/UI-spec.md`
- **范围**: 登录、注册、会话恢复、退出、账号标识、读取 / 写入 / 后端失败状态；不重做既有业务页面

> `ui-ux-pro-max` 与 `impeccable` 均未检出；字体、颜色、UX 与栈适配使用 Flow Kit 内置基线，并服从既有 UI-SPEC。

## 0. 视觉语汇对齐

> 本项目是 brownfield。新增元素必须与现有 UI 无法区分，代码与已确认 UI-SPEC 优先于通用风格建议。

### 0.1 观察报告（代码为源）

- **Token 源**：`@src/styles.css:1-20`；语义权威为 `@openspec/changes/build-habit-review-mvp/UI-spec.md:15-65`。
- **主色实际比例**：桌面与手机截图中灰绿画布、白色表面和中性色占九成以上；淡紫只用于进度、选中、焦点和少量强调，不承担大面积背景。
- **中性色**：画布 `oklch(94.0% 0.004 157.2)`，主文字 `oklch(22.0% 0.008 4.2)`，次级文字 `oklch(52.7% 0.011 161.1)`，边框 `oklch(91.2% 0.006 153.8)`；均带轻微绿 / 暖倾向。
- **hover / focus**：可操作行与按钮用边框加深、`translateY(-1px)` 和低透明阴影；键盘焦点统一 3px 淡紫环。
- **动效**：CSS 驱动，主要为 180–240ms 的 opacity / transform / background / border 变化；页面、弹窗和 Toast 各有一次短入场。
- **elevation**：顶栏、主要大面板、弹窗三档；内部列表和信息卡以细边框为主，静止时不加装饰阴影。
- **密度 / 圆角**：受控留白；桌面主要面板 24–30px 内边距、24px 圆角，手机 20px、18px；控件 11–13px，列表 15–16px。
- **图标**：Lucide React 默认 2px 线宽；品牌标记为现有自绘折线，不新增图形语言。
- **文案**：事实型、动作明确，使用“开始记录 / 载入示例 / 导出完整备份 / 完整替换”，不做激励、社交或 AI 判断。

### 0.2 用户校准结论

- 用户于 2026-07-31 回复“看对了”，确认上述观察无修正。
- 本次沿用现有视觉体系，只补账号与后端状态；不改变页面信息架构、品牌色、字体、断点和图表语言。

### 0.3 应用策略

- **沿用**：全部颜色语义、Noto Sans SC、圆角、阴影、焦点环、Lucide、1024px 断点和事实型文案。
- **延伸**：增加账号入口、账号状态组、持续错误条和全屏会话 / 后端状态。
- **打破**：无。不存在促销页、独立主题或刻意偏离原风格的区域。

## 1. 美学北极星

**Quiet Account Gate** —— 账号只是进入个人记录空间的门，不是新的管理后台。用户登录前后都应感到自己仍在同一个安静、克制、可信的循迹界面里；技术状态用明确文字说明，不用夸张图形掩盖失败。

### v0 确认摸路

用户于 2026-07-31 回复“go”，确认：

- 默认展示登录，以文字操作切换到创建账号，不使用页签。
- 注册不增加确认密码、邮箱验证或找回密码。
- 会话恢复显示真实文字状态，不使用骨架屏或虚假数据。
- 桌面显示本机数据标识、账号邮箱和退出；手机保留本机数据标识并使用有可读名称的退出图标。
- 退出不弹确认框，因为不会删除 Postgres 数据。
- 普通成功沿用 Toast；后端失败持续显示，不在 Toast 动画结束后自动消失。
- 原“当前浏览器”数据文案改为“当前账号的本机数据”。
- 用户未指出偏差。

## 2. 4 个决策问题

- **目的**：服务个人用户在同一台电脑的不同浏览器登录同一账号、恢复并操作同一份数据；核心动作是登录 / 创建账号、等待真实读取、确认保存状态和退出。
- **调性**：**极简**。
  - **理由**：这是高频个人工具而非养成游戏或营销页；账号能力应降低理解成本，不能抢走“记录 + 复盘”主任务。
- **约束**：React SPA + 原生 CSS；不增加 UI 库、在线字体、图片或外部动效；本机读取门槛 1 秒；320～1440px 无横向溢出；控件至少 44×44px；普通文字对比至少 4.5:1。
- **差异化**：失败也保持诚实——界面永远明确区分“正在读取”“已保存”“未保存”，不拿乐观状态或假数据制造顺畅假象。

## 3. 颜色系统

### Primary

- **记录紫** `oklch(70.4% 0.144 296.5)`：只用于焦点环、选中边框、进度和小面积状态强调。**绝不用于**账号页大背景、渐变、主按钮填充或装饰光晕。
- **深紫文字** `oklch(49.2% 0.165 293.3)`：用于淡紫表面上的强调文字和可辨识状态，不替代正文色。
- **淡紫表面** `oklch(95.5% 0.025 298.6)`：用于焦点 / 选择辅助背景和非破坏性状态，不用于错误。

### Neutral

- **灰绿画布** `oklch(94.0% 0.004 157.2)`：账号页与现有应用共享背景，避免突然变成纯白登录 SaaS 页。
- **主表面** `oklch(100% 0 0)`：沿用已确认 UI-SPEC 的大型面板白色；这是 brownfield 遗留例外，不新增其他纯白语义。
- **输入表面** `oklch(98.7% 0.002 145.6)`：输入框静止背景，形成极轻的表面差异。
- **主文字** `oklch(22.0% 0.008 4.2)`：标题和正文；不用纯黑。
- **次级文字** `oklch(52.7% 0.011 161.1)`：说明和辅助标签。
- **分隔线** `oklch(91.2% 0.006 153.8)`：输入、状态条和容器 hairline。

### Semantic

- **危险** `oklch(42.3% 0.110 18.6)`：只用于数据替换等破坏性操作；退出账号不使用危险色，因为不删除数据。
- **错误** `oklch(50.5% 0.131 17.7)`：字段错误和持续失败状态，同时必须有文字 / 图标，不能只靠颜色。
- **保存中 / 加载中**：使用主文字 + 次级文字，不新增蓝、黄或绿色状态色。

### 命名规则

- **One Voice**：记录紫是唯一品牌强调 hue；危险红只承担语义，不作装饰。
- **Tinted Neutral**：画布、辅助文字、边框保留现有低 chroma 倾斜中性。
- **State With Words**：加载、成功、失败必须带文字；颜色只增强，不单独传达含义。

## 4. 字体系统

- **Display / Body**：均沿用项目本地 `Noto Sans SC Variable`。
- **为什么不用 Inter / Roboto / Arial**：它们不是现有资产，中文覆盖与品牌一致性也不如已打包字体；不请求在线字体。
- **为什么不另加 Display 字体**：UI-SPEC 明确锁定单一本地字体，本次是小范围 brownfield 延伸。通过字号、字重、负字距和留白建立层级；这是对通用“双字体”建议的明确项目例外。
- **Mono / 数字**：不新增等宽字体；数据继续使用 Noto Sans SC + `tabular-nums`。

### 层次表

| 角色 | 字体 | 字号 | 字重 | 行高 | 用途 |
|---|---|---|---|---|---|
| Display | Noto Sans SC Variable | `clamp(30px, 3vw, 42px)` | 760 | 1.1 | “登录循迹 / 创建账号” |
| Headline | 同上 | 24px | 720 | 1.25 | 后端错误标题 |
| Title | 同上 | 16px | 700 | 1.4 | 状态条标题、当前账号 |
| Body | 同上 | 16px | 400 | 1.6 | 表单说明；宽度不超过 65ch |
| Supporting | 同上 | 13px | 400 | 1.6 | 辅助说明、账号邮箱 |
| Label | 同上 | 12px | 650 | 1.4 | 输入标签、按钮辅助文字 |
| Eyebrow | 同上 | 12px | 650 | 1.4 | 英文 / 短标签，大写、`.08em` |

## 5. 间距、圆角、动效与响应式

### 5.1 间距

- 只使用 frontmatter 的 `8 / 12 / 18 / 24 / 30 / 38 / 48px`。
- 账号表单字段间距 18px；标签与输入 8px；主按钮与字段组 24px；模式切换与主按钮 18px。
- 账号面板桌面内边距 38～48px，手机 24px；不在面板内再包一层卡片。

### 5.2 圆角与层级

- 输入 / 按钮：12px；状态条：16px；账号主面板：24px，手机 18～20px。
- 账号主面板复用“主要大面板”层级，可使用现有 `shadow.panel`；内部字段、错误、模式切换保持平面。
- 弹窗仅用于既有危险确认；登录、加载和后端错误不放进弹窗。

### 5.3 动效

- hover / focus 颜色与边框：180ms `ease`；面板入场：240ms `ease`，只动 opacity / transform。
- 提交中不改变按钮宽度；文字从“登录循迹”切到“登录中…”时保留固定按钮尺寸。
- `prefers-reduced-motion: reduce` 时所有新增动画降为 1ms，取消位移。
- 新账号 UI 禁止 spinner 无限吸引注意；加载使用静态可读文字，可配一个低调 Lucide Loader 图标旋转，但文字必须独立成立。

### 5.4 响应式

| 视口 | 账号入口 | 已登录账号区 | 状态呈现 |
|---|---|---|---|
| 320 / 390px | 单列、9px 页面外边距、面板 24px 内边距、按钮全宽 | 顶栏显示“本机数据”与 44px 退出图标；邮箱在管理页完整显示 | 持续错误条位于顶栏下，不覆盖底部导航 |
| 768px | 账号面板最大 480px 居中 | 保持移动顶栏与底部导航 | 错误条与内容同宽 |
| ≥1024px | 账号面板最大 480px；背景保留低对比日期点阵 | 顶栏右侧依次为“本机账号数据”、截断邮箱、退出 | 错误条位于 1200px 内容区顶部 |

账号邮箱可视觉截断，但完整值必须在可访问名称和管理页显示。所有视口不得新增横向页面滚动。

### 5.5 背景与质感

- 账号入口沿用灰绿画布与现有 18px 低对比日期点阵，并用局部 radial mask 控制范围。
- 账号主面板为实体表面，不新增玻璃模糊、噪点、插画、渐变网格或装饰光效。
- 质感只来自留白、排版、细边框和既有大面板阴影；状态区域不另建视觉主题。

## 6. 关键页面与组件规约

### 6.1 Account Entry（登录 / 创建账号）

- 复用 `OnboardingPage` 的全屏灰绿画布、局部日期点阵和品牌头部；不显示业务主导航。
- 默认模式为“登录循迹”；模式切换为句末文字按钮：“没有账号？创建账号” / “已有账号？登录”。不用页签、胶囊切换或并排双表单。
- 字段顺序固定：邮箱 → 密码 → 主按钮 → 模式切换 → 状态。
- 创建账号不增加确认密码、邮箱确认说明、找回密码、OAuth 或营销内容。
- 登录说明固定表达本机范围：“在这台电脑的不同浏览器中继续记录。”不得写“云同步”或“跨设备”。
- 切换模式后更新标题、主按钮和密码 autocomplete，并将焦点送到标题或邮箱字段；已输入密码不跨模式保留。

### 6.2 Button（Primary）

- **形状**：12px 圆角，最小高度 48px，账号页全宽。
- **背景**：深墨 `text-action`；文字使用现有主表面白色。
- **at rest**：无阴影；不使用紫色填充。
- **hover**：上移 1px，180ms；只增加现有低透明 hover 阴影。
- **focus**：3px `focus-ring`，与错误边框可同时识别。
- **busy**：保持尺寸，文字改为“登录中… / 创建中… / 退出中… / 保存中…”，原生 disabled；不能用“请稍候”替代动作。

### 6.3 Button（Secondary / Text）

- 后端错误页的“退出账号”使用白色次按钮 + 1px border；“重新读取”为唯一主按钮。
- 登录 / 创建账号模式切换使用文字按钮，不加卡片、阴影或图标。
- 顶栏退出为紧凑文字按钮；手机为 Lucide LogOut 图标按钮并提供 `aria-label="退出账号"`。
- 退出不是破坏性操作，不使用危险红，也不弹确认。

### 6.4 Input / Field

- 显式 label 永远存在；placeholder 只示例格式，不替代 label。
- 最小高度 48px，16px 输入文字，12px 圆角，背景 `input`，1px `border`。
- focus：边框变为 `brand`，加 3px `brand-soft` / focus ring；不改变布局尺寸。
- error：边框与紧邻文字使用 `error`；错误文字 `role="alert"`，描述具体结果，不回显密码或服务端敏感详情。
- autocomplete：邮箱 `email`；登录密码 `current-password`；注册密码 `new-password`。
- 本轮不增加显示密码、密码强度条和确认密码。

### 6.5 Account Panel / Container

- 最大宽度 480px，单一主面板；表单内部禁止卡片套卡片。
- 顶部依次为 eyebrow“账号数据”、Display 标题、单句说明；标题与表单之间 30px。
- 主面板静止时只使用 UI-SPEC 已确认的大面板阴影；没有紫色 glow、玻璃模糊或渐变边框。
- 账号页底部只保留本机数据边界，不出现推荐语、统计、插画或品牌故事。

### 6.6 Navigation / Account Cluster

- 四个一级导航及顺序完全不变；账号不是第五个一级导航。
- 桌面右侧：小型“本机账号数据”标识、当前邮箱、退出按钮。邮箱使用 supporting 层级，不与主导航争夺对比度。
- 手机顶栏：品牌、本机数据标识、44px 退出图标；完整邮箱放在管理页数据侧栏上方。
- 原“仅存于此设备”语义保留，但不得再写“仅存于当前浏览器”。

### 6.7 Session Loading

- 会话恢复和首次账号读取为全屏阻塞状态，因为此时没有可安全展示的账号 Store。
- 显示 Brand、eyebrow“账号数据”、标题“正在恢复账号数据……”和辅助文字“读取完成后会进入今天页面”。
- 使用 `role="status"` / `aria-live="polite"`；不得显示旧 localStorage 数据、伪造 Habit 或灰条 skeleton。
- 1 秒性能目标不是“1 秒后自动失败”；错误只由真实请求结果或既定超时策略触发。

### 6.8 Backend Error / Integrity Error

- 初始读取失败：复用 Recovery 的单面板结构，标题“暂时无法读取账号数据”，主操作“重新读取”，次操作“退出账号”。
- 数据完整性失败：标题“账号数据需要恢复”，明确“原数据没有被覆盖”；保留导入有效 Store v1 的恢复入口。
- Auth 不可用：留在账号入口，显示“本地后端暂时不可用，请确认本地服务已启动。”
- 不显示堆栈、端口、token、数据库错误原文或 Supabase 内部对象名。

### 6.9 Saving / Success / Write Failure

- 发起写入的控件进入 busy 并阻止重复提交；页面其他已确认数据保持可读。
- 成功：沿用现有 `aria-live="polite"` Toast，文字使用具体结果，如“已保存”“已归档”“数据已完整替换”。
- 写入失败：在顶栏下显示持续错误条，`role="alert"`，文案“刚才的修改未保存，请重新操作。”；不把失败 candidate 留在界面。
- 持续错误条直到下一次成功、用户明确关闭或退出；不得使用 2.6 秒自动消失动画。
- 读取失败和写入失败不得共用模糊的“出错了”。

### 6.10 既有文案更新

| 位置 | 旧文案 | 新文案 |
|---|---|---|
| Onboarding footer | 数据仅保存在当前浏览器 | 记录保存在当前账号的本机数据库 |
| 管理页数据说明 | 数据只保存在当前浏览器 | 这里管理当前账号的本机数据，可导出完整 JSON 备份 |
| 导入确认 | 替换当前浏览器里的全部数据 | 替换当前账号的全部习惯与完成记录 |
| 顶栏标识 | 仅存于此设备 | 本机账号数据 |

不修改今天、本周和洞察页面的既有事实型文案。

## 7. Do's and Don'ts

### Do

- 使用既有灰绿画布、深墨主操作和稀缺淡紫强调。
- 用“正在读取 / 已保存 / 未保存”明确标识服务端确认状态。
- 让账号入口像现有 Onboarding / Recovery 的自然延伸。
- 在所有状态中保留键盘焦点、44px 触控尺寸、可见文字与辅助技术播报。
- 桌面显示邮箱，手机将完整邮箱放到管理页，避免挤压品牌和退出。

### Don't

- 不新增账号头像、下拉账号中心、第五个一级导航或设置中心。
- 不使用“云端同步”“随处访问”“自动同步”等超出本机范围的文案。
- 不用紫色渐变、插画、emoji、玻璃卡、装饰光晕或登录页大图。
- 不在后端失败时展示旧浏览器 Store、乐观成功或虚假 skeleton 数据。
- 不把退出做成危险操作，也不增加无意义确认弹窗。
- 不借账号页面重构现有全局 CSS、页面布局或字体体系。

## 8. 占位符策略

| 缺的东西 | 本项目现状 | 缺时处理 | 禁止 |
|---|---|---|---|
| 图标 | 已有 Lucide React | 从现有库选择语义明确图标；无合适图标则使用文字按钮 | emoji、临时 AI SVG |
| 头像 | 本轮明确不做 | 不显示头像；不预留空圆形 | AI 人脸、网络图片 |
| 图片 / 插画 | UI-SPEC 明确不使用 | 不放图片区域，也不放占位图 | stock photo、AI 生图、健康插画 |
| 数据 | Auth + 当前 Store 提供真实数据 | 未读取完成时显示文字状态 | 编造 Habit、执行率或账号统计 |
| logo | 已有 `Brand` 与品牌折线 | 直接复用 | 新绘 logo、额外品牌图形 |
| 客户推荐 | 不适用 | 不创建该区域 | 编用户名、评论、照片 |
| KPI | 来自当前账号真实 Store | 无数据时显示既有空状态 | 编数字、用 skeleton 冒充结果 |

本项目默认不使用 emoji。

## 9. 反 AI-slop 自检结果

已逐条对照 `@flow-kit/reference/ui-anti-patterns.md`：

- [x] 字体：未引入 Inter / Roboto / Arial / Helvetica / system-ui。
- [x] 颜色：无紫色渐变、渐变文字、第二装饰强调色或霓虹色。
- [x] 阴影：新增内部卡片无静态阴影；仅复用项目级大面板阴影。
- [x] 边框：无彩色侧条、渐变边框或新增 glassmorphism。
- [x] 动效：新增状态只动 opacity / transform；支持 reduced motion；无 bounce。
- [x] 布局：单主面板，无卡片套卡片、统一卡片网格或 Hero KPI。
- [x] 文案：无营销空话、含糊按钮、Lorem ipsum 或编造数据。
- [x] 组件：label 不由 placeholder 替代；移动端不依赖 hover；按钮静止无通用阴影。

### 已接受的 brownfield 例外

- **Display 与 Body 同字体**：UI-SPEC 已锁定本地 Noto Sans SC，且用户确认不重做视觉；本次不为满足通用规则而引第二字体。
- **主表面为纯白**：现有 UI-SPEC 明确使用 `#FFFFFF`。frontmatter 仅做 OKLCH 等价记录，不新增纯白层级。
- **主要大面板静止阴影**：现有 UI-SPEC 明确了顶栏 / 面板 / 弹窗三档阴影；新增账号主面板只复用该单一层级，内部不继续叠阴影。
- **既有进度条 width / 柱图 height 动画**：当前代码存在，但不属于本 change；新增账号 UI 不延续，也不顺手修改旧实现。

### 9.1 UI 相关 AC 覆盖

| AC | UI 落点 |
|---|---|
| AC-1～AC-2 | 登录 / 创建账号双模式、字段错误、失败不进入业务路由 |
| AC-3 | 会话恢复全屏状态、顶栏退出和退出后清空账号界面 |
| AC-4～AC-6 | 登录 / 刷新后真实读取状态，不显示缓存假数据 |
| AC-10 | 登录后的既有空白 / 示例 Onboarding，文案改为账号本机数据 |
| AC-12～AC-14 | 导入确认、失败不覆盖、当前账号数据边界文案 |
| AC-15～AC-16 | 全屏后端错误、持续写入失败、离线应用壳状态 |
| AC-17 | 44px 控件、显式 label、焦点环、role / aria-live、非颜色表达 |
| AC-18 | 会话与数据读取状态；不得用 skeleton 掩盖不完整分页 |

## 10. 触发任务

进入 `3-task` 时，第一批 UI 任务应为：

- **T-UI-01**：为新增账号 / 状态组件物化本文件 OKLCH 语义 token；只添加缺失 alias，不全量重写现有颜色。
- **T-UI-02**：实现登录 / 创建账号双模式入口、真实加载状态和字段错误；覆盖键盘与辅助技术。
- **T-UI-03**：扩展桌面 / 手机应用壳账号区和退出动作，保持四项一级导航不变。
- **T-UI-04**：实现全屏读取失败、数据完整性恢复和持续写入失败状态。
- **T-UI-05**：更新 Onboarding、管理页、导入确认和顶栏的数据边界文案。
- **T-UI-06**：在 320、390、768、1024、1440px 验证无溢出、44px 触控目标、焦点、role / aria-live 和 reduced motion。

---

> 本文件只定义视觉与交互契约，不包含 React 或 CSS 实现。
