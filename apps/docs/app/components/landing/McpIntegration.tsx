"use client";
import React from 'react';
import { Bot, Check } from 'lucide-react';

export const McpIntegration: React.FC = () => {
  const capabilities = [
    { title: 'Screen Construction', desc: 'Creates complete, responsive screen layouts based on high-level prompts.' },
    { title: 'Design System Auditing', desc: 'Validates color contrast and accessibility rules headlessly before saving.' },
    { title: 'Interactive Styling', desc: 'Adjusts padding, typography ramps, and border radii with pixel precision.' },
    { title: 'Code Synthesis', desc: 'Outputs ready-to-run React and Tailwind v4 components instantly.' },
    { title: 'Revision Snapshotting', desc: 'Saves design versions safely without overwriting your main screens.' },
    { title: 'Visual Diff Inspection', desc: 'Compares before-and-after states to ensure nothing broke.' },
  ];

  return (
    <section id="agents" className="py-24 border-t border-border bg-background">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
           <div className="lg:col-span-5">
            <div className="text-xs font-mono font-medium text-vitra-cyan uppercase tracking-wider mb-2">
              Autonomous AI Tools
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-foreground mb-6">
              AI Agents with True Design Understanding
            </h2>
            <p className="text-muted-foreground text-[16px] leading-relaxed mb-6">
              Most AI tools write code by looking at screenshots and guessing pixel values. Vitra provides AI models like Claude, Cursor, and ChatGPT with a direct runtime environment—allowing them to inspect, construct, and audit user interfaces with guaranteed precision.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-secondary-foreground">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero guesswork: AI operates on pure UI structures, not raster images</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary-foreground">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Automatic layout computation ensures every button and card aligns perfectly</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-secondary-foreground">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Safe sandboxing lets AI iterate on experimental versions without risk</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border font-mono text-xs text-muted-foreground">
              <div className="text-foreground mb-2 font-medium">Add to your AI agent or editor config:</div>
              <div className="bg-background p-3 rounded border border-border text-vitra-cyan">
                npx -y @vitra/mcp-server
              </div>
            </div>
          </div>

           <div className="lg:col-span-7 linear-card rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-vitra-cyan" />
                <span className="text-xs font-mono text-foreground">AGENT CAPABILITIES</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Model Context Protocol Ready</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {capabilities.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-secondary/60 border border-border hover:border-vitra-cyan/40 transition-colors"
                >
                  <div className="text-xs font-mono font-medium text-foreground mb-1">
                    {c.title}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{c.desc}</div>
                </div>
              ))}
            </div>

             <div className="mt-6 p-4 rounded-lg bg-background border border-border font-mono text-xs">
              <div className="text-muted-foreground mb-1">// What happens behind the scenes</div>
              <div className="text-emerald-400">
                You ask: &quot;Create a responsive pricing table with 3 tiers and verify accessibility.&quot;
              </div>
              <div className="text-secondary-foreground mt-1 pl-3 border-l border-border">
                1. Vitra generates the layout and spaces columns evenly.<br />
                2. Vitra tests all text colors against backgrounds (WCAG AAA check passed).<br />
                3. Vitra compiles the components into clean React + Tailwind code ready to copy.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
