import React from "react";
import { Header } from "./components/landing/Header";
import { Hero } from "./components/landing/Hero";
import { GitVisualDAG } from "./components/landing/GitVisualDAG";
import { FeatureGrid } from "./components/landing/FeatureGrid";
import { McpIntegration } from "./components/landing/McpIntegration";
import { CodeExport } from "./components/landing/CodeExport";
import { Footer } from "./components/landing/Footer";

export default function Home() {
  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col selection:bg-vitra-cyan/20 selection:text-vitra-cyan">
      <Header />
      <main className="flex-1">
        <Hero />
        <GitVisualDAG />
        <FeatureGrid />
        <McpIntegration />
        <CodeExport />
      </main>
      <Footer />
    </div>
  );
}
