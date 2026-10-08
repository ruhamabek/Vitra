import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { GitVisualDAG } from './components/GitVisualDAG';
import { FeatureGrid } from './components/FeatureGrid';
import { McpIntegration } from './components/McpIntegration';
import { CodeExport } from './components/CodeExport';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#08090a] text-[#f7f8f8] flex flex-col selection:bg-[#00f0ff]/20 selection:text-[#00f0ff]">
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
};

export default App;
