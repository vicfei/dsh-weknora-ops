// WeKnora HTTP client. Zero runtime dependencies: Node 20+ global fetch.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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
  // DSH's agent shell scrubs *KEY* env vars (secret hygiene), so a config file
  // is the primary channel inside agent harnesses; env still wins for CI/ops.
  const file = env.WEKNORA_CLI_CONFIG || join(homedir(), ".config", "weknora-ops", "config");
  const fileEnv: Record<string, string> = {};
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const m = /^export\s+([A-Z_]+)=(.*)$/.exec(line.trim()) ?? /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m) fileEnv[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // absent config file is normal
  }
  const pick = (name: string): string | undefined => env[name] || fileEnv[name] || undefined;
  const baseUrl = (pick("WEKNORA_URL") || "http://127.0.0.1:8080").replace(/\/+$/, "");
  const apiKey = pick("WEKNORA_API_KEY") || "";
  const tenantId = pick("WEKNORA_TENANT_ID") || undefined;
  if (!apiKey) {
    throw new Error(
      "WEKNORA_API_KEY not found in env or " + file + ". Create a workspace API key in WeKnora " +
        "(设置 → API Keys, capabilities retrieve/chat/ingest), then either export " +
        "WEKNORA_API_KEY=<key> or write it to " + file + " (chmod 600) — the config file is the " +
        "reliable channel inside DSH, whose agent shell scrubs *KEY* env vars.",
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
