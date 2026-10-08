import React, { useState } from 'react';
import { Terminal, Github, Check, Copy } from 'lucide-react';

export const Header: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyInstall = () => {
    navigator.clipboard.writeText('curl -fsSL https://vitra.dev/install.sh | bash');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 w-full h-[73px] bg-[#08090a]/80 backdrop-blur-md border-b border-[#1c1d1e] transition-colors">
      <div className="max-w-[1436px] h-full mx-auto px-6 flex items-center justify-between">
         <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-3 group">
            <img
              src="/icon-transparent.png"
              alt="Vitra Logo"
              className="w-7 h-7 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-semibold text-[15px] tracking-tight text-[#f7f8f8] flex items-center gap-1.5">
              Vitra
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#ffffff0d] text-[#8a8f98] border border-[#ffffff14]">
                v0.1.0
              </span>
            </span>
          </a>

           <nav className="hidden md:flex items-center gap-1 text-[13px] text-[#8a8f98]">
            <a
              href="#architecture"
              className="px-3 py-1.5 rounded-full hover:text-[#f7f8f8] hover:bg-[#ffffff08] transition-colors"
            >
              Visual AST
            </a>
            <a
              href="#version-control"
              className="px-3 py-1.5 rounded-full hover:text-[#f7f8f8] hover:bg-[#ffffff08] transition-colors"
            >
              Git Engine
            </a>
            <a
              href="#mcp"
              className="px-3 py-1.5 rounded-full hover:text-[#f7f8f8] hover:bg-[#ffffff08] transition-colors"
            >
              MCP Protocol
            </a>
            <a
              href="#compiler"
              className="px-3 py-1.5 rounded-full hover:text-[#f7f8f8] hover:bg-[#ffffff08] transition-colors"
            >
              Code Synthesis
            </a>
          </nav>
        </div>

         <div className="flex items-center gap-3">
           <button
            onClick={copyInstall}
            className="hidden sm:inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-[#0f1011] hover:bg-[#161718] text-[12px] font-mono text-[#d0d6e0] border border-[#1c1d1e] shadow-[0_0_0_1px_rgba(0,0,0,0.2),inset_0_0_0_0.5px_rgba(255,255,255,0.07)] transition-all cursor-pointer"
            title="Click to copy curl install command"
          >
            <Terminal className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>curl -fsSL vitra.dev/install.sh</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-[#8a8f98]" />
            )}
          </button>

           <a
            href="https://github.com/ruhamabek/Vitra"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-[#f7f8f8] hover:bg-[#ffffff] text-[#08090a] text-[13px] font-medium transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Star on GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};
