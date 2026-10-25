// Runs after `next export`: writes out/sitemap.xml and fails the build when a page has a missing
// or duplicate title/description, a missing canonical, or an internal link without a target file.
//
//   node scripts/seo-postbuild.mjs [outDir]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_URL = "https://tiktokenizer.chatgptcn.com";

/** @param {string} dir @returns {string[]} */
function listHtml(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "_next" && entry.name !== "hf")
        files.push(...listHtml(full));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files.sort();
}

/**
 * "index.html" -> "/", "model/gpt-5.html" -> "/model/gpt-5".
 * @param {string} relFile
 */
export function routeOf(relFile) {
  const route =
    "/" +
    relFile
      .split(sep)
      .join("/")
      .replace(/\.html$/, "");
  return route === "/index" ? "/" : route;
}

/** @param {string} s */
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");

/** @param {string} html */
export function readMeta(html) {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  const description = /<meta name="description" content="([^"]*)"/.exec(
    html
  )?.[1];
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  return {
    title: title && decode(title),
    description: description && decode(description),
    canonical,
  };
}

/** @param {string} html @returns {string[]} */
export function internalLinks(html) {
  const links = new Set();
  for (const m of html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)) links.add(m[1]);
  return [...links];
}

/** @param {string[]} routes */
export function sitemapXml(routes) {
  const urls = routes
    .map((r) => `  <url><loc>${SITE_URL}${r}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * @param {{ route: string, html: string }[]} pages
 * @param {(route: string) => boolean} routeExists
 * @returns {string[]}
 */
export function checkPages(pages, routeExists) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Record<"title" | "description", Map<string, string>>} */
  const seen = { title: new Map(), description: new Map() };
  for (const { route, html } of pages) {
    const meta = readMeta(html);
    for (const field of /** @type {const} */ (["title", "description"])) {
      const value = meta[field];
      if (!value) {
        errors.push(`${route}: missing ${field}`);
      } else if (seen[field].has(value)) {
        errors.push(`${route}: ${field} duplicates ${seen[field].get(value)}`);
      } else {
        seen[field].set(value, route);
      }
    }
    const expected = `${SITE_URL}${route}`;
    if (meta.canonical !== expected) {
      errors.push(
        `${route}: canonical is ${
          meta.canonical ?? "missing"
        }, expected ${expected}`
      );
    }
    for (const link of internalLinks(html)) {
      const target =
        link.length > 1 && link.endsWith("/") ? link.slice(0, -1) : link;
      if (!routeExists(target))
        errors.push(`${route}: broken internal link ${link}`);
    }
  }
  return errors;
}

function main() {
  const out = resolve(process.argv[2] ?? "out");
  const files = listHtml(out).filter((f) => relative(out, f) !== "404.html");
  const pages = files.map((f) => ({
    route: routeOf(relative(out, f)),
    html: readFileSync(f, "utf8"),
  }));
  const routes = new Set(pages.map((p) => p.route));
  /** @param {string} route */
  const exists = (route) =>
    routes.has(route) ||
    existsSync(join(out, route.slice(1))) ||
    existsSync(join(out, `${route.slice(1)}.html`));

  const errors = checkPages(pages, exists);
  if (errors.length > 0) {
    console.error(errors.map((e) => `seo-postbuild: ${e}`).join("\n"));
    process.exit(1);
  }
  writeFileSync(
    join(out, "sitemap.xml"),
    sitemapXml(pages.map((p) => p.route))
  );
  console.log(
    `seo-postbuild: ${pages.length} pages checked, sitemap.xml written`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
