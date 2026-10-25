import { get_encoding, encoding_for_model, type Tiktoken } from "tiktoken";
import { oaiEncodings, oaiModels, openSourceModels } from ".";
import { Tokenizer as HfTokenizer } from "@huggingface/tokenizers";
import type { z } from "zod";
import {
  getHuggingfaceSegments,
  getTiktokenSegments,
  type Segment,
} from "~/utils/segments";

export interface TokenizerResult {
  name: string;
  // Array<{ text: string; tokens: { id: number; idx: number }[] }> ?
  tokens: number[];
  segments?: Segment[];
  count: number;
}

export interface Tokenizer {
  name: string;
  tokenize(text: string): TokenizerResult;
  free?(): void;
}

export class TiktokenTokenizer implements Tokenizer {
  private enc: Tiktoken;
  name: string;
  constructor(model: z.infer<typeof oaiModels> | z.infer<typeof oaiEncodings>) {
    const isModel = oaiModels.safeParse(model);
    const isEncoding = oaiEncodings.safeParse(model);
    if (isModel.success) {

      const enc =
        model === "gpt-3.5-turbo" || model === "gpt-4" || model === "gpt-4-32k"
          ? get_encoding("cl100k_base", {
              "<|im_start|>": 100264,
              "<|im_end|>": 100265,
              "<|im_sep|>": 100266,
            })
          : model === "gpt-4o"
          ? get_encoding("o200k_base", {
              "<|im_start|>": 200264,
              "<|im_end|>": 200265,
              "<|im_sep|>": 200266,
            })
          : model.startsWith("gpt-oss-")
          ? // tiktoken (JS) has no o200k_harmony. Its ids for ordinary text equal o200k_base
            // (checked against Python tiktoken 0.14.0); only the special tokens differ.
            get_encoding("o200k_base")
          : // @ts-expect-error r50k broken?
            encoding_for_model(model);
      this.name = enc.name ?? model;
      this.enc = enc;
    } else if (isEncoding.success) {
      this.enc = get_encoding(isEncoding.data);
      this.name = isEncoding.data;
    } else {
      throw new Error("Invalid model or encoding");
    }
  }

  tokenize(text: string): TokenizerResult {
    const tokens = [...(this.enc?.encode(text, "all") ?? [])];
    return {
      name: this.name,
      tokens,
      segments: getTiktokenSegments(this.enc, text),
      count: tokens.length,
    };
  }

  free(): void {
    this.enc.free();
  }
}

export class OpenSourceTokenizer implements Tokenizer {
  constructor(private tokenizer: HfTokenizer, public name: string) {}

  // Tokenizer files are vendored under /hf at build time (see tokenizers.json).
  static async load(
    model: z.infer<typeof openSourceModels>
  ): Promise<HfTokenizer> {
    const fetchJson = async (file: string): Promise<object> => {
      const res = await fetch(`/hf/${model}/${file}`);
      if (!res.ok) throw new Error(`Failed to load ${file} for ${model}: HTTP ${res.status}`);
      return (await res.json()) as object;
    };
    const [json, config] = await Promise.all([
      fetchJson("tokenizer.json"),
      fetchJson("tokenizer_config.json"),
    ]);
    return new HfTokenizer(json, config);
  }

  tokenize(text: string): TokenizerResult {
    const encoded = this.tokenizer.encode(text);
    return {
      name: this.name,
      tokens: encoded.ids,
      segments: getHuggingfaceSegments(this.tokenizer, text, encoded),
      count: encoded.ids.length,
    };
  }
}

export async function createTokenizer(name: string): Promise<Tokenizer> {
  const oaiEncoding = oaiEncodings.safeParse(name);
  if (oaiEncoding.success) {
    return new TiktokenTokenizer(oaiEncoding.data);
  }
  const oaiModel = oaiModels.safeParse(name);
  if (oaiModel.success) {
    return new TiktokenTokenizer(oaiModel.data);
  }

  const ossModel = openSourceModels.safeParse(name);
  if (ossModel.success) {
    const tokenizer = await OpenSourceTokenizer.load(ossModel.data);
    return new OpenSourceTokenizer(tokenizer, name);
  }
  throw new Error("Invalid model or encoding");
}
