import React, { useState } from 'react';
import { ArrowRight, Copy, Check, ShieldCheck } from 'lucide-react';

export const Hero: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cli' | 'mcp' | 'ast'>('cli');
  const [copied, setCopied] = useState(false);

  const installCommand = 'curl -fsSL https://raw.githubusercontent.com/ruhamabek/Vitra/main/scripts/install.sh | bash';

  const copyCode = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden hero-glow">
      <div className="max-w-[1436px] mx-auto px-6 flex flex-col items-center text-center">
         <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#ffffff08] border border-[#ffffff14] text-[13px] text-[#d0d6e0] mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
          <span className="text-[#8a8f98]">Announcing Vitra Engine</span>
          <span className="text-[#ffffff14]">|</span>
          <span className="font-medium text-[#f7f8f8] flex items-center gap-1">
            AGPL-3.0 Open Core Protocol <ArrowRight className="w-3.5 h-3.5 text-[#8a8f98]" />
          </span>
        </div>

         <h1 className="max-w-4xl text-5xl sm:text-6xl md:text-[72px] font-medium leading-[1.05] tracking-[-0.022em] text-[#f7f8f8] mb-6">
          The Universal Visual AST &amp; <br className="hidden sm:inline" />
          <span className="bg-gradient-to-b from-[#f7f8f8] via-[#d0d6e0] to-[#8a8f98] bg-clip-text text-[#00f0ff]">
            Git Runtime for Design
          </span>
        </h1>

         <p className="max-w-2xl text-lg sm:text-[20px] text-[#8a8f98] font-normal leading-relaxed mb-10">
          A headless design runtime built for AI agents and human teams. Native Git version control,
          deterministic Flexbox layout via Yoga, W3C tokens, and live visual 3-way AST merge.
        </p>

         <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <div className="flex items-center rounded-full bg-[#0f1011] border border-[#1c1d1e] p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.2),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2 px-4 py-1.5 font-mono text-[13px] text-[#d0d6e0]">
              <span className="text-[#8a8f98]">$</span>
              <span>vitra init my-design-system</span>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#161718] hover:bg-[#1f2022] text-[#f7f8f8] text-[12px] font-medium border border-[#ffffff14] transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8a8f98]" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <a
            href="https://github.com/ruhamabek/Vitra#quick-start"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#ffffff0d] hover:bg-[#ffffff14] text-[#f7f8f8] text-[13px] font-medium border border-[#ffffff14] transition-all"
          >
            <span>Read Architecture Docs</span>
            <ArrowRight className="w-4 h-4 text-[#8a8f98]" />
          </a>
        </div>

         <div className="w-full max-w-4xl linear-card rounded-[12px] overflow-hidden text-left shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
           <div className="h-11 px-4 bg-[#121315] border-b border-[#1c1d1e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ffffff14]" />
              <div className="w-3 h-3 rounded-full bg-[#ffffff14]" />
              <div className="w-3 h-3 rounded-full bg-[#ffffff14]" />
              <span className="ml-2 text-xs font-mono text-[#8a8f98]">workspace: ~/design-system (vitra:main)</span>
            </div>

             <div className="flex items-center gap-1 bg-[#08090a] p-0.5 rounded-lg border border-[#1c1d1e]">
              <button
                onClick={() => setActiveTab('cli')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  activeTab === 'cli'
                    ? 'bg-[#1c1d1e] text-[#f7f8f8]'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                vitra-cli
              </button>
              <button
                onClick={() => setActiveTab('mcp')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  activeTab === 'mcp'
                    ? 'bg-[#1c1d1e] text-[#f7f8f8]'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                mcp-agent
              </button>
              <button
                onClick={() => setActiveTab('ast')}
                className={`px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  activeTab === 'ast'
                    ? 'bg-[#1c1d1e] text-[#f7f8f8]'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                visual-ast
              </button>
            </div>
          </div>

           <div className="p-6 font-mono text-[13px] leading-relaxed overflow-x-auto min-h-[320px]">
            {activeTab === 'cli' && (
              <div className="space-y-4">
                <div className="text-[#8a8f98]">
                  <span className="text-[#00f0ff]">$</span> vitra init --preset mobile-ios
                </div>
                <div className="text-[#d0d6e0] pl-4 border-l border-[#1c1d1e]">
                  Initialized empty Vitra repository in .vitra/<br />
                  Created master artboard [Mobile/Viewport-390x844]<br />
                  Mounted Yoga Flexbox layout engine v3.1.0
                </div>

                <div className="text-[#8a8f98]">
                  <span className="text-[#00f0ff]">$</span> vitra branch feature/dark-tokens &amp;&amp; vitra checkout feature/dark-tokens
                </div>
                <div className="text-[#d0d6e0] pl-4 border-l border-[#1c1d1e]">
                  Switched to branch 'feature/dark-tokens'
                </div>

                <div className="text-[#8a8f98]">
                  <span className="text-[#00f0ff]">$</span> vitra audit --wcag AAA
                </div>
                <div className="text-emerald-400 pl-4 border-l border-emerald-500/30 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Audit passed: 48 nodes evaluated. All text nodes satisfy WCAG AAA 7:1 contrast ratio.
                </div>

                <div className="text-[#8a8f98]">
                  <span className="text-[#00f0ff]">$</span> vitra commit -m "feat(tokens): optimize contrast for obsidian palette"
                </div>
                <div className="text-[#00f0ff] pl-4 border-l border-[#00f0ff]/30">
                  [feature/dark-tokens 9c4b72e] feat(tokens): optimize contrast for obsidian palette<br />
                  1 artboard changed, 14 nodes modified, 0 visual conflicts.
                </div>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="space-y-4 text-[#d0d6e0]">
                <div className="text-[#8a8f98]">// AI Coding Agent (Cursor / Claude) invokes Vitra MCP tool:</div>
                <div className="p-3 bg-[#08090a] rounded border border-[#1c1d1e] text-[#f7f8f8]">
                  <span className="text-[#00f0ff]">tools.call</span>(&quot;vitra:create_frame&quot;, &#123;<br />
                  &nbsp;&nbsp;name: &quot;Navbar&quot;,<br />
                  &nbsp;&nbsp;layoutMode: &quot;FLEX_ROW&quot;,<br />
                  &nbsp;&nbsp;justifyContent: &quot;SPACE_BETWEEN&quot;,<br />
                  &nbsp;&nbsp;alignItems: &quot;CENTER&quot;,<br />
                  &nbsp;&nbsp;padding: &#123; top: 16, bottom: 16, left: 24, right: 24 &#125;,<br />
                  &nbsp;&nbsp;backgroundColor: &quot;var(--surface-card)&quot;<br />
                  &#125;)
                </div>
                <div className="text-emerald-400 pl-4 border-l border-emerald-500/30">
                  → Node created [id: node_01h8a9bc] | Computed layout dimensions: 1436px × 73px
                </div>
              </div>
            )}

            {activeTab === 'ast' && (
              <div className="space-y-2 text-[#d0d6e0]">
                <div className="text-[#8a8f98]">// Immutable Document Tree Representation:</div>
                <pre className="text-xs text-[#00f0ff]">{`{
  "id": "artboard_root",
  "type": "FRAME",
  "name": "LinearInspired_Dashboard",
  "props": {
    "width": 1436,
    "minHeight": 900,
    "flexDirection": "column",
    "gap": 32,
    "background": "#08090a"
  },
  "children": [
    { "id": "header_01", "type": "FRAME", "height": 73, "borderBottom": "1px solid #1c1d1e" },
    { "id": "hero_grid", "type": "FRAME", "flexGrow": 1, "layout": "yoga-flex" }
  ]
}`}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
