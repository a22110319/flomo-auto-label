# Android 应用计划

最快 MVP 推荐技术栈：React Native + TypeScript。

## v0.1 职责

- 提供输入框和保存按钮。
- 本地保存 DeepSeek Key 和 flomo MCP 授权信息。
- 本地读取 flomo 标签。
- 本地调用 AI 整理正文并选择标签。
- 本地通过 flomo MCP 写入 flomo。
- 网络失败时保存本地草稿，不做跨端同步。

## v0.2 移动端入口

- Android 分享入口：把选中文字预填到输入框。
- 桌面小组件：打开快速采集，或直接提交短文本。
- 通知栏快捷入口：快速打开采集页。

## 共用逻辑

Android 端应复用 `packages/shared`：

- `contracts.ts`：请求和响应类型。
- `prompt.ts`：AI 整理与标签选择 prompt。
- `tagValidator.ts`：标签合法性校验。
- `apiClient.ts`：如果临时调用本地或云端采集引擎，可以复用 HTTP 客户端。

长期建议 Android 端直接内置采集逻辑，不依赖电脑上的本机采集引擎。
