import { type Tokenizer } from "@huggingface/tokenizers";
import { describe, expect, it } from "vitest";
import { getHuggingfaceSegments } from "./segments";

// A byte-level stand-in for a Hugging Face tokenizer: every token string is a hex string
// of raw UTF-8 bytes, a "<...>" special token (decoded as its own text), or a single
// ASCII character (decoded as itself, like the context token used by the segmenter).
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBytes = (token: string) =>
  token.startsWith("<") || token.length === 1
    ? [...encoder.encode(token)]
    : token.match(/../g)!.map((h) => parseInt(h, 16));
const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

const fake = {
  decoder: { decode: (tokens: string[]) => decoder.decode(new Uint8Array(tokens.flatMap(toBytes))) },
} as unknown as Tokenizer;

function segmentsOf(text: string, tokens: string[]) {
  const ids = tokens.map((_, i) => i);
  return getHuggingfaceSegments(fake, text, { ids, tokens });
}

const countOf = (segments: ReturnType<typeof segmentsOf>) =>
  segments.reduce((n, s) => n + s.tokens.length, 0);

describe("getHuggingfaceSegments", () => {
  it("splits at character boundaries when tokens align with characters", () => {
    const segments = segmentsOf("你好", ["e4bda0", "e5a5bd"]);
    expect(segments.map((s) => s.text)).toEqual(["你", "好"]);
  });

  it("joins tokens that split a character into bytes", () => {
    const segments = segmentsOf("你好", ["e4bd", "a0e5", "a5bd"]);
    expect(segments.map((s) => s.text)).toEqual(["你好"]);
    expect(segments[0]!.tokens.map((t) => t.idx)).toEqual([0, 1, 2]);
  });

  it("keeps a grapheme cluster together", () => {
    const text = "a👩‍👦b";
    const tokens = [...encoder.encode(text)].map((b) => hex([b]));
    expect(segmentsOf(text, tokens).map((s) => s.text)).toEqual(["a", "👩‍👦", "b"]);
  });

  it("gives special tokens that are not part of the input their own segment", () => {
    const segments = segmentsOf("hi", ["<|start|>", "68", "69", "<|end|>"]);
    expect(segments.map((s) => s.text)).toEqual(["<|start|>", "h", "i", "<|end|>"]);
    expect(countOf(segments)).toBe(4);
  });

  it("returns no segments for no tokens", () => {
    expect(segmentsOf("", [])).toEqual([]);
  });

  it("counts every token exactly once and rebuilds the text for random splits", () => {
    const pool = ["a", "Z", " ", "\n", "你", "好", "é", "e\u0301", "👩‍👦", "🇨🇿", "🧑🏾‍💻", "，", "9"];
    let seed = 20261025;
    const random = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
    for (let n = 0; n < 200; n++) {
      const text = Array.from({ length: 1 + Math.floor(random() * 30) }, () => pool[Math.floor(random() * pool.length)]).join("");
      const bytes = [...encoder.encode(text)];
      const tokens: string[] = [];
      for (let i = 0; i < bytes.length; ) {
        const size = 1 + Math.floor(random() * 5);
        tokens.push(hex(bytes.slice(i, i + size)));
        i += size;
      }
      const segments = segmentsOf(text, tokens);
      expect(countOf(segments)).toBe(tokens.length);
      expect(segments.map((s) => s.text).join("")).toBe(text);
    }
  });

  it("handles a 20,000 character input in linear time", () => {
    const text = "你好，世界！".repeat(3400);
    const tokens = [...encoder.encode(text)].map((b) => hex([b]));
    const started = performance.now();
    const segments = segmentsOf(text, tokens);
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(countOf(segments)).toBe(tokens.length);
  });
});
