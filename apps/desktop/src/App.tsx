import { CaptureApiClient } from "../../../packages/shared/src/apiClient";
import type { CaptureResult } from "../../../packages/shared/src/contracts";
import {
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Loader2,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

interface SettingsState {
  baseUrl: string;
  token: string;
}

interface LocalDraft {
  id: string;
  rawText: string;
  createdAt: string;
  errorMessage: string;
}

type SaveState =
  | { type: "idle"; message: string }
  | { type: "saving"; message: string }
  | { type: "success"; message: string; result: CaptureResult }
  | { type: "error"; message: string };

const SETTINGS_KEY = "flomo.desktop.settings";
const DRAFTS_KEY = "flomo.desktop.localDrafts";

const DEFAULT_SETTINGS: SettingsState = {
  baseUrl: "http://127.0.0.1:8787",
  token: "local-dev-token-change-before-deploy"
};

export function App() {
  const [settings, setSettings] = useState<SettingsState>(() => readJson(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [drafts, setDrafts] = useState<LocalDraft[]>(() => readJson(DRAFTS_KEY, []));
  const [text, setText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ type: "idle", message: "准备记录" });

  const apiClient = useMemo(() => new CaptureApiClient(settings), [settings]);
  const canSave = text.trim().length > 0 && saveState.type !== "saving";

  async function saveCurrentText() {
    const rawText = text.trim();
    if (!rawText) return;

    setSaveState({ type: "saving", message: "正在整理并写入 flomo" });
    try {
      const result = await apiClient.capture({
        raw_text: rawText,
        source: "desktop",
        client_id: "desktop-local",
        mode: "auto"
      });
      setText("");
      setSaveState({
        type: "success",
        message: result.status === "success" ? "已保存到 flomo" : "已保存为草稿",
        result
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "保存失败";
      const draft = createDraft(rawText, errorMessage);
      updateDrafts([draft, ...drafts]);
      setSaveState({ type: "error", message: errorMessage });
    }
  }

  async function retryDraft(draft: LocalDraft) {
    setSaveState({ type: "saving", message: "正在重试本地草稿" });
    try {
      const result = await apiClient.capture({
        raw_text: draft.rawText,
        source: "desktop",
        client_id: "desktop-local-retry",
        mode: "auto"
      });
      updateDrafts(drafts.filter((item) => item.id !== draft.id));
      setSaveState({ type: "success", message: "草稿已写入 flomo", result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "重试失败";
      updateDrafts(
        drafts.map((item) => (item.id === draft.id ? { ...item, errorMessage } : item))
      );
      setSaveState({ type: "error", message: errorMessage });
    }
  }

  function updateDrafts(nextDrafts: LocalDraft[]) {
    setDrafts(nextDrafts);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(nextDrafts));
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setShowSettings(false);
    setSaveState({ type: "idle", message: "设置已保存" });
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void saveCurrentText();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setText("");
    }
  }

  return (
    <main className="app-shell">
      <section className="capture-panel" aria-label="快速采集">
        <header className="topbar">
          <div>
            <p className="eyebrow">本地采集器</p>
            <h1>flomo 快速采集</h1>
          </div>
          <button
            className="icon-button"
            type="button"
            title="设置"
            aria-label="设置"
            onClick={() => setShowSettings((value) => !value)}
          >
            {showSettings ? <X size={20} /> : <Settings size={20} />}
          </button>
        </header>

        {showSettings ? (
          <form className="settings-form" onSubmit={saveSettings}>
            <label>
              <span>采集引擎地址</span>
              <input
                value={settings.baseUrl}
                onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
                placeholder="http://127.0.0.1:8787"
              />
            </label>
            <label>
              <span>访问 Token</span>
              <input
                value={settings.token}
                onChange={(event) => setSettings({ ...settings, token: event.target.value })}
                placeholder="Bearer token"
                type="password"
              />
            </label>
            <button className="primary-button" type="submit">
              <Save size={18} />
              保存设置
            </button>
          </form>
        ) : (
          <>
            <textarea
              autoFocus
              className="capture-input"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={onEditorKeyDown}
              placeholder="输入想法，按 Enter 保存"
            />

            <div className="action-row">
              <StatusPill state={saveState} />
              <button className="primary-button" type="button" disabled={!canSave} onClick={saveCurrentText}>
                {saveState.type === "saving" ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                保存
              </button>
            </div>

            {saveState.type === "success" ? (
              <ResultPreview result={saveState.result} />
            ) : null}
          </>
        )}
      </section>

      <aside className="draft-panel" aria-label="本地草稿">
        <div className="draft-title">
          <ClipboardList size={19} />
          <span>本地草稿</span>
          <strong>{drafts.length}</strong>
        </div>
        {drafts.length === 0 ? (
          <p className="empty-text">暂无失败草稿</p>
        ) : (
          <div className="draft-list">
            {drafts.map((draft) => (
              <article className="draft-item" key={draft.id}>
                <p>{draft.rawText}</p>
                <small>{draft.errorMessage}</small>
                <div className="draft-actions">
                  <button type="button" title="重试" aria-label="重试" onClick={() => retryDraft(draft)}>
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    title="删除"
                    aria-label="删除"
                    onClick={() => updateDrafts(drafts.filter((item) => item.id !== draft.id))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </aside>
    </main>
  );
}

function StatusPill({ state }: { state: SaveState }) {
  const icon =
    state.type === "saving" ? (
      <Loader2 className="spin" size={16} />
    ) : state.type === "success" ? (
      <CheckCircle2 size={16} />
    ) : state.type === "error" ? (
      <CircleAlert size={16} />
    ) : (
      <span className="dot" />
    );

  return <div className={`status-pill ${state.type}`}>{icon}<span>{state.message}</span></div>;
}

function ResultPreview({ result }: { result: CaptureResult }) {
  return (
    <section className="result-preview" aria-label="保存结果">
      <div className="tag-row">
        {result.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <p>{result.clean_text}</p>
    </section>
  );
}

function createDraft(rawText: string, errorMessage: string): LocalDraft {
  return {
    id: crypto.randomUUID(),
    rawText,
    createdAt: new Date().toISOString(),
    errorMessage
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
