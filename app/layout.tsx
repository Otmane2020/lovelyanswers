import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoPilot Geo — AI Visibility Platform | Rank in ChatGPT & AI Search",
  description:
    "Track how your brand ranks in ChatGPT, Perplexity & AI search engines. Get cited by AI with AEO, GEO & auto-published SEO content.",
  keywords:
    "AEO, Answer Engine Optimization, AI SEO, ChatGPT ranking, how to appear in ChatGPT answers, AI visibility platform, generative engine optimization, GEO",
  authors: [{ name: "AutoPilot Geo" }],
  robots: "index, follow",
  alternates: { canonical: "https://autopilotgeo.com/" },
  openGraph: {
    type: "website",
    url: "https://autopilotgeo.com/",
    siteName: "AutoPilot Geo",
    locale: "en_US",
    images: [
      {
        url: "https://storage.googleapis.com/gpt-engineer-file-uploads/fGySWTwSk4eT1cMtKaBINQEVdJi2/social-images/social-1772803388903-ChatGPT_Image_Mar_6,_2026,_12_58_22_PM.webp",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@AutoPilotGeo",
    creator: "@AutoPilotGeo",
    images: [
      "https://storage.googleapis.com/gpt-engineer-file-uploads/fGySWTwSk4eT1cMtKaBINQEVdJi2/social-images/social-1772803388903-ChatGPT_Image_Mar_6,_2026,_12_58_22_PM.webp",
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Microsoft Clarity — replace YOUR_CLARITY_PROJECT_ID */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "YOUR_CLARITY_PROJECT_ID");`,
          }}
        />

        {/* Site-wide JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AutoPilot Geo",
              url: "https://autopilotgeo.com",
              logo: "https://autopilotgeo.com/favicon.png",
              sameAs: ["https://twitter.com/AutoPilotGeo"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                availableLanguage: ["English", "French"],
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "AutoPilot Geo",
              url: "https://autopilotgeo.com",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "29", priceCurrency: "USD", priceValidUntil: "2027-12-31" },
              aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "527", bestRating: "5" },
            }),
          }}
        />
      </head>
      <body>
        {/* Google Tag Manager noscript */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WJLJ8HFJ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <Providers>{children}</Providers>

        {/* Google Tag Manager */}
        <Script id="gtm" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WJLJ8HFJ');`}
        </Script>

        {/* GA4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SBKYQQZ3F7"
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-SBKYQQZ3F7');
gtag('config', 'AW-1880571409');
gtag('config', 'AW-17956394555');`}
        </Script>

        {/* Tapfiliate */}
        <Script src="https://script.tapfiliate.com/tapfiliate.js" strategy="afterInteractive" />
        <Script id="tapfiliate" strategy="afterInteractive">
          {`(function(t,a,p){t.TapfiliateObject=a;t[a]=t[a]||function(){
(t[a].q=t[a].q||[]).push(arguments)}})(window,'tap');
tap('create', '63120-bfe9c3', { integration: "stripe" });
tap('detect');`}
        </Script>
      </body>
    </html>
  );
}
