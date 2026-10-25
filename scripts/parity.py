"""Generate reference token ids from the Python tokenizers for the parity test.

  python scripts/parity.py --out /tmp/parity --src DIR [DIR ...]

Needs `pip install tiktoken tokenizers`. Run `yarn tokenizers` first so that
public/hf holds the pinned tokenizer files. Writes corpus.json (texts) and
expected.json (ids per encoding or model) and openai-models.json (official tiktoken
model-name tables); then run

  PARITY_DIR=/tmp/parity yarn test src/models

The corpus is sampled from the given source directories and is deliberately not
committed; any multilingual text and code works.
"""

import argparse
import json
import random
from pathlib import Path

import tiktoken
from tokenizers import Tokenizer

ROOT = Path(__file__).resolve().parent.parent
SUFFIXES = {".md", ".mdx", ".ts", ".tsx", ".py", ".json", ".txt"}
TIKTOKEN_ENCODINGS = ["o200k_base", "cl100k_base"]

EDGE_CASES = [
    "", " ", "\n", "\n\n\n", "\t", "a", "Hello world", "  leading and trailing  ",
    "line1\r\nline2\r\n", "\x00\x01\x02", "你好，世界！", "，。！？、；：“”‘’（）【】",
    "こんにちは世界", "안녕하세요 세계", "مرحبا بالعالم", "สวัสดีชาวโลก", "Привет, мир",
    "👩‍👦‍👦 👩‍👧‍👦 🇨🇿 🧑🏾‍💻️ 🧑🏿‍🎓️", "é e\u0301 ñ n\u0303", "a" * 5000, "你" * 3000,
    "<|endoftext|>", "<|im_start|>user\nhi<|im_end|>", "<s> </s> <unk>",
    "<｜begin▁of▁sentence｜>hi<｜end▁of▁sentence｜>", "1234567890" * 100,
    "def f(x):\n    return x ** 2\n", "SELECT * FROM t WHERE a = 'b';",
]


def build_corpus(src_dirs, seed, count):
    paragraphs = []
    for src in src_dirs:
        for path in sorted(Path(src).rglob("*")):
            if path.suffix not in SUFFIXES or "node_modules" in path.parts or not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for block in text.split("\n\n"):
                block = block.strip()
                if 1 <= len(block) <= 4000:
                    paragraphs.append(block)
    random.Random(seed).shuffle(paragraphs)
    texts = EDGE_CASES + paragraphs[:count]
    # One long CJK document for the large-input case.
    cjk = "".join(p for p in paragraphs if any("\u4e00" <= c <= "\u9fff" for c in p))
    return texts, cjk[:20000]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--src", nargs="+", required=True)
    ap.add_argument("--seed", type=int, default=20261025)
    ap.add_argument("--count", type=int, default=1200)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    texts, long_cjk = build_corpus(args.src, args.seed, args.count)
    texts.append(long_cjk)

    manifest = json.loads((ROOT / "tokenizers.json").read_text())
    expected = {}
    for name in TIKTOKEN_ENCODINGS:
        enc = tiktoken.get_encoding(name)
        expected[name] = [enc.encode(t, allowed_special="all") for t in texts]
    for model in manifest["models"]:
        tok = Tokenizer.from_file(str(ROOT / "public" / "hf" / model["repo"] / "tokenizer.json"))
        expected[model["repo"]] = [tok.encode(t).ids for t in texts]

    # Official model-name tables, used by src/models/openai-models.test.ts.
    from tiktoken import model as tk_model

    (out / "openai-models.json").write_text(
        json.dumps(
            {
                "tiktoken": tiktoken.__version__,
                "exact": tk_model.MODEL_TO_ENCODING,
                "prefix": tk_model.MODEL_PREFIX_TO_ENCODING,
            }
        )
    )
    (out / "corpus.json").write_text(json.dumps(texts, ensure_ascii=False))
    (out / "expected.json").write_text(json.dumps(expected))
    print(f"texts={len(texts)} (long CJK chars={len(long_cjk)}) targets={list(expected)}")
    print(f"tiktoken={tiktoken.__version__}")


if __name__ == "__main__":
    main()
