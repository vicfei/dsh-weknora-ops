// Output discipline for an agent-facing CLI: WeKnora can return thousands of
// chunks or a whole knowledge-base listing; the DSH agent's context is the
// scarce resource. Keep the head (what am I looking at) and the tail (where
// errors usually live), mark the cut, and hard-cap totals.

export const MAX_TOTAL = 24_000;
export const HEAD = 18_000;
export const TAIL = 5_000;

export function clip(text: string, max = MAX_TOTAL, head = HEAD, tail = TAIL): string {
  if (text.length <= max) return text;
  const kept = text.slice(0, head) + "\n…[weknora-ops: output clipped, " + (text.length - max) + " chars dropped]…\n" + text.slice(-tail);
  return kept;
}

/** Render a value as compact JSON, clipped. */
export function render(value: unknown): string {
  return clip(JSON.stringify(value, null, 2));
}

/** Thrown for usage errors; the CLI entry turns it into stderr + exit 1. */
export class CliError extends Error {}

export function fail(message: string): never {
  throw new CliError(message);
}
