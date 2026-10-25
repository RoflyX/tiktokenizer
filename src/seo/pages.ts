import type { AllOptions } from "~/models";

export const SITE_URL = "https://tiktokenizer.chatgptcn.com";

export type PageKind = "encoding" | "model";

export interface LandingEntry {
  kind: PageKind;
  /** URL segment under /encoding or /model. No dots, so static hosts never treat it as a file extension. */
  slug: string;
  /** Option preselected in the tokenizer. */
  option: AllOptions;
  /** Short name used in headings and FAQ answers. */
  name: string;
  /** <title>; at most 70 characters. */
  title: string;
  /** Meta description; at most 170 characters. */
  description: string;
}

// Encoding and model names follow OpenAI's tiktoken name tables, see src/models/openai-models.test.ts.
export const LANDING_PAGES: readonly LandingEntry[] = [
  {
    kind: "encoding",
    slug: "o200k_base",
    option: "o200k_base",
    name: "o200k_base",
    title: "o200k_base Tokenizer: Token Counter for GPT-5 and GPT-4o",
    description:
      "Count tokens with o200k_base, the encoding of GPT-5, GPT-4.1, GPT-4o and the o-series. See token ids and splits. Runs in your browser.",
  },
  {
    kind: "encoding",
    slug: "cl100k_base",
    option: "cl100k_base",
    name: "cl100k_base",
    title: "cl100k_base Tokenizer: Token Counter for GPT-4 and GPT-3.5",
    description:
      "Count tokens with cl100k_base, the encoding of GPT-4, GPT-3.5-turbo and OpenAI's text-embedding models. See token ids and splits. Runs in your browser.",
  },
  {
    kind: "encoding",
    slug: "p50k_base",
    option: "p50k_base",
    name: "p50k_base",
    title: "p50k_base Tokenizer: Token Counter for text-davinci-003 and Codex",
    description:
      "Count tokens with p50k_base, the encoding of text-davinci-002/003 and the Codex code-davinci models. See token ids and splits. Runs in your browser.",
  },
  {
    kind: "encoding",
    slug: "r50k_base",
    option: "r50k_base",
    name: "r50k_base",
    title: "r50k_base (GPT-3) Tokenizer: Online Token Counter",
    description:
      "Count tokens with r50k_base, the original GPT-3 encoding of davinci, curie, babbage and ada. See token ids and splits. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "gpt-5",
    option: "gpt-5",
    name: "GPT-5",
    title: "GPT-5 Tokenizer and Token Counter (o200k_base)",
    description:
      "Count GPT-5 tokens online. GPT-5 uses the o200k_base encoding in OpenAI's tiktoken. See token ids, splits and counts. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "gpt-4-1",
    option: "gpt-4.1",
    name: "GPT-4.1",
    title: "GPT-4.1 Tokenizer and Token Counter (o200k_base)",
    description:
      "Count GPT-4.1 tokens online. GPT-4.1 uses the o200k_base encoding in OpenAI's tiktoken. See token ids, splits and counts. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "gpt-4o",
    option: "gpt-4o",
    name: "GPT-4o",
    title: "GPT-4o Tokenizer and Token Counter (o200k_base)",
    description:
      "Count GPT-4o tokens online. GPT-4o uses the o200k_base encoding in OpenAI's tiktoken. See token ids, splits and counts. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "gpt-4",
    option: "gpt-4",
    name: "GPT-4",
    title: "GPT-4 Tokenizer and Token Counter (cl100k_base)",
    description:
      "Count GPT-4 tokens online. GPT-4 uses the cl100k_base encoding in OpenAI's tiktoken. See token ids, splits and counts. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "gpt-3-5-turbo",
    option: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    title: "GPT-3.5 Turbo Tokenizer and Token Counter (cl100k_base)",
    description:
      "Count GPT-3.5 Turbo tokens online. It uses the cl100k_base encoding in OpenAI's tiktoken. See token ids, splits and counts. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "o3",
    option: "o3",
    name: "OpenAI o3",
    title: "OpenAI o3 Tokenizer and Token Counter (o200k_base)",
    description:
      "Count o3 tokens online. OpenAI's o1, o3 and o4-mini use the o200k_base encoding in tiktoken. See token ids, splits and counts. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "deepseek-r1",
    option: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek-R1",
    title: "DeepSeek-R1 Tokenizer and Token Counter (Online)",
    description:
      "Count DeepSeek-R1 tokens online with the official tokenizer.json of deepseek-ai/DeepSeek-R1 (MIT). See token ids and splits. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "qwen3",
    option: "Qwen/Qwen3-8B",
    name: "Qwen3",
    title: "Qwen3 Tokenizer and Token Counter (Online)",
    description:
      "Count Qwen3 tokens online with the official tokenizer.json of Qwen/Qwen3-8B (Apache-2.0). See token ids and splits. Runs in your browser.",
  },
  {
    kind: "model",
    slug: "glm-4-5",
    option: "zai-org/GLM-4.5",
    name: "GLM-4.5",
    title: "GLM-4.5 Tokenizer and Token Counter (Online)",
    description:
      "Count GLM-4.5 tokens online with the official tokenizer.json of zai-org/GLM-4.5 (MIT). See token ids and splits. Runs in your browser.",
  },
];

export const pagePath = (e: LandingEntry) => `/${e.kind}/${e.slug}`;

export function findPage(
  kind: PageKind,
  slug: string
): LandingEntry | undefined {
  return LANDING_PAGES.find((e) => e.kind === kind && e.slug === slug);
}
