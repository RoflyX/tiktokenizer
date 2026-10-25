// Build-time helpers for the landing pages' getStaticPaths / getStaticProps.
import type { GetStaticPaths, GetStaticProps } from "next";
import { computeFacts } from "./facts";
import type { LandingProps } from "./LandingPage";
import { LANDING_PAGES, type PageKind, findPage } from "./pages";

export const landingPaths =
  (kind: PageKind): GetStaticPaths =>
  () => ({
    paths: LANDING_PAGES.filter((e) => e.kind === kind).map((e) => ({
      params: { slug: e.slug },
    })),
    fallback: false,
  });

export const landingProps =
  (kind: PageKind): GetStaticProps<LandingProps, { slug: string }> =>
  ({ params }) => {
    const entry = params ? findPage(kind, params.slug) : undefined;
    if (!entry) return { notFound: true };
    return { props: { kind, slug: entry.slug, facts: computeFacts(entry) } };
  };
