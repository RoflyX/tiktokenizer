import { type NextPage } from "next";
import Head from "next/head";
import { type FormEvent, useMemo, useRef, useState } from "react";

import { ChatGPTEditor } from "../sections/ChatGPTEditor";
import { EncoderSelect } from "~/sections/EncoderSelect";
import { TokenViewer } from "~/sections/TokenViewer";
import { TextArea } from "~/components/Input";
import { type AllOptions, isChatModel, isValidOption } from "~/models";
import { createTokenizer } from "~/models/tokenizer";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { trackEvent } from "~/utils/gtag";

function useQueryParamsState() {
  const router = useRouter();

  const params = useMemo((): AllOptions => {
    return isValidOption(router.query?.model)
      ? router.query.model
      : "gpt-4o";
  }, [router.query]);

  const setParams = (model: AllOptions) => {
    router.push({
      pathname: router.pathname,
      query: { model },
    });
  };

  return [params, setParams] as const;
}

const Home: NextPage = () => {
  const [inputText, setInputText] = useState<string>("");
  const [model, setModel] = useQueryParamsState();
  const tokenizer = useQuery({
    queryKey: [model],
    queryFn: ({ queryKey: [model] }) => createTokenizer(model!),
  });

  const tokens = tokenizer.data?.tokenize(inputText);

  // Reports the first edit of any editor textarea once per visit; the text itself is never read.
  const hasStartedTyping = useRef(false);
  const onInput = (e: FormEvent<HTMLElement>) => {
    if (hasStartedTyping.current || (e.target as HTMLElement).tagName !== "TEXTAREA") return;
    hasStartedTyping.current = true;
    trackEvent("start_typing", { model });
  };

  return (
    <>
      <Head>
        <title>Tiktokenizer</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        onInput={onInput}
        className="mx-auto flex min-h-screen max-w-[1200px] flex-col gap-4 p-8"
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h1 className="text-4xl font-bold">Tiktokenizer</h1>

          <EncoderSelect
            value={model}
            isLoading={tokenizer.isFetching}
            onChange={(update) => {
              trackEvent("select_model", { model: update });
              setModel(update);
              if (isChatModel(update) !== isChatModel(model)) {
                setInputText("");
              }
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="flex flex-col gap-4">
            {isChatModel(model) && (
              <ChatGPTEditor model={model} onChange={setInputText} />
            )}

            <TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-[256px] rounded-md border p-4 font-mono shadow-sm"
            />
          </section>

          <section className="flex flex-col gap-4">
            <TokenViewer model={model} data={tokens} isFetching={false} />
          </section>
        </div>
        <footer className="flex items-center justify-between gap-4 text-sm text-slate-400 md:mt-6">
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
        </footer>
      </main>
    </>
  );
};

export default Home;
