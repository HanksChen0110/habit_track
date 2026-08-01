# T03-SUMMARY — 将旧 Repository 收缩为纯 Store 编解码边界

- **状态**：done
- **Change ID**：`local-postgres-backend`
- **任务**：T03
- **提交**：`1896d27749d1ecd4a3af476d69b2caa45eae06c6`、`830d31754011079480f3c5c9d8a307b8e37d4c58`
- **提交信息**：`feat(local-postgres-backend): T03 isolate Store codec boundary`；`fix(local-postgres-backend): T03 cover inactive completion dates`

## 完成内容

- 移除 `LocalStoreRepository` 以及 `localStorage` 读写、删除和 `storage` 订阅路径。
- 保留异步 `StoreRepository` 契约，并提供纯函数 `previewImport` / `serialize`。
- 编解码统一沿用 `validateStore`，返回克隆后的 Store，不与输入对象共享引用。
- 测试覆盖完整预览、序列化、Store 结构拒绝面，包括 completion 早于 `createdOn` 和晚于 `archivedOn` 的有效日期格式。

## 实现文件

- `@src/data/repository.ts`
- `@tests/data/repository.test.ts`

## 验证证据

- RED：先迁移测试，`previewImport` / `serialize` 尚未存在时 21/21 失败，首个失败为 `previewImport is not a function`。
- GREEN：`pnpm exec vitest run tests/data/repository.test.ts` 最终 23/23 PASS。
- 修复复审：非活跃日期两个边界均 ADDRESSED，无新 Critical / Important，最终 APPROVED。
- 阶段性全量证据：T08 切换调用方之前，`pnpm test:run` 因旧 AppStore 构造已移除的 `LocalStoreRepository` 而 20 项失败；`pnpm typecheck` 同因导出不存在失败。该阶段性失败必须由 T08 关闭，不作为最终交付证据。

## 6 维自查

- R1：校验、预览、序列化函数均短小，无深层嵌套。
- R2：生产及测试改动仅限 TASK 指定的两个文件。
- R3：通过 `requireValidStore` 集中校验与克隆，无复制逻辑。
- R4：未添加未要求的适配层或兼容层。
- R5：依赖保持 `data → domain`，不依赖浏览器 API。
- R6：命名沿用 Store、Habit、Completion、ImportPreview 领域词。

沿用既有抽象 grep：

- Repository：旧实现位于 `@src/data/repository.ts`，按 DESIGN 收缩，未新起抽象。
- 日期：沿用 `@src/domain/dates.ts` 的 `formatLocalDate`。
- Store 校验：沿用 `@src/domain/store.ts` 的 `validateStore`。
- HTTP / hook / 统一错误处理：本任务不涉及，搜索未发现需复用实现。

## 破坏性变更

- 已按用户对本 change 的连续执行授权移除旧公共导出，并 grep `LocalStoreRepository` / `ImportPreview` / `previewImport` / `serialize` 引用图。
- 直接影响为 `@src/app/AppStore.tsx`、`@src/pages/ManagePage.tsx` 与相关 UI 测试；调用方切换由 T08 / T12 完成。
- 本任务没有越界修改调用方；T08 是最终全量 typecheck/test 的承重门。

## 越界检查

- TASK write_files：2 项。
- 实际代码 diff：2 项。
- 越界：0。

## 后续强制验收

- T08 必须使页面不再从 data 层导入 `ImportPreview`，并切换 AppStore 到账号 Repository。
- 最终 REVIEW 前必须重跑 typecheck 与全量 Vitest，禁止将 T03 的阶段性失败保留到交付。
