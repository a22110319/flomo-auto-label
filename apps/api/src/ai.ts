import type { AiOrganizeResult } from "./types.ts";

export interface AiService {
  organize(rawText: string, tagTree: string[]): Promise<AiOrganizeResult>;
}

type LlmProvider = "local" | "openai" | "deepseek";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class LocalAiService implements AiService {
  async organize(rawText: string, tagTree: string[]): Promise<AiOrganizeResult> {
    const compact = rawText.trim().replace(/\s+/g, " ");
    const tags = chooseTags(compact, tagTree);
    return {
      clean_text: formatText(compact),
      tags,
      confidence: tags.length > 1 ? 0.74 : 0.52,
      reason: "本地启发式兜底；如需云端 AI，请配置 LLM_PROVIDER=deepseek 或 LLM_PROVIDER=openai"
    };
  }
}

export class OpenAiService implements AiService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async organize(rawText: string, tagTree: string[]): Promise<AiOrganizeResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        instructions: buildSystemPrompt(),
        input: JSON.stringify({ raw_text: rawText, tag_tree: tagTree }),
        text: {
          format: {
            type: "json_schema",
            name: "flomo_capture_result",
            strict: true,
            schema: buildJsonSchema(tagTree)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Responses API 调用失败：${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };
    const text = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((part) => part.text)?.text;
    if (!text) throw new Error("OpenAI 响应中没有可解析的文本内容");
    return parseAiJson(text);
  }
}

export class DeepSeekService implements AiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string, baseUrl = "https://api.deepseek.com") {
    this.apiKey = apiKey;
    this.model = model || "deepseek-v4-flash";
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async organize(rawText: string, tagTree: string[]): Promise<AiOrganizeResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: JSON.stringify({ raw_text: rawText, tag_tree: tagTree })
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek Chat Completions API 调用失败：${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("DeepSeek 响应中没有可解析的文本内容");
    return parseAiJson(text);
  }
}

export function createAiService(options: {
  provider: LlmProvider;
  openaiApiKey?: string;
  openaiModel: string;
  deepseekApiKey?: string;
  deepseekModel: string;
  deepseekBaseUrl: string;
}): AiService {
  if (options.provider === "openai" && options.openaiApiKey) {
    return new OpenAiService(options.openaiApiKey, options.openaiModel);
  }
  if (options.provider === "deepseek" && options.deepseekApiKey) {
    return new DeepSeekService(options.deepseekApiKey, options.deepseekModel, options.deepseekBaseUrl);
  }
  return new LocalAiService();
}

function buildSystemPrompt(): string {
  return [
    "你是个人 flomo 快速采集器的 AI 整理与标签选择模块。",
    "请整理用户原始笔记，但不要改变原意，不要拔高，不要编造背景。",
    "可以轻微补全语句、拆成列表、优化段落清晰度。",
    "只能从传入的 tag_tree 中选择标签，绝不能创建新标签。",
    "每条笔记至少返回 1 个标签，最多返回 4 个标签。",
    "优先选择 1 个 #类型/... 标签；如果领域明确，再选择 1 到 3 个 #领域/... 标签。",
    "如果不确定，使用 #类型/备忘。",
    "正文只允许使用普通段落、无序列表、有序列表、加粗和空行。",
    "不要使用标题、表格、代码块、引用块、图片或复杂 Markdown 链接。",
    "只返回合法 JSON，字段必须是 clean_text、tags、confidence、reason。"
  ].join("\n");
}

function buildJsonSchema(tagTree: string[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["clean_text", "tags", "confidence", "reason"],
    properties: {
      clean_text: { type: "string" },
      tags: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: { type: "string", enum: tagTree }
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reason: { type: "string" }
    }
  };
}

function parseAiJson(text: string): AiOrganizeResult {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(trimmed) as Partial<AiOrganizeResult>;
  return {
    clean_text: String(parsed.clean_text ?? ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    reason: parsed.reason ? String(parsed.reason) : undefined
  };
}

function chooseTags(text: string, tagTree: string[]): string[] {
  const tags = ["#类型/备忘"];

  if (/想到|想法|灵感|idea/i.test(text) && tagTree.includes("#类型/灵感")) {
    tags[0] = "#类型/灵感";
  }
  if (/任务|todo|需要|记得/i.test(text) && tagTree.includes("#类型/任务")) {
    tags[0] = "#类型/任务";
  }
  if (/NDD|智能驾驶|评价|测试|指标/i.test(text)) {
    for (const tag of [
      "#领域/技术/智能驾驶/测试与评价",
      "#领域/技术/智能驾驶/测试与评价/评价指标",
      "#领域/技术/智能驾驶",
      "#领域/技术"
    ]) {
      if (tagTree.includes(tag)) tags.push(tag);
    }
  }
  return tags;
}

function formatText(text: string): string {
  if (/偏离程度/.test(text) && /偏离维度/.test(text) && /偏离场景分布/.test(text)) {
    return [
      "NDD 评价模块第一版不应直接判断系统表现的好坏，而应先输出三个结果：",
      "",
      "- 偏离程度",
      "- 偏离维度",
      "- 偏离场景分布"
    ].join("\n");
  }
  return text;
}
