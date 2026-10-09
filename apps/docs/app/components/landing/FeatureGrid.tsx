"use client";
import React from 'react';
import { Terminal, Cpu, Palette, CheckCircle, Sliders, Code2 } from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: Terminal,
      title: 'Headless Execution',
      category: 'RUNTIME ENVIRONMENT',
      description:
        'Run your design system anywhere—in CI pipelines, serverless functions, or your local terminal. Test, validate, and compute layouts without launching a heavy graphical editor.',
      spec: 'CLI & Server runtime',
      metric: 'Zero-browser execution',
    },
    {
      icon: Cpu,
      title: 'First-Class AI Programmability',
      category: 'AUTOMATION',
      description:
        'AI agents inspect and modify user interfaces through structured programming interfaces. Models reason about responsive structures with zero visual guesswork or noisy HTML scraping.',
      spec: 'MCP stdio & SSE',
      metric: 'Model Context Protocol',
    },
    {
      icon: Code2,
      title: 'Direct Code Synthesis',
      category: 'DEVELOPER EXPERIENCE',
      description:
        'Compile components straight into clean, production-ready React with modern utility classes or native Apple SwiftUI. Generated code looks like hand-written code, not machine clutter.',
      spec: 'Zero div soup',
      metric: 'React & SwiftUI targets',
    },
    {
      icon: CheckCircle,
      title: 'Automated Accessibility Auditing',
      category: 'QUALITY ASSURANCE',
      description:
        'Verify contrast ratios, minimum touch target dimensions, and typographical hierarchy continuously. Block inaccessible UI regressions before pull requests get merged.',
      spec: 'APCA & WCAG 2.1',
      metric: 'WCAG AAA verification',
    },
    {
      icon: Palette,
      title: 'Universal Design Tokens',
      category: 'DESIGN SYSTEMS',
      description:
        'Manage color palettes, spacing scales, and typography hierarchies as pure structured data. Any change instantly propagates across design previews and production CSS variables.',
      spec: 'W3C Community Group',
      metric: 'Single source of truth',
    },
    {
      icon: Sliders,
      title: 'Two-Way Editor Interoperability',
      category: 'ECOSYSTEM',
      description:
        'Connect seamlessly with existing design platforms like Figma and Penpot. Bring designs into your engineering pipeline without locking your team into a single proprietary canvas.',
      spec: 'Lossless bridge',
      metric: 'Bidirectional sync',
    },
  ];

  return (
    <section id="capabilities" className="py-24 border-t border-border bg-background">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="mb-16">
          <div className="text-xs font-mono font-medium text-vitra-cyan uppercase tracking-wider mb-2">
            Complete Ecosystem
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-foreground mb-4">
            Everything your UI pipeline needs
          </h2>
          <p className="max-w-2xl text-muted-foreground text-[16px]">
            Vitra provides the foundational runtime that connects designers, engineers, and AI agents into a single, unified development cycle.
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="linear-card rounded-xl p-6 flex flex-col justify-between hover:border-foreground/20 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border flex items-center justify-center text-vitra-cyan group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                      {feat.category}
                    </span>
                  </div>

                  <h3 className="text-[18px] font-medium text-foreground mb-2">{feat.title}</h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed mb-6">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-xs font-mono text-secondary-foreground">
                  <span className="text-muted-foreground">{feat.spec}</span>
                  <span className="text-vitra-cyan">{feat.metric}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
