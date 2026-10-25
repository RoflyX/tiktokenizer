import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { openSourceModels } from "./index";

interface ManifestModel {
  repo: string;
  license: string;
}

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, "../../tokenizers.json"), "utf8")
) as { models: ManifestModel[] };

it("openSourceModels matches the pinned tokenizer manifest", () => {
  const pinned = manifest.models.map((m) => m.repo).sort();
  expect([...openSourceModels.options].sort()).toEqual(pinned);
});

it("every pinned tokenizer has a permissive license", () => {
  for (const m of manifest.models) {
    expect(["mit", "apache-2.0"]).toContain(m.license);
  }
});
