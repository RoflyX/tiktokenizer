import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { oaiModels } from "./index";
import { TiktokenTokenizer } from "./tokenizer";

// Offline: every listed OpenAI model must build a tokenizer and count tokens.
describe("OpenAI models", () => {
  it.each(oaiModels.options)("%s tokenizes", (model) => {
    const tokenizer = new TiktokenTokenizer(model);
    try {
      const result = tokenizer.tokenize("Hello, 世界!");
      expect(result.count).toBeGreaterThan(0);
      expect(result.segments?.map((s) => s.text).join("")).toBe("Hello, 世界!");
    } finally {
      tokenizer.free();
    }
  });
});

// With PARITY_DIR (see scripts/parity.py): names must resolve to the same encoding as
// Python tiktoken, i.e. exact table first, then the first matching prefix.
const dir = process.env.PARITY_DIR;
const file = dir ? resolve(dir, "openai-models.json") : "";
const suite = file && existsSync(file) ? describe : describe.skip;
// JS tiktoken has no o200k_harmony; ids of ordinary text are identical to o200k_base.
const JS_ALIAS: Record<string, string> = { o200k_harmony: "o200k_base" };

suite("OpenAI model names match official tiktoken", () => {
  const tables = file
    ? (JSON.parse(readFileSync(file, "utf8")) as {
        exact: Record<string, string>;
        prefix: Record<string, string>;
      })
    : { exact: {}, prefix: {} };

  const resolveEncoding = (model: string): string | undefined =>
    tables.exact[model] ??
    Object.entries(tables.prefix).find(([prefix]) =>
      model.startsWith(prefix)
    )?.[1];

  it.each(oaiModels.options)(
    "%s resolves to the official encoding",
    (model) => {
      const official = resolveEncoding(model);
      expect(official, `${model} is unknown to tiktoken`).toBeDefined();
      const tokenizer = new TiktokenTokenizer(model);
      try {
        expect(tokenizer.name).toBe(JS_ALIAS[official!] ?? official);
      } finally {
        tokenizer.free();
      }
    }
  );
});
