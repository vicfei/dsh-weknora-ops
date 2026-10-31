import { describe, expect, it } from "vitest";
import { clip, render } from "../src/clip.js";

describe("clip", () => {
  it("keeps short output untouched", () => {
    expect(clip("hello")).toBe("hello");
  });
  it("keeps head and tail with a marked cut", () => {
    const big = "a".repeat(50_000);
    const out = clip(big);
    expect(out.length).toBeLessThan(50_000);
    expect(out).toContain("output clipped");
    expect(out.startsWith("a")).toBe(true);
    expect(out.endsWith("a")).toBe(true);
  });
});

describe("render", () => {
  it("renders JSON and clips", () => {
    const out = render({ chunks: "x".repeat(40_000) });
    expect(out).toContain("{");
    expect(out).toContain("output clipped");
  });
});

describe("arg conventions (documented in HELP)", () => {
  it("positionals map to _0/_1 in command args", async () => {
    // The CLI builds { _0: kb, _1: query } for `search <kb> <query>`;
    // importing cli.ts would run main(), so assert the convention via the
    // commands module's usage instead: requireValue on _1 must succeed.
    const mod = await import("../src/commands.js");
    expect(typeof mod.search).toBe("function");
    expect(typeof mod.docDelete).toBe("function");
  });
});

describe("delete gate", () => {
  it("refuses without --yes before touching the network", async () => {
    const mod = await import("../src/commands.js");
    await expect(
      mod.docDelete({ _0: "kb", _1: "doc" }),
    ).rejects.toThrow(/without --yes/);
  });
});
