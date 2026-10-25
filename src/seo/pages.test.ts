import { describe, expect, it } from "vitest";
import { isValidOption } from "~/models";
import { buildContent } from "./content";
import type { PageFacts } from "./facts";
import { LANDING_PAGES, SITE_URL, pagePath } from "./pages";
// eslint-disable-next-line import/extensions
import { SITE_URL as SCRIPT_SITE_URL } from "../../scripts/seo-postbuild.mjs";

describe("landing page registry", () => {
  it("uses valid options and unique URLs", () => {
    for (const e of LANDING_PAGES)
      expect(isValidOption(e.option), e.slug).toBe(true);
    const paths = LANDING_PAGES.map(pagePath);
    expect(new Set(paths).size).toBe(paths.length);
    for (const e of LANDING_PAGES) expect(e.slug).toMatch(/^[a-z0-9_-]+$/);
  });

  it("has unique titles and descriptions within search-result length", () => {
    const titles = LANDING_PAGES.map((e) => e.title);
    const descriptions = LANDING_PAGES.map((e) => e.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const e of LANDING_PAGES) {
      expect(e.title.length, e.title).toBeLessThanOrEqual(70);
      expect(e.description.length, e.description).toBeLessThanOrEqual(160);
      expect(e.description.length, e.description).toBeGreaterThanOrEqual(90);
    }
  });

  it("keeps the post-build script in sync with the site URL", () => {
    expect(SCRIPT_SITE_URL).toBe(SITE_URL);
  });
});

describe("page content", () => {
  const samples = [{ label: "English", text: "hi", tokens: 1 }];
  const facts = (e: (typeof LANDING_PAGES)[number]): PageFacts =>
    e.kind === "encoding"
      ? { samples, vocabK: 200, models: ["gpt-4o", "gpt-oss-20b"] }
      : e.option.includes("/")
      ? {
          samples,
          source: { repo: e.option, revision: "a".repeat(40), license: "mit" },
        }
      : { samples, encoding: "o200k_base" };

  it("builds a heading, intro and FAQ with unique questions for every page", () => {
    for (const e of LANDING_PAGES) {
      const c = buildContent(e, facts(e));
      expect(c.heading).toContain(e.name);
      expect(c.intro.length).toBeGreaterThan(0);
      const questions = c.faq.map((f) => f.q);
      expect(new Set(questions).size).toBe(questions.length);
      expect(c.faq.length).toBeGreaterThanOrEqual(4);
    }
  });
});
