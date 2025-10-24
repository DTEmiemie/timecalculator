import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "时间计算器",
  description: "便捷的时间段统计与积分计算工具。支持跨天、文本整理与自定义格式化输出。",
  keywords: ["时间计算器", "时间统计", "时间段", "积分计算", "跨天", "格式化"],
  authors: [{ name: "TimeCalculator" }],
  openGraph: {
    title: "时间计算器",
    description: "便捷的时间段统计与积分计算工具。",
    siteName: "时间计算器",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "时间计算器",
    description: "便捷的时间段统计与积分计算工具。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
