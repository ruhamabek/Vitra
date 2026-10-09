"use client";
import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-background py-16">
      <div className="max-w-[1436px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-border">
          {/* Logo & Manifesto */}
          <div className="flex flex-col gap-2 max-w-md">
            <div className="flex items-center gap-3">
              <img src="/icon-transparent.png" alt="Vitra" className="w-6 h-6 object-contain" />
              <span className="font-semibold text-[16px] text-foreground">Vitra</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The universal visual runtime for user interfaces. Run, compute, audit, and compile UI headlessly for developers and autonomous AI agents.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-8 text-[13px] text-muted-foreground">
            <a
              href="https://github.com/ruhamabek/Vitra"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              GitHub Repository <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/ruhamabek/Vitra/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Contributing Guide <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/ruhamabek/Vitra/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              AGPL-3.0 License <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-muted-foreground gap-4">
          <div>&copy; {new Date().getFullYear()} Vitra Protocol. Open Source Software under GNU AGPL-3.0.</div>
           
        </div>
      </div>
    </footer>
  );
};
