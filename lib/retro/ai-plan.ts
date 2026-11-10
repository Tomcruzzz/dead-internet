import type { RetroPage } from "./types";

export interface RetroPlan { layout: "directory" | "newspaper" | "desktop"; featuredBlocks: number[]; rationale: string }
export const RETRO_PLAN_SCHEMA = { type: "object", additionalProperties: false, properties: {
  layout: { type: "string", enum: ["directory", "newspaper", "desktop"] },
  featuredBlocks: { type: "array", maxItems: 8, items: { type: "integer", minimum: 0 } },
  rationale: { type: "string", maxLength: 450 },
}, required: ["layout", "featuredBlocks", "rationale"] };

// Preserve source text and links. The model may choose layout/order, never executable output.
export function normalizeAiPage(page: RetroPage): RetroPage {
  const blocks = [...page.blocks];
  const links = [...page.links];
  for (const video of page.remake?.videos ?? []) {
    blocks.push({ kind: "heading", text: video.title, level: 2 }, { kind: "paragraph", text: `${video.author} · ${video.duration}` });
    links.push({ label: video.title, url: video.url });
  }
  const repo = page.remake?.repository;
  if (repo) {
    blocks.push({ kind: "heading", text: repo.fullName, level: 2 });
    if (repo.description) blocks.push({ kind: "paragraph", text: repo.description });
    if (repo.file) blocks.push({ kind: "code", text: repo.file.text.slice(0, 6000) });
    for (const entry of repo.entries.slice(0, 20)) links.push({ label: entry.name, url: entry.url });
  }
  return { sourceUrl: page.sourceUrl, title: page.title, description: page.description, blocks: blocks.slice(0, 100), links: links.slice(0, 40), fetchedAt: page.fetchedAt, truncated: page.truncated || blocks.length > 100 };
}

export function validateRetroPlan(value: unknown, count: number): RetroPlan {
  if (!value || typeof value !== "object") throw new Error("Invalid transformation plan");
  const plan = value as RetroPlan;
  if (Object.keys(plan).sort().join() !== "featuredBlocks,layout,rationale" || !["directory", "newspaper", "desktop"].includes(plan.layout) ||
    !Array.isArray(plan.featuredBlocks) || plan.featuredBlocks.length > 8 || new Set(plan.featuredBlocks).size !== plan.featuredBlocks.length ||
    plan.featuredBlocks.some(id => !Number.isInteger(id) || id < 0 || id >= count) ||
    typeof plan.rationale !== "string" || !plan.rationale.trim() || plan.rationale.length > 450 || /<|>|https?:\/\//i.test(plan.rationale)) throw new Error("Invalid transformation plan");
  return plan;
}

export function applyRetroPlan(page: RetroPage, plan: RetroPlan, model: string): RetroPage {
  validateRetroPlan(plan, page.blocks.length);
  // Reorder source blocks without adding or dropping their text.
  const starts = new Set(plan.featuredBlocks);
  const selected = page.blocks.filter((_, index) => starts.has(index));
  return { ...page, blocks: [...plan.featuredBlocks.map(id => page.blocks[id]), ...page.blocks.filter(block => !selected.includes(block))],
    ai: { model, layout: plan.layout, rationale: plan.rationale, generatedAt: new Date().toISOString() } };
}
