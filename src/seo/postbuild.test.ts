import { describe, expect, it } from "vitest";
import {
  checkPages,
  internalLinks,
  readMeta,
  routeOf,
  sitemapXml,
  // eslint-disable-next-line import/extensions
} from "../../scripts/seo-postbuild.mjs";

const page = (
  route: string,
  title: string,
  description: string,
  body = ""
) => ({
  route,
  html: `<html><head><title>${title}</title><meta name="description" content="${description}"/><link rel="canonical" href="https://tiktokenizer.chatgptcn.com${route}"/></head><body>${body}</body></html>`,
});

describe("seo-postbuild", () => {
  it("maps files to routes", () => {
    expect(routeOf("index.html")).toBe("/");
    expect(routeOf("model/gpt-5.html")).toBe("/model/gpt-5");
  });

  it("reads meta tags and internal links", () => {
    const p = page(
      "/x",
      "A &amp; B",
      "d",
      '<a href="/model/gpt-5">m</a><a href="https://e.com">e</a>'
    );
    expect(readMeta(p.html)).toMatchObject({
      title: "A & B",
      description: "d",
    });
    expect(internalLinks(p.html)).toEqual(["/model/gpt-5"]);
  });

  it("accepts a consistent site", () => {
    const pages = [
      page("/", "T1", "D1", '<a href="/model/a">a</a>'),
      page("/model/a", "T2", "D2"),
    ];
    expect(
      checkPages(pages, (r: string) => ["/", "/model/a"].includes(r))
    ).toEqual([]);
  });

  it("rejects duplicates, bad canonicals and broken links", () => {
    const pages = [
      page("/", "T", "D", '<a href="/gone">x</a>'),
      page("/model/a", "T", "D"),
      {
        route: "/model/b",
        html: "<html><head><title>T3</title></head></html>",
      },
    ];
    const errors = checkPages(
      pages,
      (r: string) => r === "/" || r.startsWith("/model/")
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        "/: broken internal link /gone",
        "/model/a: title duplicates /",
        "/model/a: description duplicates /",
        "/model/b: missing description",
        "/model/b: canonical is missing, expected https://tiktokenizer.chatgptcn.com/model/b",
      ])
    );
  });

  it("writes one url per route", () => {
    const xml = sitemapXml(["/", "/model/a"]);
    expect(xml).toContain("<loc>https://tiktokenizer.chatgptcn.com/</loc>");
    expect(xml).toContain(
      "<loc>https://tiktokenizer.chatgptcn.com/model/a</loc>"
    );
  });
});
