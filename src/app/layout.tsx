import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SlideshowProvider from "@/components/SlideshowProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BackgroundMusicProvider } from "@/hooks/useBackgroundMusic";
import JsonLd from "@/components/JsonLd";
import { defaultMetadata, createCollectionPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = theme === 'dark' || 
                    (theme === 'system' || !theme) && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <JsonLd data={createCollectionPageJsonLd()} />
      </head>
      <body className="min-h-full flex flex-col bg-[#faf9f7] dark:bg-[#0f0f0e] text-[#1a1a1a] dark:text-[#e8e6e3] transition-colors">
        <ThemeProvider>
          <BackgroundMusicProvider>
            <SlideshowProvider>
              {children}
            </SlideshowProvider>
          </BackgroundMusicProvider>
        </ThemeProvider>
      </body>
      <Script
        src="https://gc.zgo.at/count.js"
        data-goatcounter="https://philren.goatcounter.com/count"
        strategy="afterInteractive"
      />
    </html>
  );
}
