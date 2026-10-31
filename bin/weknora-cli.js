#!/usr/bin/env node
// Thin launcher: runs the TypeScript CLI through tsx so a global install
// (`npm i -g vicfei/dsh-weknora`) exposes a stable `weknora-cli`.
//
// Node resolves a bare `--import tsx` from the CWD, so invoking the bin from
// anywhere outside the package tree fails with ERR_MODULE_NOT_FOUND. Run the
// child with cwd pinned to this package — its node_modules (or the global
// root one level up) always resolves tsx.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, "..");
const entry = join(pkgDir, "src", "cli.ts");
const child = spawnSync(process.execPath, ["--import", "tsx", entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: pkgDir,
});
process.exit(child.status ?? 1);
