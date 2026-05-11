# 桌面端应用

这是 flomo 本地多端采集器的桌面端入口。v0.1 先实现可用输入界面，调用本机采集引擎 `http://127.0.0.1:8787/api/capture`。

## 功能

- 输入内容并保存到 flomo。
- `Enter` 保存，`Shift + Enter` 换行，`Esc` 清空输入。
- 设置本机采集引擎地址和 Token。
- 保存成功、失败和保存中状态提示。
- 网络失败时保存本地草稿。
- 本地草稿可重试或删除。

## 开发运行

先启动本机采集引擎：

```bash
npm run dev:engine
```

再启动桌面端前端：

```bash
npm --workspace apps/desktop run dev
```

Tauri 原生窗口需要先安装 Rust 与 Windows 构建环境，然后运行：

```bash
npm --workspace apps/desktop run tauri:dev
```
