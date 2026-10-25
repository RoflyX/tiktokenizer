import { type NextPage } from "next";
import { useRouter } from "next/router";
import { useMemo } from "react";

import { type AllOptions, isValidOption } from "~/models";
import { Layout } from "~/seo/Layout";
import { TokenizerApp } from "~/sections/TokenizerApp";

const TITLE = "Tiktokenizer: Online Token Counter for GPT, DeepSeek and Qwen";
const DESCRIPTION =
  "Free online tokenizer. Count tokens and see how text is split for GPT-5, GPT-4o, o3, DeepSeek-R1, Qwen3, GLM-4.5 and more. Runs in your browser; your text is never uploaded.";

function useQueryParamsState() {
  const router = useRouter();

  const params = useMemo((): AllOptions => {
    return isValidOption(router.query?.model) ? router.query.model : "gpt-4o";
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
  const [model, setModel] = useQueryParamsState();

  return (
    <Layout title={TITLE} description={DESCRIPTION} path="/">
      <TokenizerApp
        heading="Tiktokenizer"
        model={model}
        onModelChange={setModel}
      />
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Paste text to see how it is split into tokens by OpenAI encodings and by
        open-source models such as DeepSeek-R1, Qwen3 and GLM-4.5. Everything
        runs in your browser and your text is never uploaded.
      </p>
    </Layout>
  );
};

export default Home;
