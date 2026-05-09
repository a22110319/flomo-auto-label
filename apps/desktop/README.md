# 桌面端应用计划

推荐技术栈：Tauri + React + TypeScript。

## v0.1 职责

- 全局快捷键呼出极简采集窗口。
- `Enter` 保存，`Shift + Enter` 换行，`Esc` 取消。
- 调用 `POST /api/capture`，并使用 `source=desktop`。
- 云端 API 不可用时，把未发送内容保存为本地草稿。
- 设置页保存 API 地址和私有 Token，后续应接入本地安全存储。

## 共用 API 契约

类型定义位于 `packages/shared/src/contracts.ts`。

## 建议的下一步实现

后端地址部署完成后，创建 Tauri 应用：

```bash
npm create tauri-app@latest apps/desktop
```

桌面端只保留轻量 HTTP 客户端，不直接调用 AI，也不直接调用 flomo。
