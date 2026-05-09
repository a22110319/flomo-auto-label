import type { CaptureRequest, CaptureResult } from "../../../packages/shared/src/contracts.ts";
import type { AiService } from "./ai.ts";
import type { FlomoClient } from "./flomo.ts";
import type { Storage } from "./storage.ts";
import { validateTags } from "./tagValidator.ts";
import type { CaptureRecord, DraftRecord } from "./types.ts";

export class CaptureService {
  private storage: Storage;
  private ai: AiService;
  private flomo: FlomoClient;

  constructor(storage: Storage, ai: AiService, flomo: FlomoClient) {
    this.storage = storage;
    this.ai = ai;
    this.flomo = flomo;
  }

  async preview(request: CaptureRequest): Promise<CaptureResult> {
    const tagCache = await this.storage.getTags();
    const aiResult = await this.ai.organize(request.raw_text, tagCache.tags);
    const tags = validateTags(aiResult.tags, tagCache.tags);
    return {
      status: "success",
      clean_text: aiResult.clean_text,
      tags,
      confidence: aiResult.confidence,
      need_review: aiResult.confidence < 0.75,
      reason: aiResult.reason
    };
  }

  async capture(request: CaptureRequest): Promise<CaptureResult> {
    const preview = await this.preview(request);
    const now = new Date().toISOString();

    try {
      const memo = await this.flomo.createMemo({
        content: preview.clean_text,
        tags: preview.tags
      });
      await this.storage.addCapture({
        id: crypto.randomUUID(),
        raw_text: request.raw_text,
        clean_text: preview.clean_text,
        tags: preview.tags,
        confidence: preview.confidence,
        source: request.source,
        status: "success",
        flomo_memo_id: memo.memo_id,
        created_at: now,
        updated_at: now
      });
      return { ...preview, status: "success", memo_id: memo.memo_id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "flomo 写入失败，原因未知";
      const draft: DraftRecord = {
        id: crypto.randomUUID(),
        raw_text: request.raw_text,
        clean_text: preview.clean_text,
        tags: preview.tags,
        source: request.source,
        status: "pending",
        error_message: errorMessage,
        retry_count: 0,
        created_at: now,
        updated_at: now
      };
      await this.storage.addDraft(draft);
      await this.storage.addCapture(toCaptureRecord(draft, preview.confidence));
      return {
        ...preview,
        status: "draft",
        draft_id: draft.id,
        error_message: errorMessage
      };
    }
  }

  async retryDraft(id: string): Promise<CaptureResult> {
    const draft = await this.storage.getDraft(id);
    if (!draft) throw new HttpError(404, "草稿不存在");

    const now = new Date().toISOString();
    const retrying = {
      ...draft,
      status: "retrying" as const,
      retry_count: draft.retry_count + 1,
      updated_at: now
    };
    await this.storage.updateDraft(retrying);

    try {
      const memo = await this.flomo.createMemo({
        content: draft.clean_text || draft.raw_text,
        tags: draft.tags
      });
      await this.storage.updateDraft({
        ...retrying,
        status: "saved",
        error_message: undefined,
        updated_at: new Date().toISOString()
      });
      return {
        status: "success",
        memo_id: memo.memo_id,
        clean_text: draft.clean_text,
        tags: draft.tags,
        confidence: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "草稿重试失败";
      await this.storage.updateDraft({
        ...retrying,
        status: "failed",
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      });
      return {
        status: "failed",
        draft_id: draft.id,
        clean_text: draft.clean_text,
        tags: draft.tags,
        confidence: 0,
        error_message: errorMessage
      };
    }
  }

  async refreshTags(): Promise<string[]> {
    const tags = await this.flomo.getTagTree();
    if (!tags?.length) return (await this.storage.getTags()).tags;
    return (await this.storage.setTags(tags)).tags;
  }
}

function toCaptureRecord(draft: DraftRecord, confidence: number): CaptureRecord {
  return {
    id: crypto.randomUUID(),
    raw_text: draft.raw_text,
    clean_text: draft.clean_text,
    tags: draft.tags,
    confidence,
    source: draft.source,
    status: "draft",
    error_message: draft.error_message,
    created_at: draft.created_at,
    updated_at: draft.updated_at
  };
}

export class HttpError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
