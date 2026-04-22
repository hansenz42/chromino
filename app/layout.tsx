import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-chromino",
});

export const metadata: Metadata = {
  title: "Chromino",
  description: "一款支持 1–8 人游玩的彩色骨牌游戏，含 AI 对手和在线多人模式。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body
        className={`m-0 min-h-dvh bg-bg text-fg font-sans antialiased overscroll-none ${fredoka.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
