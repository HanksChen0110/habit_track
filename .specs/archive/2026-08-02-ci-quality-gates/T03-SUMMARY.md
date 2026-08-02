# SUMMARY: T03 - 修复首次 Oxlint 暴露的真实违规

- **Change ID**: `ci-quality-gates`
- **Task ID**: `T03`
- **完成时间**: 2026-08-02 14:14
- **AI 角色**: Dev

---

## 做了什么

按 Oxlint 的首次真实报告做了两处最小合规修复：Modal 在 effect 建立时捕获先前焦点节点，cleanup 始终恢复到同一节点；E2E 导出比较中将刻意省略的 `id` 重命名为 `_id`。没有添加 disable 注释、降级规则或改变产品行为。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `src/components/Modal.tsx` | 修改 | 捕获 effect 创建时的先前焦点，满足 Hooks 依赖规则且保持关闭后焦点恢复 |
| `tests/e2e/backend.spec.ts` | 修改 | 将刻意忽略的导出 `id` 绑定改名为 `_id`，保留原有对象比较语义 |

## verify 输出

```text
$ pnpm lint
> oxlint --deny-warnings --disable-unicorn-plugin --react-plugin src tests
(exit 0)

$ pnpm exec vitest run tests/ui/App.test.tsx tests/ui/ManageRecovery.test.tsx
Test Files  2 passed (2)
Tests  28 passed (28)
```

## 沿用既有测试与抽象

- 焦点恢复继续由 `tests/ui/App.test.tsx` 的 Modal 键盘、焦点陷阱与恢复用例覆盖；本次运行的两个 UI 测试文件共 28 项测试均通过。
- E2E 测试仍通过 `id` 以外的习惯数据比对导出结果；只改变未使用变量的名字，不改变映射对象。

## LESSONS 检查（R1.8）

- 运行 `rg -n -i "lint|focus|modal|test" .specs/LESSONS.md`，没有命中适用于本任务的 active 条目；差异是本次是静态检查合规，不重试既有 Auth 或响应式测试问题。

## 越界检查

```text
✅ 越界检查：
  - TASK 实现 write_files：src/**/*.ts(x)、tests/**/*.ts(x)
  - 实际实现 diff：src/components/Modal.tsx、tests/e2e/backend.spec.ts
  - 业务行为、CSS、断言语义、数据库与环境配置：未触及
```

## 完成判定

- AC-1 的 `pnpm lint` 已实际通过。
- 相关焦点恢复 UI 回归测试已通过。
- 提交：`fix(ci-quality-gates): T03 resolve Oxlint findings`（最终 hash 以 Git 历史为准）
