# 桌面端应用计划

推荐技术栈：Tauri + React + TypeScript。

## v0.1 职责

- 全局快捷键呼出极简采集窗口。
- `Enter` 保存，`Shift + Enter` 换行，`Esc` 取消。
- 调用本机采集引擎：`http://127.0.0.1:8787/api/capture`，并使用 `source=desktop`。
- 本机采集引擎负责读取 flomo 标签、调用 AI、通过 flomo MCP 写入 flomo。
- 采集失败时保存本地草稿，不做跨端同步。
- 设置页保存本地引擎地址和私有 Token，后续应接入本地安全存储。

## 共用逻辑

桌面端应复用 `packages/shared`：

- `contracts.ts`：请求和响应类型。
- `apiClient.ts`：调用本机采集引擎。
- `prompt.ts`：如果未来桌面端直接调用 AI，可复用同一套 prompt。
- `tagValidator.ts`：如果未来桌面端直接做标签校验，可复用同一套校验逻辑。

## 建议的下一步实现

创建 Tauri 应用：

```bash
npm create tauri-app@latest apps/desktop
```

桌面端 v0.1 可以先依赖本机采集引擎。等体验稳定后，再考虑是否把 AI 和 flomo MCP 逻辑直接内嵌进 Tauri 后端。
