import type { Metadata } from "next";
import "./globals.css";
import SlideshowProvider from "@/components/SlideshowProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BackgroundMusicProvider } from "@/hooks/useBackgroundMusic";

export const metadata: Metadata = {
  title: "器 · 茶 | 中国茶具艺术展",
  description: "探索跨越千年的中国茶具艺术，从唐宋建盏到明清官窑，品味器物之美与茶道精神。Chinese Tea Ware Artistic Gallery - Explore historic Chinese teapots and tea bowls across dynasties.",
  keywords: ["中国茶具", "茶器", "建盏", "紫砂壶", "青花瓷", "Chinese tea ware", "teapot", "tea bowl"],
  authors: [{ name: "Chinese Tea Ware Gallery" }],
  openGraph: {
    title: "器 · 茶 | 中国茶具艺术展",
    description: "探索跨越千年的中国茶具艺术",
    type: "website",
    locale: "zh_CN",
  },
};

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
    </html>
  );
}
