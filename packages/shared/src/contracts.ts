export type CaptureSource = "desktop" | "android" | "share" | "widget" | "api";

export type CaptureMode = "auto" | "preview";

export interface CaptureRequest {
  raw_text: string;
  source: CaptureSource;
  client_id?: string;
  mode?: CaptureMode;
}

export interface CaptureResult {
  status: "success" | "failed" | "draft";
  memo_id?: string;
  draft_id?: string;
  clean_text: string;
  tags: string[];
  confidence: number;
  need_review?: boolean;
  reason?: string;
  error_message?: string;
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
