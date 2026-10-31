// weknora-cli — command surface for the dsh-weknora skill.
// Reads are agent-free; ingests are gated by the skill; deletes are gated twice.

import { fail } from "./clip.js";
import * as cmds from "./commands.js";

const HELP = `weknora-cli — query and operate WeKnora from a DeepSeek Harness agent

env: WEKNORA_URL (default http://127.0.0.1:8080) · WEKNORA_API_KEY (required)
     WEKNORA_TENANT_ID (optional, platform keys)

read:
  status                                  health + auth probe
  kb list [--page N] [--size N]           knowledge bases
  kb show <kb-id>                         one knowledge base
  search <kb-id> <query> [--top-k N]      hybrid retrieval with references
  ask <kb-id> <question>                  knowledge-grounded answer (cited)
  doc list <kb-id> [--page N]             documents + parse status
  tagtree <kb-id>                         hierarchical tag tree

ingest (only when a person asked for it):
  doc upload <kb-id> <file>               upload a document
  doc url <kb-id> <url>                   ingest a web page
  doc manual <kb-id> <text> --title T     add manual knowledge

destructive (requires --yes after user confirmation):
  doc delete <kb-id> <doc-id> --yes`;

/** Parse argv into flags (--key value | --flag) and positionals (_). */
function parse(argv: string[]): { flags: Record<string, string | boolean>; pos: string[] } {
  const flags: Record<string, string | boolean> = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === undefined) continue;
    if (a === "--help" || a === "-h") {
      process.stdout.write(HELP + "\n");
      process.exit(0);
    } else if (a.startsWith("--")) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      pos.push(a);
    }
  }
  return { flags, pos };
}

/** args object for command functions: positionals as _0,_1… + flags. */
function argsOf(pos: string[], flags: Record<string, string | boolean>): Record<string, string | boolean | undefined> {
  const out: Record<string, string | boolean | undefined> = { ...flags };
  pos.forEach((p, i) => (out[`_${i}`] = p));
  return out;
}

const GROUPED = new Set(["kb", "doc"]);

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    process.stdout.write(HELP + "\n");
    return;
  }
  const { flags, pos } = parse(argv);
  const group = pos[0] ?? "";
  const sub = GROUPED.has(group) ? pos[1] : undefined;
  const rest = GROUPED.has(group) ? pos.slice(2) : pos.slice(1);
  const args = argsOf(rest, flags);

  try {
    let out: string;
    switch (group) {
      case "status":
        out = await cmds.status();
        break;
      case "search":
        out = await cmds.search(args);
        break;
      case "ask":
        out = await cmds.ask(args);
        break;
      case "tagtree":
        out = await cmds.tagtree(args);
        break;
      case "kb":
        if (sub === "list") out = await cmds.kbList(args);
        else if (sub === "show") out = await cmds.kbShow(args);
        else fail(`kb: unknown subcommand "${sub ?? ""}" (list|show)`);
        break;
      case "doc":
        if (sub === "list") out = await cmds.docList(args);
        else if (sub === "upload") out = await cmds.docUpload(args);
        else if (sub === "url") out = await cmds.docUrl(args);
        else if (sub === "manual") out = await cmds.docManual(args);
        else if (sub === "delete") out = await cmds.docDelete(args);
        else fail(`doc: unknown subcommand "${sub ?? ""}" (list|upload|url|manual|delete)`);
        break;
      default:
        fail(`unknown command "${group}" — see --help`);
    }
    process.stdout.write(out.endsWith("\n") ? out : out + "\n");
  } catch (e) {
    process.stderr.write(`weknora-cli: ${(e as Error).message}\n`);
    process.exit(1);
  }
}

main();
