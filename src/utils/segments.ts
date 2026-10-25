import { type Tiktoken } from "tiktoken";
import Graphemer from "graphemer";
import { type Encoding, type Tokenizer } from "@huggingface/tokenizers";

const textDecoder = new TextDecoder();
const graphemer = new Graphemer();

export type Segment = {
  text: string;
  tokens: { id: number; idx: number }[];
};

export function getTiktokenSegments(
  encoder: Tiktoken,
  inputText: string
): Segment[] {
  const tokens = encoder.encode(inputText, "all");
  const segments: { text: string; tokens: { id: number; idx: number }[] }[] =
    [];

  let byteAcc: number[] = [];
  let tokenAcc: { id: number; idx: number }[] = [];
  let inputGraphemes = graphemer.splitGraphemes(inputText);

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx]!;
    byteAcc.push(...encoder.decode_single_token_bytes(token));
    tokenAcc.push({ id: token, idx });

    const segmentText = textDecoder.decode(new Uint8Array(byteAcc));
    const graphemes = graphemer.splitGraphemes(segmentText);

    if (graphemes.every((item, idx) => inputGraphemes[idx] === item)) {
      segments.push({ text: segmentText, tokens: tokenAcc });

      byteAcc = [];
      tokenAcc = [];
      inputGraphemes = inputGraphemes.slice(graphemes.length);
    }
  }

  return segments;
}

// Decoders cannot decode a window in isolation: sentencepiece-style decoders strip the
// leading space of the first token. A context token that every decoder maps to itself
// is put in front of each window and removed from the result again.
const CONTEXT_TOKEN = "a";
// A grapheme cluster (emoji ZWJ sequences, stacked combining marks) can span many tokens.
const MAX_TOKENS_PER_SEGMENT = 32;
const REPLACEMENT_CHAR = "\uFFFD";

/**
 * Groups the tokens of `encoded` into segments whose decoded text is aligned with the
 * grapheme clusters of `inputText`. Every token ends up in exactly one segment, so the
 * segment token counts always add up to `encoded.ids.length`. Tokens that cannot be
 * matched to the input (special tokens, normalized text) get a segment of their own.
 * Runs in linear time in the number of tokens.
 */
export function getHuggingfaceSegments(
  tokenizer: Tokenizer,
  inputText: string,
  encoded: Pick<Encoding, "ids" | "tokens">
): Segment[] {
  const { ids, tokens: tokenStrs } = encoded;
  const decode = (strs: string[]) =>
    tokenizer.decoder ? tokenizer.decoder.decode(strs) : strs.join(" ");
  const contextLength = decode([CONTEXT_TOKEN]).length;
  const windowText = (start: number, end: number) =>
    start === 0
      ? decode(tokenStrs.slice(0, end + 1))
      : decode([CONTEXT_TOKEN, ...tokenStrs.slice(start, end + 1)]).slice(contextLength);

  // Normalizers such as NFC change the text the tokens were produced from. If the full
  // decode only equals the NFC form of the input, match against that form instead.
  const decodedAll = decode(tokenStrs);
  const nfcText = inputText.normalize("NFC");
  const basis =
    decodedAll !== inputText && decodedAll === nfcText ? nfcText : inputText;

  // isBoundary[i] is true when a grapheme cluster of basis starts at UTF-16 offset i.
  const isBoundary = new Uint8Array(basis.length + 1);
  let offset = 0;
  for (const grapheme of graphemer.splitGraphemes(basis)) {
    isBoundary[offset] = 1;
    offset += grapheme.length;
  }
  isBoundary[basis.length] = 1;

  const makeSegment = (text: string, start: number, end: number): Segment => ({
    text,
    tokens: Array.from({ length: end - start + 1 }, (_, k) => ({
      id: ids[start + k]!,
      idx: start + k,
    })),
  });

  const segments: Segment[] = [];
  let pos = 0;
  let start = 0;
  while (start < ids.length) {
    let end = start;
    let emitted = false;
    for (; end < Math.min(ids.length, start + MAX_TOKENS_PER_SEGMENT); end++) {
      const text = windowText(start, end);
      const matches = basis.startsWith(text, pos);
      if (!matches && text.endsWith(REPLACEMENT_CHAR)) continue; // incomplete UTF-8 sequence
      if (!matches) break;
      if (isBoundary[pos + text.length]) {
        segments.push(makeSegment(text, start, end));
        pos += text.length;
        start = end + 1;
        emitted = true;
        break;
      }
    }
    if (!emitted) {
      segments.push(makeSegment(windowText(start, start), start, start));
      start += 1;
    }
  }

  return segments;
}
