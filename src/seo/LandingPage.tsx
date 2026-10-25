import Link from "next/link";
import { useState } from "react";
import type { AllOptions } from "~/models";
import { TokenizerApp } from "~/sections/TokenizerApp";
import { buildContent } from "./content";
import type { PageFacts } from "./facts";
import { Layout } from "./Layout";
import { LANDING_PAGES, type PageKind, findPage, pagePath } from "./pages";

export interface LandingProps {
  kind: PageKind;
  slug: string;
  facts: PageFacts;
}

export function LandingPage(props: LandingProps) {
  // Dynamic routes reuse the component between slugs; key resets the tokenizer state.
  return <LandingBody key={`${props.kind}/${props.slug}`} {...props} />;
}

function LandingBody({ kind, slug, facts }: LandingProps) {
  const entry = findPage(kind, slug);
  if (!entry) throw new Error(`Unknown landing page ${kind}/${slug}`);
  const content = buildContent(entry, facts);
  const [model, setModel] = useState<AllOptions>(entry.option);

  // Encoding pages link to the models that use them, model pages to their encoding.
  const related = LANDING_PAGES.filter((e) =>
    kind === "encoding"
      ? e.kind === "model" && facts.models?.includes(e.option)
      : e.kind === "encoding" && e.slug === facts.encoding
  );

  return (
    <Layout
      title={entry.title}
      description={entry.description}
      path={pagePath(entry)}
    >
      <TokenizerApp
        heading={content.heading}
        model={model}
        onModelChange={setModel}
      />

      <article className="mt-6 flex max-w-3xl flex-col gap-4">
        {content.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}

        <h2 className="mt-2 text-2xl font-bold">
          Token counts for sample texts
        </h2>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4">Text</th>
              <th className="py-2 pr-4">Sample</th>
              <th className="py-2 text-right">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {facts.samples.map((s) => (
              <tr key={s.label} className="border-b align-top">
                <td className="py-2 pr-4">{s.label}</td>
                <td className="whitespace-pre-wrap py-2 pr-4 font-mono">
                  {s.text}
                </td>
                <td className="py-2 text-right">{s.tokens}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-2 text-2xl font-bold">FAQ</h2>
        {content.faq.map((item) => (
          <section key={item.q} className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">{item.q}</h3>
            <p>{item.a}</p>
            {item.code && (
              <pre className="overflow-x-auto rounded-md border bg-slate-50 p-3 text-sm">
                <code>{item.code}</code>
              </pre>
            )}
          </section>
        ))}

        {related.length > 0 && (
          <>
            <h2 className="mt-2 text-2xl font-bold">Related tokenizers</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {related.map((e) => (
                <li key={pagePath(e)}>
                  <Link className="underline" href={pagePath(e)}>
                    {e.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </Layout>
  );
}
