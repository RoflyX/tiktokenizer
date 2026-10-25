import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";
import { LANDING_PAGES, SITE_URL, pagePath } from "./pages";

export function Layout(props: {
  title: string;
  description: string;
  /** Canonical path, e.g. "/" or "/model/gpt-5". */
  path: string;
  children: ReactNode;
}) {
  const canonical = `${SITE_URL}${props.path}`;
  return (
    <>
      <Head>
        <title>{props.title}</title>
        <meta name="description" content={props.description} />
        <link rel="canonical" href={canonical} />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tiktokenizer" />
        <meta property="og:title" content={props.title} />
        <meta property="og:description" content={props.description} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary" />
      </Head>
      <main className="mx-auto flex min-h-screen max-w-[1200px] flex-col gap-4 p-8">
        {props.children}
        <footer className="mt-6 flex flex-col gap-4 text-sm text-slate-400">
          <nav
            aria-label="Tokenizers"
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            <Link className="text-slate-800" href="/">
              Tiktokenizer
            </Link>
            {LANDING_PAGES.map((e) => (
              <Link
                key={pagePath(e)}
                className="text-slate-800"
                href={pagePath(e)}
              >
                {e.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-4">
            <p>
              基于{" "}
              <a
                target="_blank"
                rel="noreferrer"
                className="text-slate-800"
                href="https://github.com/dqbd/tiktokenizer"
              >
                dqbd/tiktokenizer
              </a>
              （MIT 许可）修改，独立部署，与原作者无隶属关系。
            </p>
            <nav className="flex items-center gap-4">
              <a className="text-slate-800" href="https://chatgptcn.com">
                ChatGPT 中文网
              </a>
              <a className="text-slate-800" href="https://doc.chatgptcn.com">
                OpenAI 中文文档
              </a>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
