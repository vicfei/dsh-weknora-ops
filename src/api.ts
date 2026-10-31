// WeKnora HTTP client. Zero runtime dependencies: Node 20+ global fetch.
//
// Auth model (WeKnora docs/04-api/01-api-overview.md):
//   X-API-Key: <key>            — workspace-scoped machine principal (recommended for agents)
//   X-Tenant-ID: <id>           — optional tenant switch for platform keys
//
// The recommended setup is a *scoped* API key (capabilities: retrieve, chat,
// ingest). The key is the enforcement layer; the skill instructions are the
// etiquette layer. Destructive routes simply 403 when the key lacks the
// capability.

export interface WeKnoraConfig {
  baseUrl: string;
  apiKey: string;
  tenantId?: string;
}

export class WeKnoraError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    const detail = body.slice(0, 300).replace(/\s+/g, " ");
    super(`WeKnora HTTP ${status}: ${detail || "(no body)"}`);
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WeKnoraConfig {
  const baseUrl = (env.WEKNORA_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
  const apiKey = env.WEKNORA_API_KEY || "";
  const tenantId = env.WEKNORA_TENANT_ID || undefined;
  if (!apiKey) {
    throw new Error(
      "WEKNORA_API_KEY is not set. Create a workspace API key in WeKnora (设置 → API Keys) " +
        "with capabilities retrieve/chat/ingest, then export WEKNORA_API_KEY=<key> " +
        "[WEKNORA_URL=<base>] [WEKNORA_TENANT_ID=<id>].",
    );
  }
  return { baseUrl, apiKey, tenantId };
}

export async function request(
  cfg: WeKnoraConfig,
  method: string,
  path: string,
  opts: { body?: unknown; formData?: FormData; timeoutMs?: number } = {},
): Promise<unknown> {
  const headers: Record<string, string> = { "X-API-Key": cfg.apiKey };
  if (cfg.tenantId) headers["X-Tenant-ID"] = cfg.tenantId;
  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);
  try {
    const res = await fetch(cfg.baseUrl + path, { method, headers, body, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) throw new WeKnoraError(res.status, text);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
}

/** GET /health — the one unauthenticated route; used by `status` before auth. */
export async function health(baseUrl: string): Promise<unknown> {
  const res = await fetch(baseUrl.replace(/\/+$/, "") + "/health", { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new WeKnoraError(res.status, await res.text());
  return res.json();
}
