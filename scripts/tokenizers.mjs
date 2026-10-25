// Pin and fetch open-source tokenizer files from Hugging Face without any API key.
//
//   node scripts/tokenizers.mjs pin <repo> [<repo> ...]   add or refresh entries in tokenizers.json
//   node scripts/tokenizers.mjs fetch                     download pinned files into public/hf and verify sha256
//
// Only public, ungated repos with a permissive license are accepted. Every file is
// verified against the manifest before it is written, so a tampered or drifted
// upstream fails the build instead of silently changing token counts.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = resolve(ROOT, "tokenizers.json");
const OUT_DIR = resolve(ROOT, process.env.TOKENIZER_OUT_DIR ?? "public/hf");

const FILES = ["tokenizer.json", "tokenizer_config.json"];
const ALLOWED_LICENSES = new Set(["mit", "apache-2.0"]);
const REPO_RE = /^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.-]*$/;
const REV_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const MAX_BYTES = 25 * 1024 * 1024; // Workers static assets reject files above 25 MiB.
const TIMEOUT_MS = 120_000;
const ATTEMPTS = 3;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function getBufferOnce(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.retryable = res.status >= 500 || res.status === 429;
    throw err;
  }
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error(`file too large (${declared} bytes): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`file too large (${buf.length} bytes): ${url}`);
  return buf;
}

// Network failures and 5xx/429 are retried; size and hash violations are not.
async function getBuffer(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getBufferOnce(url);
    } catch (err) {
      const transient = err.retryable === true || err.name === "TimeoutError" || err.name === "TypeError";
      if (!transient || attempt >= ATTEMPTS) throw err;
      console.warn(`retry ${attempt}/${ATTEMPTS - 1} ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const fileUrl = (repo, revision, file) =>
  `https://huggingface.co/${repo}/resolve/${revision}/${file}`;

async function readManifest({ allowMissing = false } = {}) {
  let text;
  try {
    text = await fs.readFile(MANIFEST, "utf8");
  } catch (err) {
    if (allowMissing && err.code === "ENOENT") return { schema: 1, models: [] };
    throw err;
  }
  const raw = JSON.parse(text);
  if (raw.schema !== 1 || !Array.isArray(raw.models)) fail("unsupported manifest schema");
  for (const m of raw.models) {
    if (!REPO_RE.test(m.repo)) fail(`invalid repo in manifest: ${m.repo}`);
    if (!REV_RE.test(m.revision)) fail(`invalid revision for ${m.repo}`);
    if (!ALLOWED_LICENSES.has(m.license)) fail(`license not allowed for ${m.repo}: ${m.license}`);
    for (const file of FILES) {
      const entry = m.files?.[file];
      if (!entry || !SHA256_RE.test(entry.sha256)) fail(`missing or invalid hash for ${m.repo}/${file}`);
    }
  }
  return raw;
}

async function pin(repos) {
  if (repos.length === 0) fail("usage: pin <repo> [<repo> ...]");
  const manifest = await readManifest({ allowMissing: true });
  for (const repo of repos) {
    if (!REPO_RE.test(repo)) fail(`invalid repo: ${repo}`);
    const res = await fetch(`https://huggingface.co/api/models/${repo}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) fail(`cannot read ${repo} from the Hugging Face API (HTTP ${res.status})`);
    const meta = await res.json();
    if (!REV_RE.test(meta.sha ?? "")) fail(`cannot resolve revision for ${repo}`);
    if (meta.gated) fail(`${repo} is gated; excluded from the vendored tier`);
    const license = (meta.tags ?? []).find((t) => t.startsWith("license:"))?.slice(8) ?? "unknown";
    if (!ALLOWED_LICENSES.has(license)) fail(`${repo} has license "${license}"; only ${[...ALLOWED_LICENSES].join(", ")} are vendored`);

    const files = {};
    for (const file of FILES) {
      const buf = await getBuffer(fileUrl(repo, meta.sha, file));
      files[file] = { sha256: sha256(buf), bytes: buf.length };
    }
    const entry = { repo, revision: meta.sha, license, files };
    const i = manifest.models.findIndex((m) => m.repo === repo);
    if (i >= 0) manifest.models[i] = { ...manifest.models[i], ...entry };
    else manifest.models.push(entry);
    console.log(`pinned ${repo} @ ${meta.sha.slice(0, 12)} license=${license}`);
  }
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

async function hasValidFile(target, expected) {
  try {
    return sha256(await fs.readFile(target)) === expected;
  } catch {
    return false;
  }
}

async function fetchAll() {
  const manifest = await readManifest();
  let failures = 0;
  for (const m of manifest.models) {
    for (const file of FILES) {
      const target = resolve(OUT_DIR, m.repo, file);
      if (!target.startsWith(OUT_DIR + sep)) fail(`path escapes output dir: ${target}`);
      const expected = m.files[file].sha256;
      if (await hasValidFile(target, expected)) {
        console.log(`ok   ${m.repo}/${file} (cached)`);
        continue;
      }
      try {
        const buf = await getBuffer(fileUrl(m.repo, m.revision, file));
        const actual = sha256(buf);
        if (actual !== expected) {
          throw new Error(`sha256 mismatch (expected ${expected.slice(0, 12)}, got ${actual.slice(0, 12)})`);
        }
        await fs.mkdir(dirname(target), { recursive: true });
        const tmp = `${target}.tmp`;
        await fs.writeFile(tmp, buf);
        await fs.rename(tmp, target);
        console.log(`ok   ${m.repo}/${file} (${buf.length} bytes)`);
      } catch (err) {
        failures += 1;
        console.error(`FAIL ${m.repo}/${file}: ${err.message}`);
      }
    }
  }
  if (failures > 0) fail(`${failures} file(s) failed verification`);
}

const [command, ...args] = process.argv.slice(2);
if (command === "pin") await pin(args);
else if (command === "fetch") await fetchAll();
else fail("usage: tokenizers.mjs <pin|fetch>");
