"use client";
import React, { useState } from 'react';
import { Users, CheckCircle2 } from 'lucide-react';

export const GitVisualDAG: React.FC = () => {
  const [selectedTimeline, setSelectedTimeline] = useState<'merged' | 'designer' | 'engineer'>('merged');

  return (
    <section id="collaboration" className="py-24 border-t border-border bg-background">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="text-xs font-mono font-medium text-vitra-cyan uppercase tracking-wider mb-2">
              Team Collaboration
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-foreground">
              Parallel Work Without Lockouts
            </h2>
          </div>
          <p className="max-w-xl text-muted-foreground text-[16px] leading-relaxed">
            In traditional design files, multiple people editing the same screen leads to messy duplicates and accidental overwrites. Vitra handles UI updates in parallel, reconciling changes intelligently so everyone can move fast.
          </p>
        </div>

        {/* Visual Reconciliation Inspector Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Parallel Team Streams */}
          <div className="lg:col-span-5 linear-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <span className="text-xs font-mono text-muted-foreground">PARALLEL CONTRIBUTIONS</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-vitra-cyan/10 text-vitra-cyan border border-vitra-cyan/20">
                  Live Reconciliation
                </span>
              </div>

              {/* Contributor Streams */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                {/* Designer Stream */}
                <div
                  onClick={() => setSelectedTimeline('designer')}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedTimeline === 'designer'
                      ? 'bg-muted border-vitra-cyan/50 shadow-sm'
                      : 'bg-card border-border hover:border-foreground/20'
                  }`}
                >
                  <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-background border-2 border-vitra-blue" />
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-vitra-blue">Design Team</span>
                    <span className="text-[10px] text-muted-foreground">30 mins ago</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">Refined navbar spacing and brand icons</div>
                </div>

                {/* Engineer Stream */}
                <div
                  onClick={() => setSelectedTimeline('engineer')}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedTimeline === 'engineer'
                      ? 'bg-muted border-vitra-cyan/50 shadow-sm'
                      : 'bg-card border-border hover:border-foreground/20'
                  }`}
                >
                  <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-background border-2 border-vitra-cyan" />
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-vitra-cyan">Engineering Team</span>
                    <span className="text-[10px] text-muted-foreground">15 mins ago</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">Updated button corner radius and interaction states</div>
                </div>

                {/* AI Agent Stream */}
                <div
                  onClick={() => setSelectedTimeline('merged')}
                  className={`relative p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedTimeline === 'merged'
                      ? 'bg-muted border-vitra-cyan/50 shadow-sm'
                      : 'bg-card border-border hover:border-foreground/20'
                  }`}
                >
                  <div className="absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full bg-background border-2 border-emerald-400" />
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-emerald-400">Automated Audit &amp; Merge</span>
                    <span className="text-[10px] text-muted-foreground">Just now</span>
                  </div>
                  <div className="text-sm font-medium text-foreground">Both updates merged automatically without data loss</div>
                </div>
              </div>
            </div>

            {/* Status footer */}
            <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Users className="w-4 h-4 text-vitra-cyan" />
                <span>Async Multi-Player Workflow</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">Zero Overwrites</span>
            </div>
          </div>

          {/* Right: What actually gets resolved */}
          <div className="lg:col-span-7 linear-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <span className="text-xs font-mono text-muted-foreground">AUTOMATIC COMPONENT RECONCILIATION</span>
                <span className="text-xs font-mono text-muted-foreground">Target: AppHeader.component</span>
              </div>

              {/* Property Reconcile Table */}
              <div className="border border-border rounded-lg overflow-hidden font-mono text-xs">
                <div className="grid grid-cols-12 bg-secondary p-3 text-muted-foreground border-b border-border">
                  <div className="col-span-4">Component Target</div>
                  <div className="col-span-4">Design Team Update</div>
                  <div className="col-span-4 text-vitra-cyan">Engineer Update</div>
                </div>

                <div className="grid grid-cols-12 p-3 border-b border-border text-secondary-foreground items-center">
                  <div className="col-span-4 font-semibold text-foreground">Navbar Height</div>
                  <div className="col-span-4 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">Updated to 73px</div>
                  <div className="col-span-4 text-muted-foreground">Untouched</div>
                </div>

                <div className="grid grid-cols-12 p-3 border-b border-border text-secondary-foreground items-center">
                  <div className="col-span-4 font-semibold text-foreground">Action Button</div>
                  <div className="col-span-4 text-muted-foreground">Untouched</div>
                  <div className="col-span-4 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">Set to pill shape</div>
                </div>

                <div className="grid grid-cols-12 p-3 text-secondary-foreground items-center">
                  <div className="col-span-4 font-semibold text-foreground">Overall Alignment</div>
                  <div className="col-span-4 text-muted-foreground">Maintained</div>
                  <div className="col-span-4 text-muted-foreground">Maintained</div>
                </div>
              </div>

              {/* Explanation of the outcome */}
              <div className="mt-6 p-4 rounded-lg bg-foreground/5 border border-border text-xs leading-relaxed text-muted-foreground">
                <span className="text-foreground font-medium block mb-1">How Vitra saves your time:</span>
                Instead of forcing designers and developers to sit together and re-create screens by hand, Vitra figures out which properties changed and combines them safely. You keep all improvements without losing anyone&apos;s progress.
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full revision history preserved and inspectable at any time</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
