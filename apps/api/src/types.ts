import type { CaptureSource } from "../../../packages/shared/src/contracts.ts";

export interface CaptureRecord {
  id: string;
  raw_text: string;
  clean_text: string;
  tags: string[];
  confidence: number;
  source: CaptureSource;
  status: "success" | "failed" | "draft";
  flomo_memo_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DraftRecord {
  id: string;
  raw_text: string;
  clean_text: string;
  tags: string[];
  source: CaptureSource;
  status: "pending" | "retrying" | "saved" | "failed";
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface TagCache {
  tags: string[];
  last_sync_at: string;
}

export interface AiOrganizeResult {
  clean_text: string;
  tags: string[];
  confidence: number;
  reason?: string;
}
