import { type FormEvent, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ChatGPTEditor } from "./ChatGPTEditor";
import { EncoderSelect } from "~/sections/EncoderSelect";
import { TokenViewer } from "~/sections/TokenViewer";
import { TextArea } from "~/components/Input";
import { type AllOptions, isChatModel } from "~/models";
import { createTokenizer } from "~/models/tokenizer";
import { trackEvent } from "~/utils/gtag";

export function TokenizerApp(props: {
  heading: string;
  model: AllOptions;
  onModelChange: (model: AllOptions) => void;
}) {
  const { model } = props;
  const [inputText, setInputText] = useState<string>("");
  const tokenizer = useQuery({
    queryKey: [model],
    queryFn: ({ queryKey: [model] }) => createTokenizer(model!),
  });

  const tokens = tokenizer.data?.tokenize(inputText);

  // Reports the first edit of any editor textarea once per visit; the text itself is never read.
  const hasStartedTyping = useRef(false);
  const onInput = (e: FormEvent<HTMLElement>) => {
    if (
      hasStartedTyping.current ||
      (e.target as HTMLElement).tagName !== "TEXTAREA"
    )
      return;
    hasStartedTyping.current = true;
    trackEvent("start_typing", { model });
  };

  return (
    <div onInput={onInput} className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="text-4xl font-bold">{props.heading}</h1>

        <EncoderSelect
          value={model}
          isLoading={tokenizer.isFetching}
          onChange={(update) => {
            trackEvent("select_model", { model: update });
            props.onModelChange(update);
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
    </div>
  );
}
