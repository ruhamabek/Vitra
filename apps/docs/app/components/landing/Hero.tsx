"use client";
import React, { useState } from 'react';
import { ArrowRight, Copy, Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const Hero: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'build' | 'ai' | 'inspect'>('build');
  const [copied, setCopied] = useState(false);

  const installCommand = 'curl -fsSL https://raw.githubusercontent.com/ruhamabek/Vitra/main/scripts/install.sh | bash';

  const copyCode = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="runtime" className="relative pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden hero-glow">
      <div className="max-w-[1436px] mx-auto px-6 flex flex-col items-center text-center">
         <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-foreground/5 border border-border text-[13px] text-secondary-foreground mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-vitra-cyan animate-pulse" />
          <span className="text-muted-foreground">Announcing Vitra Engine</span>
          <span className="text-border">|</span>
          <span className="font-medium text-foreground flex items-center gap-1">
            The Universal Visual Runtime <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          </span>
        </div>

         <h1 className="max-w-4xl text-5xl sm:text-6xl md:text-[72px] font-medium leading-[1.05] tracking-[-0.022em] text-foreground mb-6">
          The Visual Runtime For <br className="hidden sm:inline" />
          <span className="text-vitra-cyan">
            User Interfaces
          </span>
        </h1>

         <p className="max-w-2xl text-lg sm:text-[20px] text-muted-foreground font-normal leading-relaxed mb-10">
          A headless design engine for your team and AI agents. Create layouts, audit contrast, and sync components straight into your codebase.
        </p>

         <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <div className="flex items-center rounded-full bg-card border border-border p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.2),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2 px-4 py-1.5 font-mono text-[13px] text-secondary-foreground">
              <span className="text-muted-foreground">$</span>
              <span>vitra init my-design-system</span>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-muted hover:bg-accent text-foreground text-[12px] font-medium border border-border transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <Link
            href="/docs"
             rel="noreferrer"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground text-[13px] font-medium border border-border transition-all"
          >
            <span>Explore Documentation</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

         <div className="w-full max-w-4xl linear-card rounded-xl overflow-hidden text-left shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
           <div className="h-11 px-4 bg-secondary border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-1">
                <div className="w-3 h-3 rounded-full bg-muted hover:bg-red-500/60 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-muted hover:bg-amber-500/60 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-muted hover:bg-emerald-500/60 transition-colors" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">vitra-runtime: ~/design-system (main)</span>
            </div>

             <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setActiveTab('build')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  activeTab === 'build'
                    ? 'bg-border text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1. Headless Build
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  activeTab === 'ai'
                    ? 'bg-border text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2. AI Agent Control
              </button>
              <button
                onClick={() => setActiveTab('inspect')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  activeTab === 'inspect'
                    ? 'bg-border text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                3. Live Layout &amp; Audit
              </button>
            </div>
          </div>

           <div className="p-6 bg-background font-mono text-[13px] leading-relaxed overflow-x-auto min-h-[320px]">
            {activeTab === 'build' && (
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                  <span className="text-vitra-cyan font-semibold">$</span>
                  <span className="text-foreground">vitra build</span>
                  <span className="text-code-type">--target</span>
                  <span className="text-code-string">react,swiftui</span>
                </div>

                 <div className="pl-4 border-l-2 border-border space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-emerald-400">✓</span>
                    <span>Loaded design tokens (<span className="text-code-type">colors</span>, <span className="text-code-type">typography ramps</span>, <span className="text-code-type">radii</span>)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-emerald-400">✓</span>
                    <span>Evaluated <span className="text-code-number">12</span> artboards with cross-platform layout engine</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-emerald-400">✓</span>
                    <span>Generated <span className="text-code-type">React + Tailwind</span> components (<span className="text-vitra-cyan">zero div soup</span>)</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-emerald-400">✓</span>
                    <span>Generated native Apple <span className="text-code-type">SwiftUI Views</span> with dynamic type</span>
                  </div>
                </div>

                {/* Command 2 */}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-vitra-cyan font-semibold">$</span>
                  <span className="text-foreground">vitra audit</span>
                  <span className="text-code-type">--wcag</span>
                  <span className="text-code-string">AAA</span>
                </div>

                 <div className="pl-4 border-l-2 border-emerald-500/40 text-xs text-emerald-400 flex items-center gap-2 bg-emerald-500/5 py-1.5 rounded-r">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Audit passed: 48 components checked. All colors satisfy AAA 7:1 contrast ratios.</span>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-vitra-cyan">//</span>
                  <span>AI coding agents invoke Vitra tools via Model Context Protocol:</span>
                </div>

                 <div className="p-4 bg-card rounded-lg border border-border text-xs space-y-1">
                  <div>
                    <span className="text-code-keyword">agent</span>.<span className="text-code-type">call</span>(
                    <span className="text-code-string">"vitra:create_frame"</span>, &#123;
                  </div>
                  <div className="pl-4">
                    <span className="text-foreground">name</span>: <span className="text-code-string">"PricingCard"</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-foreground">layout</span>: &#123; <span className="text-foreground">direction</span>: <span className="text-code-string">"vertical"</span>, <span className="text-foreground">gap</span>: <span className="text-code-number">16</span>, <span className="text-foreground">padding</span>: <span className="text-code-number">24</span> &#125;,
                  </div>
                  <div className="pl-4">
                    <span className="text-foreground">theme</span>: <span className="text-code-string">"tokens/dark.json"</span>
                  </div>
                  <div>&#125;)</div>
                </div>

                 <div className="pl-4 border-l-2 border-border space-y-1 text-xs text-muted-foreground">
                  <div>→ <span className="text-code-type">Layout Engine</span>: Calculated node dimensions <span className="text-foreground">360px × 480px</span></div>
                  <div>→ <span className="text-emerald-400">WCAG Auditor</span>: Evaluated color contrast (AAA passed)</div>
                  <div>→ <span className="text-vitra-cyan">Version Control</span>: Saved snapshot to branch <code className="text-vitra-cyan bg-vitra-cyan/10 px-1.5 py-0.5 rounded">ai/pricing-card</code></div>
                </div>
              </div>
            )}

            {activeTab === 'inspect' && (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="text-vitra-cyan">//</span>
                  <span>Instant layout computation without opening a browser:</span>
                </div>

                 <div className="border border-border rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-12 bg-secondary p-2.5 text-muted-foreground border-b border-border">
                    <div className="col-span-4">Scene Node</div>
                    <div className="col-span-4">Computed Size</div>
                    <div className="col-span-4 text-vitra-cyan">Layout Constraints</div>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 border-b border-border text-secondary-foreground items-center">
                    <div className="col-span-4 text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      NavigationBar
                    </div>
                    <div className="col-span-4 font-mono text-code-type">1436px × 73px</div>
                    <div className="col-span-4 text-muted-foreground">flex-row · space-between</div>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 border-b border-border text-secondary-foreground items-center">
                    <div className="col-span-4 text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      PrimaryButton
                    </div>
                    <div className="col-span-4 font-mono text-code-type">118px × 32px</div>
                    <div className="col-span-4 text-vitra-cyan">radius: 9999px (pill)</div>
                  </div>

                  <div className="grid grid-cols-12 p-2.5 text-secondary-foreground items-center">
                    <div className="col-span-4 text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      PricingGrid
                    </div>
                    <div className="col-span-4 font-mono text-code-type">1436px × 480px</div>
                    <div className="col-span-4 text-muted-foreground">columns: 3 · auto-stretch</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Layout calculations run in sub-millisecond execution time directly on servers, in CI, or in your terminal.
                </div>
              </div>
            )}
          </div>
 
        </div>
      </div>
    </section>
  );
};
