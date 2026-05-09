import tcb from "@cloudbase/node-sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CaptureRecord, DraftRecord, TagCache } from "./types.ts";

export interface Storage {
  getTags(): Promise<TagCache>;
  setTags(tags: string[]): Promise<TagCache>;
  addCapture(record: CaptureRecord): Promise<void>;
  addDraft(draft: DraftRecord): Promise<void>;
  listDrafts(): Promise<DraftRecord[]>;
  getDraft(id: string): Promise<DraftRecord | undefined>;
  updateDraft(updated: DraftRecord): Promise<void>;
}

export interface CloudBaseStorageOptions {
  envId?: string;
  secretId?: string;
  secretKey?: string;
  sessionToken?: string;
}

interface DatabaseShape {
  capture_records: CaptureRecord[];
  drafts: DraftRecord[];
  tag_cache: TagCache;
  client_devices: Array<{
    id: string;
    device_name?: string;
    device_type?: string;
    last_seen_at: string;
    created_at: string;
  }>;
  settings: Record<string, unknown>;
}

const DEFAULT_TAGS = [
  "#类型/备忘",
  "#类型/灵感",
  "#类型/任务",
  "#类型/摘录",
  "#领域/工作",
  "#领域/工作/产品",
  "#领域/技术",
  "#领域/技术/智能驾驶",
  "#领域/技术/智能驾驶/测试与评价",
  "#领域/技术/智能驾驶/测试与评价/评价指标",
  "#领域/生活"
];

export class JsonStorage implements Storage {
  private dbPath: string;
  private state?: DatabaseShape;

  constructor(dataDir: string) {
    this.dbPath = join(dataDir, "db.json");
  }

  async load(): Promise<DatabaseShape> {
    if (this.state) return this.state;
    await mkdir(dirname(this.dbPath), { recursive: true });
    try {
      this.state = JSON.parse(await readFile(this.dbPath, "utf8")) as DatabaseShape;
    } catch {
      this.state = {
        capture_records: [],
        drafts: [],
        tag_cache: {
          tags: DEFAULT_TAGS,
          last_sync_at: new Date().toISOString()
        },
        client_devices: [],
        settings: {}
      };
      await this.save();
    }
    return this.state;
  }

  async save(): Promise<void> {
    if (!this.state) return;
    await writeFile(this.dbPath, JSON.stringify(this.state, null, 2), "utf8");
  }

  async getTags(): Promise<TagCache> {
    return (await this.load()).tag_cache;
  }

  async setTags(tags: string[]): Promise<TagCache> {
    const db = await this.load();
    db.tag_cache = { tags, last_sync_at: new Date().toISOString() };
    await this.save();
    return db.tag_cache;
  }

  async addCapture(record: CaptureRecord): Promise<void> {
    const db = await this.load();
    db.capture_records.unshift(record);
    await this.save();
  }

  async addDraft(draft: DraftRecord): Promise<void> {
    const db = await this.load();
    db.drafts.unshift(draft);
    await this.save();
  }

  async listDrafts(): Promise<DraftRecord[]> {
    return (await this.load()).drafts;
  }

  async getDraft(id: string): Promise<DraftRecord | undefined> {
    return (await this.load()).drafts.find((draft) => draft.id === id);
  }

  async updateDraft(updated: DraftRecord): Promise<void> {
    const db = await this.load();
    db.drafts = db.drafts.map((draft) => (draft.id === updated.id ? updated : draft));
    await this.save();
  }
}

export class CloudBaseStorage implements Storage {
  private db: any;

  constructor(options: CloudBaseStorageOptions = {}) {
    const initOptions: Record<string, string> = {};
    if (options.envId) initOptions.env = options.envId;
    if (options.secretId) initOptions.secretId = options.secretId;
    if (options.secretKey) initOptions.secretKey = options.secretKey;
    if (options.sessionToken) initOptions.sessionToken = options.sessionToken;
    this.db = tcb.init(initOptions).database();
  }

  async getTags(): Promise<TagCache> {
    const existing = await this.findOne("tag_cache", { key: "default" });
    if (existing) {
      return {
        tags: normalizeTags(existing.tags ?? existing.tags_json ?? []),
        last_sync_at: existing.last_sync_at ?? existing.updated_at ?? new Date().toISOString()
      };
    }

    return this.setTags(DEFAULT_TAGS);
  }

  async setTags(tags: string[]): Promise<TagCache> {
    const tagCache = {
      key: "default",
      tags: normalizeTags(tags),
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.upsertByField("tag_cache", "key", "default", tagCache);
    return { tags: tagCache.tags, last_sync_at: tagCache.last_sync_at };
  }

  async addCapture(record: CaptureRecord): Promise<void> {
    await this.db.collection("capture_records").add(record);
  }

  async addDraft(draft: DraftRecord): Promise<void> {
    await this.db.collection("drafts").add(draft);
  }

  async listDrafts(): Promise<DraftRecord[]> {
    const result = await this.db.collection("drafts").orderBy("created_at", "desc").limit(100).get();
    return stripCloudBaseIds(result.data ?? []) as DraftRecord[];
  }

  async getDraft(id: string): Promise<DraftRecord | undefined> {
    const existing = await this.findOne("drafts", { id });
    return existing ? (stripCloudBaseId(existing) as DraftRecord) : undefined;
  }

  async updateDraft(updated: DraftRecord): Promise<void> {
    await this.upsertByField("drafts", "id", updated.id, updated);
  }

  private async findOne(collection: string, where: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    const result = await this.db.collection(collection).where(where).limit(1).get();
    return result.data?.[0];
  }

  private async upsertByField(
    collection: string,
    field: string,
    value: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const existing = await this.findOne(collection, { [field]: value });
    if (existing?._id) {
      await this.db.collection(collection).doc(existing._id).update(data);
      return;
    }
    await this.db.collection(collection).add(data);
  }
}

function normalizeTags(tags: string[]): string[] {
  return tags.map((tag) => {
    const trimmed = String(tag).trim();
    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  });
}

function stripCloudBaseIds(records: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return records.map(stripCloudBaseId);
}

function stripCloudBaseId(record: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = record;
  return rest;
}
