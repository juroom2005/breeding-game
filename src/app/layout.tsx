import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "브리딩 게임 (가제)",
  description: "인간, 엘프, 인어를 교배하며 혈통을 키우는 브리딩 게임",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
