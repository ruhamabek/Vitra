"use client";
import React, { useState } from 'react';
import { Terminal, Github, Check, Copy } from 'lucide-react';

export const Header: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyInstall = () => {
    navigator.clipboard.writeText('curl -fsSL https://raw.githubusercontent.com/ruhamabek/Vitra/main/scripts/install.sh | bash');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 w-full h-[73px] bg-background/80 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-[1436px] h-full mx-auto px-6 flex items-center justify-between">
         <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-3 group">
            <img
              src="/icon-transparent.png"
              alt="Vitra Logo"
              className="w-7 h-7 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-semibold text-[15px] tracking-tight text-foreground flex items-center gap-1.5">
              Vitra
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground border border-border">
                v0.1.0
              </span>
            </span>
          </a>

           <nav className="hidden md:flex items-center gap-1 text-[13px] text-muted-foreground">
            <a
              href="/#runtime"
              className="px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              The Visual Runtime
            </a>
            <a
              href="/#capabilities"
              className="px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              Capabilities
            </a>
            <a
              href="/#collaboration"
              className="px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              Async Collaboration
            </a>
            <a
              href="/#agents"
              className="px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              AI Agents
            </a>
            <a
              href="/#synthesis"
              className="px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              Code Synthesis
            </a>

          </nav>
        </div>

         <div className="flex items-center gap-3">
           <button
            onClick={copyInstall}
            className="hidden sm:inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-card hover:bg-muted text-[12px] font-mono text-secondary-foreground border border-border shadow-[0_0_0_1px_rgba(0,0,0,0.2),inset_0_0_0_0.5px_rgba(255,255,255,0.07)] transition-all cursor-pointer"
            title="Click to copy curl install command"
          >
            <Terminal className="w-3.5 h-3.5 text-vitra-cyan" />
            <span>curl -fsSL Vitra install.sh</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>

           <a
            href="https://github.com/ruhamabek/Vitra"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-foreground hover:bg-white text-background text-[13px] font-medium transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Star on GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};
