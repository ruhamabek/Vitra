import React from 'react';
import { Bot, Terminal, Cpu, ArrowUpRight, Zap, Check } from 'lucide-react';

export const McpIntegration: React.FC = () => {
  const tools = [
    { name: 'spawn_artboard', desc: 'Initialize canvas with preset dimensions & tokens' },
    { name: 'create_frame', desc: 'Add auto-layout frames with Yoga flexbox properties' },
    { name: 'audit_design', desc: 'Run headless WCAG AA/AAA contrast checks' },
    { name: 'commit_version', desc: 'Create DAG snapshot with commit message' },
    { name: 'export_code', desc: 'Compile Visual AST into clean React / Tailwind v4' },
    { name: 'diff_projects', desc: 'Inspect structural 3-way AST changes between branches' },
  ];

  return (
    <section id="mcp" className="py-24 border-t border-[#1c1d1e] bg-[#08090a]">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
           <div className="lg:col-span-5">
            <div className="text-xs font-mono font-medium text-[#00f0ff] uppercase tracking-wider mb-2">
              Model Context Protocol
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-[#f7f8f8] mb-6">
              First-Class AI Agent Runtime
            </h2>
            <p className="text-[#8a8f98] text-[16px] leading-relaxed mb-6">
              Coding agents struggle with raster screenshots and messy Figma API payloads. Vitra exposes a
              native Model Context Protocol (MCP) server so models like Claude, Cursor, and DeepMind Antigravity can
              directly create, layout, audit, and commit designs using high-level structured tools.
            </p>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-[#d0d6e0]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero token bloat: Structured JSON arguments instead of messy DOM</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#d0d6e0]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Deterministic layout feedback loop via embedded Yoga WebAssembly</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#d0d6e0]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
                <span>Git branch isolation prevents agents from destroying staging designs</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0f1011] border border-[#1c1d1e] font-mono text-xs text-[#8a8f98]">
              <div className="text-[#f7f8f8] mb-2 font-medium">Add to your Claude / Cursor config:</div>
              <div className="bg-[#08090a] p-3 rounded border border-[#1c1d1e] text-[#00f0ff]">
                npx -y @vitra/mcp-server
              </div>
            </div>
          </div>

           <div className="lg:col-span-7 linear-card rounded-[12px] p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1c1d1e] mb-6">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#00f0ff]" />
                <span className="text-xs font-mono text-[#f7f8f8]">REGISTERED MCP TOOLS</span>
              </div>
              <span className="text-xs font-mono text-[#8a8f98]">transport: stdio / sse</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tools.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-[#161718]/60 border border-[#1c1d1e] hover:border-[#00f0ff]/40 transition-colors"
                >
                  <div className="text-xs font-mono font-medium text-[#00f0ff] mb-1">
                    vitra:{t.name}
                  </div>
                  <div className="text-xs text-[#8a8f98] leading-relaxed">{t.desc}</div>
                </div>
              ))}
            </div>

             <div className="mt-6 p-4 rounded-lg bg-[#08090a] border border-[#1c1d1e] font-mono text-xs">
              <div className="text-[#8a8f98] mb-1">// Agent Conversation Trace</div>
              <div className="text-emerald-400">
                Agent: &quot;I will create a responsive pricing table with 3 tiers and test contrast.&quot;
              </div>
              <div className="text-[#d0d6e0] mt-1 pl-3 border-l border-[#1c1d1e]">
                1. vitra:spawn_artboard(&#123; width: 1200, height: 800 &#125;)<br />
                2. vitra:create_frame(&#123; layoutMode: &quot;FLEX_ROW&quot;, gap: 24 &#125;)<br />
                3. vitra:audit_design() &#8594; All criteria met (WCAG AAA)<br />
                4. vitra:commit_version(&#123; message: &quot;feat: pricing table design&quot; &#125;)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
