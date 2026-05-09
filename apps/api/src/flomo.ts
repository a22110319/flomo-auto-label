export interface FlomoMemoInput {
  content: string;
  tags: string[];
}

export interface FlomoClient {
  createMemo(input: FlomoMemoInput): Promise<{ memo_id: string }>;
  getTagTree(): Promise<string[] | undefined>;
}

interface FlomoMcpOptions {
  endpoint?: string;
  token?: string;
  authorization?: string;
  memoTool?: string;
  tagTool?: string;
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

export class FlomoMcpClient implements FlomoClient {
  private endpoint?: string;
  private authorization?: string;
  private memoTool: string;
  private tagTool: string;
  private sessionId?: string;
  private initialized = false;

  constructor(options: FlomoMcpOptions = {}) {
    this.endpoint = options.endpoint;
    this.authorization = options.authorization || (options.token ? `Bearer ${options.token}` : undefined);
    this.memoTool = options.memoTool || "memo_create";
    this.tagTool = options.tagTool || "tag_tree";
  }

  async createMemo(input: FlomoMemoInput): Promise<{ memo_id: string }> {
    if (!this.endpoint) {
      return { memo_id: `local_${Date.now()}` };
    }

    const result = await this.callTool(this.memoTool, {
      content: [input.tags.join(" "), "", input.content].join("\n")
    });
    const data = unwrapMcpPayload(result) as { memo_id?: string; id?: string } | string | undefined;
    if (typeof data === "string") return { memo_id: data };
    return { memo_id: data?.memo_id ?? data?.id ?? `flomo_${Date.now()}` };
  }

  async getTagTree(): Promise<string[] | undefined> {
    if (!this.endpoint) return undefined;
    const result = await this.callTool(this.tagTool, {});
    const data = unwrapMcpPayload(result) as { tags?: string[]; tag_tree?: string[] } | string[] | undefined;
    const tags = Array.isArray(data) ? data : data?.tags ?? data?.tag_tree;
    return tags?.map(normalizeTag);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized || !this.endpoint) return;

    const response = await this.postJsonRpc({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: {
          name: "flomo-quick-capture",
          version: "0.1.0"
        }
      }
    });

    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) this.sessionId = sessionId;
    await parseJsonRpcResponse(response, "initialize");
    this.initialized = true;
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    await this.ensureInitialized();
    const response = await this.postJsonRpc({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/call",
      params: {
        name,
        arguments: args
      }
    });
    return parseJsonRpcResponse(response, `tools/call ${name}`);
  }

  private postJsonRpc(body: unknown): Promise<Response> {
    if (!this.endpoint) throw new Error("尚未配置 flomo MCP 地址");
    return fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-03-26",
        ...(this.authorization ? { Authorization: this.authorization } : {}),
        ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {})
      },
      body: JSON.stringify(body)
    });
  }
}

async function parseJsonRpcResponse(response: Response, action: string): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`flomo MCP ${action} 调用失败：${response.status} ${text.slice(0, 300)}`);
  }

  const data = parseMcpBody(text) as JsonRpcResponse;
  if (data.error) {
    throw new Error(`flomo MCP ${action} 返回错误：${data.error.message ?? data.error.code ?? "未知错误"}`);
  }
  return data.result;
}

function parseMcpBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.includes("data:")) {
    const dataLine = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("data:"));
    if (!dataLine) return {};
    return JSON.parse(dataLine.slice("data:".length).trim());
  }
  return JSON.parse(trimmed);
}

function unwrapMcpPayload(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const maybeContent = result as {
    content?: Array<{ type?: string; text?: string; json?: unknown }>;
    structuredContent?: unknown;
  };
  if (maybeContent.structuredContent) return maybeContent.structuredContent;
  const first = maybeContent.content?.[0];
  if (!first) return result;
  if (first.json !== undefined) return first.json;
  if (!first.text) return result;
  try {
    return JSON.parse(first.text);
  } catch {
    return first.text;
  }
}

function normalizeTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}
