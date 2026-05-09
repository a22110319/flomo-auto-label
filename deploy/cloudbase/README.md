# CloudBase 部署说明

本项目在生产环境中推荐使用 CloudBase 云托管运行 HTTP API，并使用 CloudBase 文档型数据库保存持久化数据。

## 需要启用的服务

1. CloudBase 云托管
2. CloudBase 文档型数据库
3. HTTP 访问服务
4. 日志监控

## 数据库集合

首次生产运行前，请在 CloudBase 控制台创建以下集合：

- `tag_cache`
- `capture_records`
- `drafts`
- `client_devices`
- `settings`

如果 `tag_cache` 还没有数据，API 会在首次读取时自动写入一份默认标签缓存。

## 环境变量

把 `deploy/cloudbase/.env.prod.example` 里的内容复制到 CloudBase 云托管服务的环境变量配置中。

生产环境必填项：

```env
API_TOKEN=替换为足够长的私有访问令牌
STORAGE_DRIVER=cloudbase
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=替换为 DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
FLOMO_MCP_ENDPOINT=https://flomoapp.com/mcp
FLOMO_MCP_AUTHORIZATION=替换为完整的 flomo Authorization 请求头
FLOMO_MCP_MEMO_TOOL=memo_create
FLOMO_MCP_TAG_TOOL=tag_tree
```

如果服务运行在同一个 CloudBase 环境中，SDK 通常可以使用运行时自带凭证。若服务运行在目标环境之外，再补充：

```env
CLOUDBASE_ENV_ID=
CLOUDBASE_SECRET_ID=
CLOUDBASE_SECRET_KEY=
CLOUDBASE_SESSION_TOKEN=
```

## 方式 A：CloudBase 控制台部署

1. 创建云托管服务。
2. 选择从源码构建容器。
3. 构建上下文选择仓库根目录。
4. Dockerfile 填写 `apps/api/Dockerfile`。
5. 容器端口设置为 `8787`。
6. 添加上方环境变量。
7. 配置 HTTP 访问，并绑定支持 HTTPS 的自定义域名。

## 方式 B：CloudBase CLI 部署

安装并登录：

```bash
npm install -g @cloudbase/cli
tcb login
```

在仓库根目录部署：

```bash
tcb framework deploy --config deploy/cloudbase/cloudbaserc.json
```

如果你的 CLI 版本不支持容器插件，请直接使用 CloudBase 控制台部署云托管服务，并把本目录作为配置参考。

## 冒烟测试

替换 `<base-url>` 和 `<api-token>`：

```bash
curl https://<base-url>/health
curl https://<base-url>/api/config/status \
  -H "Authorization: Bearer <api-token>"
curl -X POST https://<base-url>/api/tags/refresh \
  -H "Authorization: Bearer <api-token>"
```

确认准备好写入真实 flomo 后，再执行最终采集测试：

```bash
curl -X POST https://<base-url>/api/capture \
  -H "Authorization: Bearer <api-token>" \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"CloudBase 部署冒烟测试","source":"api","client_id":"cloudbase-smoke-test","mode":"auto"}'
```
