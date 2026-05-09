export function buildCaptureSystemPrompt(): string {
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

export function buildCaptureJsonSchema(tagTree: string[]): Record<string, unknown> {
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
