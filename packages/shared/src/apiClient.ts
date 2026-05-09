import type { CaptureRequest, CaptureResult, DraftRecord } from "./contracts.ts";

export interface CaptureApiClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export class CaptureApiClient {
  private baseUrl: string;
  private token: string;
  private fetchImpl: typeof fetch;

  constructor(options: CaptureApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  capture(request: CaptureRequest): Promise<CaptureResult> {
    return this.post("/api/capture", request);
  }

  preview(request: CaptureRequest): Promise<CaptureResult> {
    return this.post("/api/capture/preview", request);
  }

  async getTags(): Promise<{ tags: string[]; last_sync_at: string }> {
    return this.get("/api/tags");
  }

  async refreshTags(): Promise<{ tags: string[] }> {
    return this.post("/api/tags/refresh", {});
  }

  async listDrafts(): Promise<{ drafts: DraftRecord[] }> {
    return this.get("/api/drafts");
  }

  retryDraft(draftId: string): Promise<CaptureResult> {
    return this.post(`/api/drafts/${encodeURIComponent(draftId)}/retry`, {});
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: this.headers()
    });
    return parseResponse<T>(response);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json; charset=utf-8" }),
      body: JSON.stringify(body)
    });
    return parseResponse<T>(response);
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      ...extra
    };
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error_message ?? `请求失败：${response.status}`);
  }
  return data as T;
}
