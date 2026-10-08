import React, { useState } from 'react';
import {  Smartphone, Monitor, Check, Copy } from 'lucide-react';

export const CodeExport: React.FC = () => {
  const [target, setTarget] = useState<'react' | 'swiftui'>('react');
  const [copied, setCopied] = useState(false);

  const reactCode = `import React from 'react';

export const MetricCard: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="bg-[#0f1011] border border-[#1c1d1e] rounded-[12px] p-6 shadow-sm flex flex-col gap-2">
      <span className="text-xs font-mono text-[#8a8f98] uppercase tracking-wider">{label}</span>
      <span className="text-3xl font-medium tracking-tight text-[#f7f8f8]">{value}</span>
      <div className="mt-2 text-xs font-mono text-[#00f0ff] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" />
        Verified via Vitra AST
      </div>
    </div>
  );
};`;

  const swiftUiCode = `import SwiftUI

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
    navigator.clipboard.writeText(target === 'react' ? reactCode : swiftUiCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="compiler" className="py-24 border-t border-[#1c1d1e] bg-[#08090a]">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="text-xs font-mono font-medium text-[#00f0ff] uppercase tracking-wider mb-2">
              Compilation Target
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-[#f7f8f8]">
              AST to Production Code
            </h2>
          </div>
          <p className="max-w-xl text-[#8a8f98] text-[16px] leading-relaxed">
            No brittle CSS extractions or AI hallucinations. Vitra compiles the normalized Visual AST directly
            into production-ready React with Tailwind CSS v4 or native SwiftUI with design token bindings.
          </p>
        </div>

        {/* Code Preview Frame */}
        <div className="linear-card rounded-[12px] overflow-hidden">
          {/* Header Controls */}
          <div className="h-12 px-6 bg-[#121315] border-b border-[#1c1d1e] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTarget('react')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
                  target === 'react'
                    ? 'bg-[#1c1d1e] text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>React + Tailwind v4</span>
              </button>

              <button
                onClick={() => setTarget('swiftui')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
                  target === 'swiftui'
                    ? 'bg-[#1c1d1e] text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Apple SwiftUI</span>
              </button>
            </div>

            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied snippet</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy code</span>
                </>
              )}
            </button>
          </div>

           <div className="p-6 bg-[#08090a] overflow-x-auto font-mono text-[13px] leading-relaxed">
            <pre className="text-[#d0d6e0]">
              <code>{target === 'react' ? reactCode : swiftUiCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
