#!/usr/bin/env node
// Thin launcher: runs the TypeScript CLI through tsx so a global install
// (`npm i -g vicfei/dsh-weknora` or `npm link`) exposes a stable `weknora-cli`.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "..", "src", "cli.ts");
const child = spawnSync(process.execPath, ["--import", "tsx", entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(child.status ?? 1);
