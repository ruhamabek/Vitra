import React from 'react';
import { Layers,  Palette, CheckCircle, Sliders, Box, Code2  } from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: Layers,
      title: 'Lossless Visual AST',
      category: 'DATA MODEL',
      description:
        'Immutable JSON tree supporting Frames, Text, Shapes, Components, and Instances. Built to match web and native layouts with zero ambiguity.',
      metric: 'O(1) tree patching',
    },
    {
      icon: Box,
      title: 'Yoga Flexbox Layout Engine',
      category: 'GEOMETRY',
      description:
        'C++ Yoga WebAssembly engine compiled to browser & CLI runtimes. Deterministic cross-platform layout calculations identical to React Native and CSS.',
      metric: 'Pixel-perfect flex math',
    },
    {
      icon: Palette,
      title: 'W3C Design Tokens v1.0',
      category: 'DESIGN SYSTEM',
      description:
        'Direct JSON token registration with dark/light themes, color scales, typography ramps, and radii. Automatic sync to CSS variables and Tailwind v4 themes.',
      metric: 'DTCG Standard compliant',
    },
    {
      icon: CheckCircle,
      title: 'Headless WCAG Auditing',
      category: 'QUALITY ASSURANCE',
      description:
        'Automatic APCA and WCAG 2.1 AA/AAA contrast calculations, minimum touch target validations, and hierarchy checks executable in CI/CD without headless browsers.',
      metric: 'Zero-browser CLI audits',
    },
    {
      icon: Sliders,
      title: 'Penpot & Figma Bidirectional Sync',
      category: 'INTEGRATIONS',
      description:
        'Full plugin ecosystem for Penpot and Figma. Import existing design systems or export Vitra artboards straight into design canvases.',
      metric: 'Two-way schema translation',
    },
    {
      icon: Code2,
      title: 'Production Code Synthesizer',
      category: 'CODEGEN',
      description:
        'Compiles Visual AST trees into clean React + Tailwind CSS v4, SwiftUI Views, or HTML/CSS templates with automatic responsiveness.',
      metric: 'Zero div soup output',
    },
  ];

  return (
    <section id="architecture" className="py-24 border-t border-[#1c1d1e] bg-[#08090a]">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="mb-16">
          <div className="text-xs font-mono font-medium text-[#00f0ff] uppercase tracking-wider mb-2">
            Engine Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-[48px] font-medium tracking-[-0.022em] text-[#f7f8f8] mb-4">
            Engineered for Precision &amp; Speed
          </h2>
          <p className="max-w-2xl text-[#8a8f98] text-[16px]">
            Every layer of Vitra is decoupled, tested, and designed to function as an autonomous
            headless protocol for modern software development.
          </p>
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="linear-card rounded-[12px] p-6 flex flex-col justify-between hover:border-[#ffffff20] transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-lg bg-[#ffffff05] border border-[#ffffff10] flex items-center justify-center text-[#00f0ff] group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-[#8a8f98] uppercase tracking-wider">
                      {feat.category}
                    </span>
                  </div>

                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-2">{feat.title}</h3>
                  <p className="text-[14px] text-[#8a8f98] leading-relaxed mb-6">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1c1d1e] flex items-center justify-between text-xs font-mono text-[#d0d6e0]">
                  <span>Status: Operational</span>
                  <span className="text-[#00f0ff]">{feat.metric}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
