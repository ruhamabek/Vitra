import type { Metadata } from "next";
import { RootProvider } from "@farming-labs/theme";
import docsConfig from "@/docs.config";
import "./global.css";

export const metadata: Metadata = {
  title: {
    default: "Vitra · The Universal Visual Runtime & Design Version Control Protocol",
    template: docsConfig.metadata?.titleTemplate ?? "%s",
  },
  description: docsConfig.metadata?.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
