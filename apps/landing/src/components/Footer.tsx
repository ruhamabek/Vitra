import React from 'react';
import {  ArrowUpRight  } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#1c1d1e] bg-[#08090a] py-16">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-[#1c1d1e]">
           <div className="flex flex-col gap-2 max-w-md">
            <div className="flex items-center gap-3">
              <img src="/icon-transparent.png" alt="Vitra" className="w-6 h-6 object-contain" />
              <span className="font-semibold text-[16px] text-[#f7f8f8]">Vitra Protocol</span>
            </div>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              The universal visual runtime &amp; design version control protocol. Deterministic AST layouts,
              Git visual merges, and headless AI agent tooling.
            </p>
          </div>

           <div className="flex flex-wrap items-center gap-8 text-[13px] text-[#8a8f98]">
            <a
              href="https://github.com/ruhamabek/Vitra"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f7f8f8] flex items-center gap-1 transition-colors"
            >
              GitHub Repository <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/ruhamabek/Vitra/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f7f8f8] flex items-center gap-1 transition-colors"
            >
              Contributing Guide <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/ruhamabek/Vitra/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#f7f8f8] flex items-center gap-1 transition-colors"
            >
              AGPL-3.0 License <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

         <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#8a8f98] gap-4">
          <div>&copy; {new Date().getFullYear()} Vitra Protocol. Open Source Software under GNU AGPL-3.0.</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Specification v1.0.0 Stable</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
