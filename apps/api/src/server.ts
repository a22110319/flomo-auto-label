import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAiService } from "./ai.ts";
import { CaptureService, HttpError } from "./captureService.ts";
import { loadConfig } from "./config.ts";
import { loadDotEnv } from "./env.ts";
import { FlomoMcpClient } from "./flomo.ts";
import { CloudBaseStorage, JsonStorage } from "./storage.ts";

loadDotEnv();
const config = loadConfig();
const storage =
  config.storageDriver === "cloudbase"
    ? new CloudBaseStorage({
        envId: config.cloudbaseEnvId,
        secretId: config.cloudbaseSecretId,
        secretKey: config.cloudbaseSecretKey,
        sessionToken: config.cloudbaseSessionToken
      })
    : new JsonStorage(config.dataDir);
const captureService = new CaptureService(
  storage,
  createAiService({
    provider: config.llmProvider,
    openaiApiKey: config.openaiApiKey,
    openaiModel: config.openaiModel,
    deepseekApiKey: config.deepseekApiKey,
    deepseekModel: config.deepseekModel,
    deepseekBaseUrl: config.deepseekBaseUrl
  }),
  new FlomoMcpClient({
    endpoint: config.flomoMcpEndpoint,
    token: config.flomoMcpToken,
    authorization: config.flomoMcpAuthorization,
    memoTool: config.flomoMcpMemoTool,
    tagTool: config.flomoMcpTagTool
  })
);

const server = createServer(async (req, res) => {
  try {
    setCors(res);
    if (req.method === "OPTIONS") return sendJson(res, 204, {});
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { status: "ok", service: "flomo-capture-api" });
    }

    requireAuth(req);

    if (req.method === "GET" && url.pathname === "/api/config/status") {
      return sendJson(res, 200, {
        port: config.port,
        data_dir: config.dataDir,
        storage_driver: config.storageDriver,
        cloudbase_configured: Boolean(config.cloudbaseEnvId || config.storageDriver !== "cloudbase"),
        llm_provider: config.llmProvider,
        openai_configured: Boolean(config.openaiApiKey && config.openaiModel),
        openai_model: config.openaiModel || null,
        deepseek_configured: Boolean(config.deepseekApiKey && config.deepseekModel),
        deepseek_model: config.deepseekModel || null,
        deepseek_base_url: config.deepseekBaseUrl,
        flomo_mcp_configured: Boolean(config.flomoMcpEndpoint),
        flomo_mcp_auth_configured: Boolean(config.flomoMcpAuthorization || config.flomoMcpToken),
        flomo_mcp_memo_tool: config.flomoMcpMemoTool,
        flomo_mcp_tag_tool: config.flomoMcpTagTool
      });
    }

    if (req.method === "POST" && url.pathname === "/api/capture") {
      const body = await readJson(req);
      validateCaptureBody(body);
      return sendJson(res, 200, await captureService.capture(body));
    }

    if (req.method === "POST" && url.pathname === "/api/capture/preview") {
      const body = await readJson(req);
      validateCaptureBody(body);
      return sendJson(res, 200, await captureService.preview(body));
    }

    if (req.method === "POST" && url.pathname === "/api/capture/confirm") {
      const body = await readJson(req);
      if (!body?.draft_id) throw new HttpError(400, "缺少 draft_id");
      return sendJson(res, 200, await captureService.retryDraft(body.draft_id));
    }

    if (req.method === "GET" && url.pathname === "/api/tags") {
      return sendJson(res, 200, await storage.getTags());
    }

    if (req.method === "POST" && url.pathname === "/api/tags/refresh") {
      return sendJson(res, 200, { tags: await captureService.refreshTags() });
    }

    if (req.method === "GET" && url.pathname === "/api/drafts") {
      return sendJson(res, 200, { drafts: await storage.listDrafts() });
    }

    const retryMatch = url.pathname.match(/^\/api\/drafts\/([^/]+)\/retry$/);
    if (req.method === "POST" && retryMatch) {
      return sendJson(res, 200, await captureService.retryDraft(retryMatch[1]));
    }

    throw new HttpError(404, "接口不存在");
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "服务器内部错误";
    return sendJson(res, statusCode, { status: "error", error_message: message });
  }
});

server.listen(config.port, () => {
  console.log(`flomo 快速采集 API 正在监听 http://localhost:${config.port}`);
});

function requireAuth(req: IncomingMessage): void {
  const expected = `Bearer ${config.apiToken}`;
  if (req.headers.authorization !== expected) {
    throw new HttpError(401, "未授权");
  }
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateCaptureBody(body: any): void {
  if (!body?.raw_text || typeof body.raw_text !== "string") {
    throw new HttpError(400, "缺少 raw_text");
  }
  if (!body?.source || typeof body.source !== "string") {
    throw new HttpError(400, "缺少 source");
  }
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(statusCode === 204 ? undefined : JSON.stringify(body));
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}
