import type { PageFacts } from "./facts";
import type { LandingEntry } from "./pages";

export interface FaqItem {
  q: string;
  a: string;
  /** Optional code sample shown under the answer. */
  code?: string;
}

export interface PageContent {
  heading: string;
  intro: string[];
  faq: FaqItem[];
}

const PRIVACY: FaqItem = {
  q: "Is my text sent to a server?",
  a: "No. Tokenization runs in your browser and the text never leaves the page. For usage statistics the page only reports which tokenizer you pick and that you started typing, never the text itself.",
};

const USAGE_DIFFERENCE: FaqItem = {
  q: "Why can the count differ from the usage reported by an API?",
  a: "Chat requests wrap your text in special tokens and per-message formatting that this page does not show. For billing and limits, use the usage field in the API response as the authoritative number.",
};

const formatList = (items: string[]) => items.map((x) => `\`${x}\``).join(", ");

function encodingContent(entry: LandingEntry, facts: PageFacts): PageContent {
  const models = facts.models ?? [];
  const intro = [
    `${entry.name} is a byte-pair-encoding (BPE) tokenizer from OpenAI's open-source tiktoken library, with a vocabulary of about ${facts.vocabK}K tokens. Paste text above to see its token count, token ids and how the text is split.`,
    `In tiktoken's model name table these names resolve to ${
      entry.name
    }: ${formatList(models)}.`,
  ];
  if (models.some((m) => m.startsWith("gpt-oss-"))) {
    intro.push(
      "gpt-oss models officially use o200k_harmony. It produces the same token ids as o200k_base for ordinary text (checked on more than 1,000 sample texts); only special tokens such as <|start|> and <|channel|> differ."
    );
  }
  const faq: FaqItem[] = [
    {
      q: `What is ${entry.name}?`,
      a: `${entry.name} is one of the encodings shipped with OpenAI's tiktoken. It turns text into integer token ids; language models read and are billed by tokens, not characters.`,
    },
    {
      q: `Which models use ${entry.name}?`,
      a: `According to tiktoken's model name table: ${formatList(
        models
      )}. Choose any of them in the selector above to see the same encoding.`,
    },
  ];
  if (facts.mixed) {
    faq.push(
      {
        q: `How many tokens is a mixed Chinese-English sentence in ${entry.name}?`,
        a: `This reproducible sample is ${facts.mixed.text.length} characters and encodes to ${facts.mixed.tokens} tokens, counted at build time with the same tiktoken build this page runs. The count is a property of this exact string under ${entry.name} — paste it into the counter above to see the same number and how the text splits:`,
        code: `text = "${facts.mixed.text}"

# Python
import tiktoken
enc = tiktoken.get_encoding("${entry.name}")
print(len(enc.encode(text)))  # ${facts.mixed.tokens}`,
      },
      {
        q: "How do I choose the right encoding?",
        a: `Start from the model you call, not from the encoding: tiktoken's encoding_for_model() resolves the model name through the same table that maps ${formatList(
          models.slice(0, 4)
        )} and friends to ${entry.name}. If you do not know the exact model, tokenize with the encoding its API documents and treat the response's usage field as the billing truth:`,
        code: `# Python
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4")  # -> cl100k_base
print(enc.name)`,
      },
      {
        q: "What is the difference between text tokens and message overhead?",
        a: `This page counts plain-text BPE tokens for exactly the string you paste, with no chat formatting. A Chat API reports usage for the concrete request it received, with each message wrapped in the request's own formatting, so the two numbers describe different scopes rather than one being a correction of the other. To observe the gap, send this exact sample as a single user message to the same model you picked here and compare usage.prompt_tokens with the ${facts.mixed.tokens} shown above. The difference changes with request shape and model — an observation of that request, not a fixed per-message overhead.`,
      }
    );
  }
  return {
    heading: `${entry.name} Tokenizer`,
    intro,
    faq: [
      ...faq,
      {
        q: `How do I count ${entry.name} tokens in code?`,
        a: "With OpenAI's tiktoken, which has Python and JavaScript (WASM) builds:",
        code: `# Python
import tiktoken
enc = tiktoken.get_encoding("${entry.name}")
print(len(enc.encode(text)))

// JavaScript
import { get_encoding } from "tiktoken";
const enc = get_encoding("${entry.name}");
console.log(enc.encode(text).length);
enc.free();`,
      },
      PRIVACY,
      USAGE_DIFFERENCE,
    ],
  };
}

function openAiModelContent(
  entry: LandingEntry,
  facts: PageFacts
): PageContent {
  const encoding = facts.encoding;
  return {
    heading: `${entry.name} Tokenizer`,
    intro: [
      `${entry.name} uses the ${encoding} encoding in OpenAI's tiktoken. Paste text above to see its token count, token ids and how the text is split.`,
    ],
    faq: [
      {
        q: `Which tokenizer does ${entry.name} use?`,
        a: `${encoding}, according to the model name table in OpenAI's tiktoken. The encoding page lists the other models that share it.`,
      },
      {
        q: `How do I count ${entry.name} tokens in code?`,
        a: "With OpenAI's tiktoken. Use a recent release so that the model name is known:",
        code: `# Python
import tiktoken
enc = tiktoken.encoding_for_model("${entry.option}")
print(len(enc.encode(text)))

// JavaScript
import { encoding_for_model } from "tiktoken";
const enc = encoding_for_model("${entry.option}");
console.log(enc.encode(text).length);
enc.free();`,
      },
      PRIVACY,
      USAGE_DIFFERENCE,
    ],
  };
}

function openSourceContent(entry: LandingEntry, facts: PageFacts): PageContent {
  const src = facts.source;
  if (!src) throw new Error(`${entry.option} has no source facts`);
  const revision = src.revision.slice(0, 7);
  return {
    heading: `${entry.name} Tokenizer`,
    intro: [
      `This page runs the official tokenizer.json of ${src.repo} (revision ${revision}, ${src.license} license) in your browser with Hugging Face's tokenizers.js. Paste text above to see its token count, token ids and how the text is split.`,
    ],
    faq: [
      {
        q: `Where does the ${entry.name} tokenizer come from?`,
        a: `From the Hugging Face repository ${src.repo}, pinned to revision ${src.revision} and verified by SHA-256 at build time. The files are served from this site, not fetched from Hugging Face by your browser.`,
      },
      {
        q: `How do I count ${entry.name} tokens in Python?`,
        a: "With Hugging Face's tokenizers library. This page's token ids were compared with its output on more than 1,000 sample texts:",
        code: `from tokenizers import Tokenizer
tok = Tokenizer.from_pretrained("${src.repo}")
print(len(tok.encode(text).ids))`,
      },
      {
        q: "Is a chat template applied?",
        a: "No. The text is tokenized exactly as pasted: no chat template is applied and no begin-of-text token is added for this model. A real chat request adds template tokens around your text.",
      },
      PRIVACY,
    ],
  };
}

export function buildContent(
  entry: LandingEntry,
  facts: PageFacts
): PageContent {
  if (entry.kind === "encoding") return encodingContent(entry, facts);
  return facts.source
    ? openSourceContent(entry, facts)
    : openAiModelContent(entry, facts);
}
