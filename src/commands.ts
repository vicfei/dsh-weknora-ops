// Command implementations. One function per CLI verb; all output goes through
// clip/render so the DSH agent's context stays bounded.

import { readFile, stat } from "node:fs/promises";
import { request, health, loadConfig, WeKnoraError } from "./api.js";
import { render, fail } from "./clip.js";

type Args = Record<string, string | boolean | undefined>;

function requireValue(args: Args, key: string, what: string): string {
  const v = args[key];
  if (typeof v !== "string" || !v) fail(`missing <${what}> — see --help`);
  return v;
}

function num(args: Args, key: string, dflt: number): number {
  const v = args[key];
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

// ---------- read commands (safe by construction) ----------

export async function status(): Promise<string> {
  const cfg = loadConfig();
  const h = await health(cfg.baseUrl);
  const me = await request(cfg, "GET", "/api/v1/knowledge-bases?page=1&page_size=1").catch((e) => ({
    note: `auth probe failed: ${(e as Error).message}`,
  }));
  return render({ health: h, auth_probe: me });
}

export async function kbList(args: Args): Promise<string> {
  const cfg = loadConfig();
  const page = num(args, "page", 1);
  const size = Math.min(num(args, "size", 30), 100);
  // Some WeKnora versions ignore page/page_size here and return the whole
  // tenant (observed: 1.2 MB for 542 KBs). Compact client-side before the
  // clip ever gets involved: the agent needs id/name/counts, not config blobs.
  const res = (await request(cfg, "GET", `/api/v1/knowledge-bases?page=${page}&page_size=${size}`)) as {
    data?: Array<Record<string, unknown>>;
  };
  const all = (res.data ?? []).map((k) => ({
    id: k.id,
    name: k.name,
    type: k.knowledge_type ?? k.type,
    documents: k.knowledge_count,
    chunks: k.chunk_count,
  }));
  const slice = all.slice((page - 1) * size, page * size);
  return render({ total: all.length, page, size, knowledge_bases: slice });
}

export async function kbShow(args: Args): Promise<string> {
  const cfg = loadConfig();
  return render(await request(cfg, "GET", `/api/v1/knowledge-bases/${requireValue(args, "_0", "kb-id")}`));
}

/**
 * Hybrid search — the citation-grounded retrieval primitive.
 * POST /api/v1/knowledge-bases/:id/hybrid-search {query, top_k, ...}
 */
export async function search(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const query = requireValue(args, "_1", "query");
  const topK = num(args, "top-k", 5);
  const res = await request(cfg, "POST", `/api/v1/knowledge-bases/${kb}/hybrid-search`, {
    // Dual field names: v5 docs use `query`/`top_k`, v0.8.0-line servers
    // (observed on v3.1.3) bind `query_text`/`match_count` and 400 otherwise.
    body: { query, query_text: query, top_k: topK, match_count: topK, rewrite_query: false },
  });
  return render(res);
}

/**
 * Knowledge-grounded ask. Consumes the knowledge-chat SSE stream and returns
 * the assembled answer plus its references — the agent cites WeKnora, never
 * its own memory, for anything this command returned.
 */
export async function ask(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const question = requireValue(args, "_1", "question");
  const sessionId = `dsh-weknora-ops-${Date.now()}`;
  const res = await request(cfg, "POST", `/api/v1/knowledge-chat/${sessionId}`, {
    body: {
      query: question,
      knowledge_base_ids: [kb],
      stream: false,
    },
    timeoutMs: num(args, "timeout-ms", 300_000),
  });
  return render(res);
}

export async function docList(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const page = num(args, "page", 1);
  const q = `/api/v1/knowledge-bases/${kb}/knowledge?page=${page}&page_size=${Math.min(num(args, "size", 30), 100)}`;
  return render(await request(cfg, "GET", q));
}

export async function tagtree(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  return render(await request(cfg, "GET", `/api/v1/knowledge-bases/${kb}/tag-tree`));
}

// ---------- ingest commands (require an asking user) ----------

export async function docUpload(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const file = requireValue(args, "_1", "file");
  const info = await stat(file).catch(() => fail(`file not found: ${file}`));
  if (!info.isFile()) fail(`not a file: ${file}`);
  const fd = new FormData();
  // WeKnora multipart field name is "file" (knowledge/file endpoint).
  fd.append("file", new Blob([await readFile(file)]), file);
  const out: unknown[] = [];
  const res = await request(cfg, "POST", `/api/v1/knowledge-bases/${kb}/knowledge/file`, { formData: fd, timeoutMs: 600_000 });
  out.push({ file, result: res });
  return render(out);
}

export async function docUrl(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const url = requireValue(args, "_1", "url");
  return render(await request(cfg, "POST", `/api/v1/knowledge-bases/${kb}/knowledge/url`, { body: { url } }));
}

export async function docManual(args: Args): Promise<string> {
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const title = requireValue(args, "title", "title");
  const text = requireValue(args, "_1", "text");
  // Dual field names: v5 docs bind `text`, v0.8.0-line servers bind `content`.
  return render(await request(cfg, "POST", `/api/v1/knowledge-bases/${kb}/knowledge/manual`, { body: { title, text, content: text } }));
}

// ---------- destructive (double-gated: skill etiquette + key capability) ----------

export async function docDelete(args: Args): Promise<string> {
  if (args.yes !== true) {
    fail("refusing to delete without --yes. The skill instructs the agent to confirm with the user first; the API key capability is the second gate.");
  }
  const cfg = loadConfig();
  const kb = requireValue(args, "_0", "kb-id");
  const doc = requireValue(args, "_1", "doc-id");
  // v5 docs: DELETE /knowledge-bases/:kb/knowledge/:doc; v0.8.0-line servers
  // mount the per-document delete at /knowledge/:doc (KB-scoped group only has
  // the clear-all route). Try the documented shape, fall back on 404.
  try {
    return render(await request(cfg, "DELETE", `/api/v1/knowledge-bases/${kb}/knowledge/${doc}`));
  } catch (e) {
    if (e instanceof WeKnoraError && e.status === 404) {
      return render(await request(cfg, "DELETE", `/api/v1/knowledge/${doc}`));
    }
    throw e;
  }
}
