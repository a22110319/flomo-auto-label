const FALLBACK_TYPE_TAG = "#类型/备忘";

export function validateTags(aiTags: string[], tagTree: string[]): string[] {
  const known = new Set(tagTree.map(normalizeTag));
  const result: string[] = [];

  for (const tag of aiTags) {
    const normalized = normalizeTag(tag);
    if (known.has(normalized) && !result.includes(normalized)) {
      result.push(normalized);
    }
  }

  if (!result.some((tag) => tag.startsWith("#类型/"))) {
    result.unshift(FALLBACK_TYPE_TAG);
  }

  if (result.length === 0) {
    result.push(FALLBACK_TYPE_TAG);
  }

  return result.filter((tag) => known.has(tag)).slice(0, 4);
}

export function normalizeTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}
