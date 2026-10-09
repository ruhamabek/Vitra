"use client";
import React, { useState } from 'react';
import { Smartphone, Monitor, Check, Copy, FileCode2 } from 'lucide-react';

export const CodeExport: React.FC = () => {
  const [target, setTarget] = useState<'react' | 'swiftui'>('react');
  const [copied, setCopied] = useState(false);

  const reactCodeLines = [
    { num: 1, text: <span><span className="text-code-keyword">import</span> <span className="text-code-type">React</span> <span className="text-code-keyword">from</span> <span className="text-code-string">'react'</span>;</span> },
    { num: 2, text: <span></span> },
    { num: 3, text: <span><span className="text-muted-foreground">// Compiled directly from Vitra Scene AST</span></span> },
    { num: 4, text: <span><span className="text-code-keyword">export const</span> <span className="text-code-type">MetricCard</span>: <span className="text-code-type">React.FC</span>&lt;&#123; <span className="text-foreground">label</span>: <span className="text-code-type">string</span>; <span className="text-foreground">value</span>: <span className="text-code-type">string</span> &#125;&gt; = (&#123; <span className="text-foreground">label</span>, <span className="text-foreground">value</span> &#125;) =&gt; &#123;</span> },
    { num: 5, text: <span>  <span className="text-code-keyword">return</span> (</span> },
    { num: 6, text: <span>    &lt;<span className="text-code-keyword">div</span> <span className="text-code-type">className</span>=<span className="text-code-string">"bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col gap-2"</span>&gt;</span> },
    { num: 7, text: <span>      &lt;<span className="text-code-keyword">span</span> <span className="text-code-type">className</span>=<span className="text-code-string">"text-xs font-mono text-muted-foreground uppercase tracking-wider"</span>&gt;</span> },
    { num: 8, text: <span>        &#123;<span className="text-foreground">label</span>&#125;</span> },
    { num: 9, text: <span>      &lt;/<span className="text-code-keyword">span</span>&gt;</span> },
    { num: 10, text: <span>      &lt;<span className="text-code-keyword">span</span> <span className="text-code-type">className</span>=<span className="text-code-string">"text-3xl font-medium tracking-tight text-foreground"</span>&gt;</span> },
    { num: 11, text: <span>        &#123;<span className="text-foreground">value</span>&#125;</span> },
    { num: 12, text: <span>      &lt;/<span className="text-code-keyword">span</span>&gt;</span> },
    { num: 13, text: <span>      &lt;<span className="text-code-keyword">div</span> <span className="text-code-type">className</span>=<span className="text-code-string">"mt-2 text-xs font-mono text-vitra-cyan flex items-center gap-1.5"</span>&gt;</span> },
    { num: 14, text: <span>        &lt;<span className="text-code-keyword">span</span> <span className="text-code-type">className</span>=<span className="text-code-string">"w-1.5 h-1.5 rounded-full bg-vitra-cyan"</span> /&gt;</span> },
    { num: 15, text: <span>        Production Ready Component</span> },
    { num: 16, text: <span>      &lt;/<span className="text-code-keyword">div</span>&gt;</span> },
    { num: 17, text: <span>    &lt;/<span className="text-code-keyword">div</span>&gt;</span> },
    { num: 18, text: <span>  );</span> },
    { num: 19, text: <span>&#125;;</span> },
  ];

  const swiftUiCodeLines = [
    { num: 1, text: <span><span className="text-code-keyword">import</span> <span className="text-code-type">SwiftUI</span></span> },
    { num: 2, text: <span></span> },
    { num: 3, text: <span><span className="text-muted-foreground">// Native Apple SwiftUI View with Design Token bindings</span></span> },
    { num: 4, text: <span><span className="text-code-keyword">struct</span> <span className="text-code-type">MetricCardView</span>: <span className="text-code-type">View</span> &#123;</span> },
    { num: 5, text: <span>    <span className="text-code-keyword">let</span> <span className="text-foreground">label</span>: <span className="text-code-type">String</span></span> },
    { num: 6, text: <span>    <span className="text-code-keyword">let</span> <span className="text-foreground">value</span>: <span className="text-code-type">String</span></span> },
    { num: 7, text: <span>    </span> },
    { num: 8, text: <span>    <span className="text-code-keyword">var</span> <span className="text-foreground">body</span>: <span className="text-code-keyword">some</span> <span className="text-code-type">View</span> &#123;</span> },
    { num: 9, text: <span>        <span className="text-code-type">VStack</span>(<span className="text-foreground">alignment</span>: .<span className="text-code-type">leading</span>, <span className="text-foreground">spacing</span>: <span className="text-code-number">8</span>) &#123;</span> },
    { num: 10, text: <span>            <span className="text-code-type">Text</span>(<span className="text-foreground">label</span>.<span className="text-code-type">uppercased</span>())</span> },
    { num: 11, text: <span>                .<span className="text-code-type">font</span>(.<span className="text-code-type">system</span>(<span className="text-foreground">size</span>: <span className="text-code-number">11</span>, <span className="text-foreground">design</span>: .<span className="text-code-type">monospaced</span>))</span> },
    { num: 12, text: <span>                .<span className="text-code-type">foregroundColor</span>(<span className="text-code-type">Color</span>(<span className="text-foreground">hex</span>: <span className="text-code-string">"#8a8f98"</span>))</span> },
    { num: 13, text: <span>            <span className="text-code-type">Text</span>(<span className="text-foreground">value</span>)</span> },
    { num: 14, text: <span>                .<span className="text-code-type">font</span>(.<span className="text-code-type">system</span>(<span className="text-foreground">size</span>: <span className="text-code-number">32</span>, <span className="text-foreground">weight</span>: .<span className="text-code-type">medium</span>))</span> },
    { num: 15, text: <span>                .<span className="text-code-type">foregroundColor</span>(<span className="text-code-type">Color</span>(<span className="text-foreground">hex</span>: <span className="text-code-string">"#f7f8f8"</span>))</span> },
    { num: 16, text: <span>        &#125;</span> },
    { num: 17, text: <span>        .<span className="text-code-type">padding</span>(<span className="text-code-number">24</span>)</span> },
    { num: 18, text: <span>        .<span className="text-code-type">background</span>(<span className="text-code-type">Color</span>(<span className="text-foreground">hex</span>: <span className="text-code-string">"#0f1011"</span>))</span> },
    { num: 19, text: <span>        .<span className="text-code-type">cornerRadius</span>(<span className="text-code-number">12</span>)</span> },
    { num: 20, text: <span>        .<span className="text-code-type">overlay</span>(<span className="text-code-type">RoundedRectangle</span>(<span className="text-foreground">cornerRadius</span>: <span className="text-code-number">12</span>).<span className="text-code-type">stroke</span>(<span className="text-code-type">Color</span>(<span className="text-foreground">hex</span>: <span className="text-code-string">"#1c1d1e"</span>), <span className="text-foreground">lineWidth</span>: <span className="text-code-number">1</span>))</span> },
    { num: 21, text: <span>    &#125;</span> },
    { num: 22, text: <span>&#125;</span> },
  ];

  const rawReact = `import React from 'react';

// Compiled directly from Vitra Scene AST
export const MetricCard: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="bg-[#0f1011] border border-[#1c1d1e] rounded-[12px] p-6 shadow-sm flex flex-col gap-2">
      <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-3xl font-medium tracking-tight text-[#f7f8f8]">
        {value}
      </span>
      <div className="mt-2 text-xs font-mono text-[#00f0ff] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
        Production Ready Component
      </div>
    </div>
  );
};`;

  const rawSwift = `import SwiftUI

// Native Apple SwiftUI View with Design Token bindings
struct MetricCardView: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Color(hex: "#8a8f98"))
            Text(value)
                .font(.system(size: 32, weight: .medium))
                .foregroundColor(Color(hex: "#f7f8f8"))
        }
        .padding(24)
        .background(Color(hex: "#0f1011"))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#1c1d1e"), lineWidth: 1))
    }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(target === 'react' ? rawReact : rawSwift);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLines = target === 'react' ? reactCodeLines : swiftUiCodeLines;

  return (
    <section id="synthesis" className="py-24 border-t border-border bg-background">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="text-xs font-mono font-medium text-vitra-cyan uppercase tracking-wider mb-2">
              Automatic Hand-Off
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-foreground">
              Design Directly to Production Code
            </h2>
          </div>
          <p className="max-w-xl text-muted-foreground text-[16px] leading-relaxed">
            Eliminate tedious redlining and manual CSS translation. Vitra compiles components into clean, human-readable frontend code with your design tokens baked right in.
          </p>
        </div>

        {/* Code Editor Window */}
        <div className="linear-card rounded-xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          {/* Top IDE Toolbar */}
          <div className="h-11 px-4 bg-secondary border-b border-border flex items-center justify-between">
            {/* Window Dots & Tab */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-3 h-3 rounded-full bg-muted hover:bg-red-500/60 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-muted hover:bg-amber-500/60 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-muted hover:bg-emerald-500/60 transition-colors cursor-pointer" />
              </div>

              {/* Active File Tab */}
              <div className="flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-t-md text-xs font-mono text-foreground">
                <FileCode2 className="w-3.5 h-3.5 text-vitra-cyan" />
                <span>{target === 'react' ? 'MetricCard.tsx' : 'MetricCardView.swift'}</span>
                <span className="text-[10px] text-muted-foreground">· compiled</span>
              </div>
            </div>

            {/* Target Language Switcher & Copy */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => setTarget('react')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    target === 'react'
                      ? 'bg-border text-vitra-cyan'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>React</span>
                </button>

                <button
                  onClick={() => setTarget('swiftui')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
                    target === 'swiftui'
                      ? 'bg-border text-vitra-cyan'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>SwiftUI</span>
                </button>
              </div>

              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-muted hover:bg-accent text-foreground text-[11px] font-mono border border-border transition-all cursor-pointer ml-1"
                title="Copy code to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-muted-foreground" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Editor Body */}
          <div className="bg-background p-6 font-mono text-[13px] leading-relaxed overflow-x-auto min-h-[420px]">
            <table className="w-full border-collapse">
              <tbody>
                {currentLines.map((line) => (
                  <tr key={line.num} className="hover:bg-foreground/5 transition-colors rounded">
                    <td className="w-10 select-none text-right pr-6 text-muted-foreground/40 text-xs align-top font-mono">
                      {line.num}
                    </td>
                    <td className="whitespace-pre font-mono text-secondary-foreground">
                      {line.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Editor Status Bar */}
          <div className="h-7 px-4 bg-secondary/80 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Vitra AST Synthesizer
              </span>
              <span>UTF-8</span>
              <span>{target === 'react' ? 'TypeScript JSX' : 'Swift 5.9'}</span>
            </div>
             
          </div>
        </div>
      </div>
    </section>
  );
};
