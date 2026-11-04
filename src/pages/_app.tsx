import { type AppType } from "next/app";
import Script from "next/script";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "~/styles/globals.css";
import { ANALYTICS_ENABLED } from "~/utils/gtag";

// Read inline so that builds without an ID drop the whole analytics block.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const MyApp: AppType = ({ Component, pageProps }) => {
  const [queryClient] = useState(() => new QueryClient());
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  useEffect(() => {
    setAnalyticsEnabled(window.location.hostname === "tiktokenizer.chatgptcn.com");
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {GA_ID && ANALYTICS_ENABLED && analyticsEnabled && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}
      <Component {...pageProps} />
    </QueryClientProvider>
  );
};

export default MyApp;
