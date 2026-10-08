import React, { useState } from 'react';
import {  GitMerge, CheckCircle2 } from 'lucide-react';

export const GitVisualDAG: React.FC = () => {
  const [selectedCommit, setSelectedCommit] = useState<'base' | 'main' | 'feature'>('feature');

  return (
    <section id="version-control" className="py-24 border-t border-[#1c1d1e] bg-[#08090a]">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="text-xs font-mono font-medium text-[#00f0ff] uppercase tracking-wider mb-2">
              Protocol Primitive
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-[#f7f8f8]">
              Visual 3-Way AST Merge
            </h2>
          </div>
          <p className="max-w-xl text-[#8a8f98] text-[16px] leading-relaxed">
            Figma has binary blobs. Code has text diffs. Vitra brings true Git DAG version control to
            design documents with semantic AST resolution, visual conflict inspection, and deterministic Yoga layout reconciliation.
          </p>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-5 linear-card rounded-[12px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1c1d1e] mb-6">
                <span className="text-xs font-mono text-[#8a8f98]">COMMIT DAG GRAPH</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
                  3-Way Common Ancestor
                </span>
              </div>

               <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#1c1d1e]">
                 <div
                  onClick={() => setSelectedCommit('base')}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedCommit === 'base'
                      ? 'bg-[#161718] border-[#00f0ff]/50 shadow-sm'
                      : 'bg-[#0f1011] border-[#1c1d1e] hover:border-[#ffffff20]'
                  }`}
                >
                  <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-[#08090a] border-2 border-[#8a8f98]" />
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-[#8a8f98]">a1c84f0 (BASE)</span>
                    <span className="text-[10px] text-[#8a8f98]">2 hrs ago</span>
                  </div>
                  <div className="text-sm font-medium text-[#f7f8f8]">init: Root Design Tokens &amp; Navbar</div>
                </div>

                 <div
                  onClick={() => setSelectedCommit('main')}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedCommit === 'main'
                      ? 'bg-[#161718] border-[#00f0ff]/50 shadow-sm'
                      : 'bg-[#0f1011] border-[#1c1d1e] hover:border-[#ffffff20]'
                  }`}
                >
                  <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-[#08090a] border-2 border-[#2563eb]" />
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-[#2563eb]">7d90e2b (branch: main)</span>
                    <span className="text-[10px] text-[#8a8f98]">45 mins ago</span>
                  </div>
                  <div className="text-sm font-medium text-[#f7f8f8]">style(navbar): updated brand height to 73px</div>
                </div>

                 <div
                  onClick={() => setSelectedCommit('feature')}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedCommit === 'feature'
                      ? 'bg-[#161718] border-[#00f0ff]/50 shadow-sm'
                      : 'bg-[#0f1011] border-[#1c1d1e] hover:border-[#ffffff20]'
                  }`}
                >
                  <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-[#08090a] border-2 border-[#00f0ff]" />
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-[#00f0ff]">3f4a10c (branch: feat/pills)</span>
                    <span className="text-[10px] text-[#8a8f98]">10 mins ago</span>
                  </div>
                  <div className="text-sm font-medium text-[#f7f8f8]">feat(controls): pill radius 9999px on buttons</div>
                </div>
              </div>
            </div>

             <div className="mt-8 pt-4 border-t border-[#1c1d1e] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#8a8f98]">
                <GitMerge className="w-4 h-4 text-emerald-400" />
                <span>vitra merge feat/pills into main</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">Clean 3-Way Auto Merge</span>
            </div>
          </div>

           <div className="lg:col-span-7 linear-card rounded-[12px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1c1d1e] mb-6">
                <span className="text-xs font-mono text-[#8a8f98]">SEMANTIC AST PROPERTY RECONCILIATION</span>
                <span className="text-xs font-mono text-[#8a8f98]">Artboard: /screens/AppHeader</span>
              </div>

               <div className="border border-[#1c1d1e] rounded-lg overflow-hidden font-mono text-xs">
                <div className="grid grid-cols-12 bg-[#121315] p-3 text-[#8a8f98] border-b border-[#1c1d1e]">
                  <div className="col-span-4">Property</div>
                  <div className="col-span-4">Branch: main</div>
                  <div className="col-span-4 text-[#00f0ff]">Branch: feat/pills</div>
                </div>

                <div className="grid grid-cols-12 p-3 border-b border-[#1c1d1e] text-[#d0d6e0] items-center">
                  <div className="col-span-4 font-semibold text-[#f7f8f8]">header.height</div>
                  <div className="col-span-4 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded w-fit">73px (modified)</div>
                  <div className="col-span-4 text-[#8a8f98]">64px (unchanged)</div>
                </div>

                <div className="grid grid-cols-12 p-3 border-b border-[#1c1d1e] text-[#d0d6e0] items-center">
                  <div className="col-span-4 font-semibold text-[#f7f8f8]">button.borderRadius</div>
                  <div className="col-span-4 text-[#8a8f98]">8px (unchanged)</div>
                  <div className="col-span-4 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">9999px (pill)</div>
                </div>

                <div className="grid grid-cols-12 p-3 text-[#d0d6e0] items-center">
                  <div className="col-span-4 font-semibold text-[#f7f8f8]">layout.flexDirection</div>
                  <div className="col-span-4 text-[#8a8f98]">&quot;row&quot;</div>
                  <div className="col-span-4 text-[#8a8f98]">&quot;row&quot;</div>
                </div>
              </div>

              {/* Resolution Explanation */}
              <div className="mt-6 p-4 rounded-lg bg-[#ffffff05] border border-[#ffffff0d] text-xs leading-relaxed text-[#8a8f98]">
                <span className="text-[#f7f8f8] font-medium block mb-1">Automated Semantic Resolution:</span>
                Since <code className="text-[#00f0ff]">header.height</code> and <code className="text-[#00f0ff]">button.borderRadius</code> touched disjoint subtrees in the Visual AST, Vitra commits both updates without visual collision. Yoga Flexbox geometry is re-computed deterministically.
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-[#8a8f98] pt-4 border-t border-[#1c1d1e]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full commit DAG written to <code className="text-[#d0d6e0]">.vitra/objects/</code> loose object store</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
