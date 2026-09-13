import type { Metadata } from "next";
import "./globals.css";
import SlideshowProvider from "@/components/SlideshowProvider";

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
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#faf9f7] text-[#1a1a1a]">
        <SlideshowProvider>
          {children}
        </SlideshowProvider>
      </body>
    </html>
  );
}
