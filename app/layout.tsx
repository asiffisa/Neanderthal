import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neanderthal — Streaming Inline Media in AI Markdown",
  description: "An experimental multimodal markdown harness for AI prose with inline visual capsules and Wikipedia media resolution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen bg-[#0a0b0d] text-[#ededed] antialiased selection:bg-amber-500/20 selection:text-amber-300"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
