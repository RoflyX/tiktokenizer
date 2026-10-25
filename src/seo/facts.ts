// Build-time only: imported from getStaticProps, so it never reaches the browser bundle.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { get_encoding } from "tiktoken";
import { Tokenizer as HfTokenizer } from "@huggingface/tokenizers";
import {
  oaiEncodings,
  oaiModels,
  openSourceModels,
  type AllOptions,
} from "~/models";
import {
  OpenSourceTokenizer,
  TiktokenTokenizer,
  type Tokenizer,
} from "~/models/tokenizer";
import type { LandingEntry } from "./pages";

export const SAMPLES = [
  { label: "English", text: "The quick brown fox jumps over the lazy dog." },
  { label: "Chinese", text: "你好，世界！今天天气很好。" },
  { label: "Code", text: "def add(a, b):\n    return a + b" },
] as const;

export interface PageFacts {
  samples: { label: string; text: string; tokens: number }[];
  /** OpenAI encodings only: approximate vocabulary size, in thousands. */
  vocabK?: number;
  /** OpenAI model pages only: encoding the model resolves to. */
  encoding?: string;
  /** Encoding pages only: model names that resolve to this encoding. */
  models?: string[];
  /** Open-source models only: provenance from tokenizers.json. */
  source?: { repo: string; revision: string; license: string };
}

interface Manifest {
  models: { repo: string; revision: string; license: string }[];
}

// `next build` runs from the repository root; __dirname points into .next and is not usable here.
const readJson = <T>(file: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), file), "utf8")) as T;

function loadTokenizer(option: AllOptions): Tokenizer {
  const oss = openSourceModels.safeParse(option);
  if (!oss.success) {
    return new TiktokenTokenizer(
      option as ConstructorParameters<typeof TiktokenTokenizer>[0]
    );
  }
  const dir = `public/hf/${oss.data}`;
  return new OpenSourceTokenizer(
    new HfTokenizer(
      readJson<object>(`${dir}/tokenizer.json`),
      readJson<object>(`${dir}/tokenizer_config.json`)
    ),
    oss.data
  );
}

let encodingByModel: Record<string, string> | undefined;

/** Encoding name per OpenAI model name, taken from the tokenizers the app really uses. */
function modelEncodings(): Record<string, string> {
  if (!encodingByModel) {
    encodingByModel = {};
    for (const model of oaiModels.options) {
      const t = new TiktokenTokenizer(model);
      encodingByModel[model] = t.name;
      t.free();
    }
  }
  return encodingByModel;
}

export function computeFacts(entry: LandingEntry): PageFacts {
  const tokenizer = loadTokenizer(entry.option);
  try {
    const facts: PageFacts = {
      samples: SAMPLES.map((s) => ({
        label: s.label,
        text: s.text,
        tokens: tokenizer.tokenize(s.text).count,
      })),
    };

    const encoding = oaiEncodings.safeParse(entry.option);
    if (encoding.success) {
      const enc = get_encoding(encoding.data);
      facts.vocabK = Math.round(enc.token_byte_values().length / 1000);
      enc.free();
      facts.models = Object.entries(modelEncodings())
        .filter(([, name]) => name === entry.option)
        .map(([model]) => model);
    }

    if (oaiModels.safeParse(entry.option).success) {
      facts.encoding = modelEncodings()[entry.option];
    }

    const oss = openSourceModels.safeParse(entry.option);
    if (oss.success) {
      const m = readJson<Manifest>("tokenizers.json").models.find(
        (x) => x.repo === oss.data
      );
      if (!m) throw new Error(`${oss.data} is missing from tokenizers.json`);
      facts.source = {
        repo: m.repo,
        revision: m.revision,
        license: m.license,
      };
    }
    return facts;
  } finally {
    tokenizer.free?.();
  }
}
