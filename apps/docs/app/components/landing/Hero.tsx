"use client";
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Copy, Check, ShieldCheck } from 'lucide-react';
import { Header } from './Header';

const installCommand = 'curl -fsSL https://raw.githubusercontent.com/ruhamabek/Vitra/main/scripts/install.sh | bash';

export const Hero: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const demoY = useTransform(scrollYProgress, [0, 1], [0, -250]);

  const copyInstall = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={sectionRef} id="runtime" className="relative min-h-screen overflow-hidden">
      <Header />

      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-20 mt-16 md:mt-20 px-4 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
          className="liquid-glass inline-flex items-center gap-2 px-3 py-2 rounded-lg mb-6"
        >
          <span className="bg-foreground text-background rounded-md text-sm font-medium px-2 py-0.5">New</span>
          <span className="text-sm font-medium text-muted-foreground">Say hello to Vitra Engine v0.2.4</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl tracking-[-2px] font-medium leading-tight md:leading-[1.15] mb-3 text-foreground"
        >
          The Visual Runtime.
          <br />
          For User <span className="font-serif italic font-normal">Interfaces</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg font-normal leading-6 opacity-90 mb-8 text-hero-subtitle"
        >
          A headless design engine for your team and AI agents.
          <br className="hidden sm:inline" /> Create layouts, audit contrast, and sync components into your codebase.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/docs"
              className="inline-block bg-foreground text-background rounded-full px-8 py-3.5 text-base font-medium"
            >
              Get Started for Free
            </Link>
          </motion.div>
          <button
            onClick={copyInstall}
            title={installCommand}
            className="liquid-glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to clipboard' : 'curl …/install.sh | bash'}</span>
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative w-screen mt-12 md:aspect-video min-h-[560px] md:min-h-0 flex items-center justify-center"
        style={{ marginLeft: 'calc(-50vw + 50%)' }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-poster.webp"
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/hero.webm" type="video/webm" />
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
        <motion.div
          style={reduceMotion ? undefined : { y: demoY }}
          className="relative z-10 max-w-5xl w-[90%]"
        >
          <TerminalDemo />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent z-30 pointer-events-none" />
    </section>
  );
};

const TerminalDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'build' | 'ai' | 'inspect'>('build');

  return (
     <div className="w-full linear-card rounded-2xl overflow-hidden text-left shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
       <div className="h-11 px-4 bg-secondary border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 mr-1 shrink-0">
            <div className="w-3 h-3 rounded-full bg-muted hover:bg-red-500/60 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-muted hover:bg-amber-500/60 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-muted hover:bg-emerald-500/60 transition-colors" />
          </div>
          <span className="hidden md:inline text-xs font-mono text-muted-foreground">vitra-runtime: ~/design-system (main)</span>
        </div>

         <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border overflow-x-auto min-w-0">
          <button
            onClick={() => setActiveTab('build')}
            className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
              activeTab === 'build'
                ? 'bg-border text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            1. Headless Build
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
              activeTab === 'ai'
                ? 'bg-border text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            2. AI Agent Control
          </button>
          <button
            onClick={() => setActiveTab('inspect')}
            className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-md text-[11px] font-mono transition-colors ${
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
  );
};
