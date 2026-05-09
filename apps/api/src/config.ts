export interface AppConfig {
  port: number;
  apiToken: string;
  dataDir: string;
  storageDriver: "json" | "cloudbase";
  cloudbaseEnvId?: string;
  cloudbaseSecretId?: string;
  cloudbaseSecretKey?: string;
  cloudbaseSessionToken?: string;
  llmProvider: "local" | "openai" | "deepseek";
  openaiApiKey?: string;
  openaiModel: string;
  deepseekApiKey?: string;
  deepseekModel: string;
  deepseekBaseUrl: string;
  flomoMcpEndpoint?: string;
  flomoMcpToken?: string;
  flomoMcpAuthorization?: string;
  flomoMcpMemoTool: string;
  flomoMcpTagTool: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 8787),
    apiToken: process.env.API_TOKEN ?? "change-me-before-deploy",
    dataDir: process.env.DATA_DIR ?? "./data",
    storageDriver: process.env.STORAGE_DRIVER === "cloudbase" ? "cloudbase" : "json",
    cloudbaseEnvId: process.env.CLOUDBASE_ENV_ID || process.env.TCB_ENV_ID || process.env.TCB_ENV,
    cloudbaseSecretId: process.env.CLOUDBASE_SECRET_ID || process.env.TENCENTCLOUD_SECRETID,
    cloudbaseSecretKey: process.env.CLOUDBASE_SECRET_KEY || process.env.TENCENTCLOUD_SECRETKEY,
    cloudbaseSessionToken: process.env.CLOUDBASE_SESSION_TOKEN || process.env.TENCENTCLOUD_SESSIONTOKEN,
    llmProvider: readLlmProvider(process.env.LLM_PROVIDER),
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    flomoMcpEndpoint: process.env.FLOMO_MCP_ENDPOINT,
    flomoMcpToken: process.env.FLOMO_MCP_TOKEN,
    flomoMcpAuthorization: process.env.FLOMO_MCP_AUTHORIZATION,
    flomoMcpMemoTool: process.env.FLOMO_MCP_MEMO_TOOL || "memo_create",
    flomoMcpTagTool: process.env.FLOMO_MCP_TAG_TOOL || "tag_tree"
  };
}

function readLlmProvider(value?: string): AppConfig["llmProvider"] {
  if (value === "openai" || value === "deepseek") return value;
  return "local";
}
