# Android 应用计划

最快 MVP 推荐技术栈：React Native + TypeScript。

## v0.1 职责

- 提供输入框和保存按钮。
- 调用 `POST /api/capture`，并使用 `source=android`。
- 网络失败时保存本地草稿。
- 设置页保存 API 地址和私有 Token。

## v0.2 移动端入口

- Android 分享入口：把选中文字预填到输入框。
- 桌面小组件：打开快速采集，或直接提交短文本。
- 通知栏快捷入口：快速打开采集页。

## 共用 API 契约

类型定义位于 `packages/shared/src/contracts.ts`。
