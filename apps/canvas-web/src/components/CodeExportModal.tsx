import { useState, useEffect, useMemo } from 'react';
import { InMemorySceneStore } from '@vitra/core';
import { exportCode } from '@vitra/codegen';
import { Code, Copy, Check, X, Monitor, Smartphone } from 'lucide-react';

export interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: InMemorySceneStore | null;
  selectedNodeId?: string | null;
}

export function CodeExportModal({ isOpen, onClose, store, selectedNodeId }: CodeExportModalProps) {
  const [codeTab, setCodeTab] = useState<'react-tailwind' | 'swiftui'>('react-tailwind');
  const [activeTargetId, setActiveTargetId] = useState<string>('');
  const [copied, setCopied] = useState(false);

   const artboards = useMemo(() => {
    if (!store) return [];
    const root = store.getRoot();
    return store.getChildren(root.id);
  }, [store]);

   useEffect(() => {
    if (!isOpen || !store || artboards.length === 0) return;

    if (selectedNodeId) {
       let curr = store.getNode(selectedNodeId);
      const rootId = store.getRoot().id;
      while (curr && curr.parentId && curr.parentId !== rootId) {
        curr = store.getNode(curr.parentId);
      }
      if (curr && artboards.some((ab) => ab.id === curr?.id)) {
        setActiveTargetId(curr.id);
        return;
      }
    }

     if (!activeTargetId || !artboards.some((ab) => ab.id === activeTargetId)) {
      setActiveTargetId(artboards[0]?.id ?? '');
    }
  }, [isOpen, selectedNodeId, store, artboards]);

  if (!isOpen) return null;

  const targetNode = store && activeTargetId ? store.getNode(activeTargetId) : artboards[0] ?? null;

  let generatedCode = '';
  if (!targetNode || !store) {
    generatedCode = '// No components on canvas to export.';
  } else {
    try {
      const safeName = (targetNode.name ?? targetNode.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      generatedCode = exportCode(store, targetNode.id, {
        target: codeTab,
        componentName: safeName,
      }).code;
    } catch (err) {
      generatedCode = `// Error exporting code: ${String(err)}`;
    }
  }

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-card text-card-foreground border border-border rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
         <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-sidebar/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <Code size={20} className="text-primary" />
            <span className="font-bold text-base text-foreground tracking-tight">
              Production Code Export
            </span>
          </div>

           <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg border border-border">
            <button
              onClick={() => setCodeTab('react-tailwind')}
              className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                codeTab === 'react-tailwind'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              React + Tailwind
            </button>
            <button
              onClick={() => setCodeTab('swiftui')}
              className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                codeTab === 'swiftui'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              SwiftUI
            </button>
          </div>

           <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer p-1.5 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

         {artboards.length > 1 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-sidebar/30 border-b border-border shrink-0 flex-wrap">
            <span className="text-xs text-muted-foreground font-semibold">Artboard:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {artboards.map((ab) => {
                const isSelected = (targetNode?.id ?? '') === ab.id;
                const isMobile = (ab.type === 'artboard' && ab.preset === 'mobile') || (ab.name || '').toLowerCase().includes('mobile');
                return (
                  <button
                    key={ab.id}
                    onClick={() => setActiveTargetId(ab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-accent text-accent-foreground border-primary font-semibold'
                        : 'bg-secondary text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    {isMobile ? (
                      <Smartphone size={13} className={isSelected ? 'text-emerald-400' : 'text-muted-foreground'} />
                    ) : (
                      <Monitor size={13} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                    )}
                    <span>{ab.name || ab.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

         <div className="flex-1 overflow-auto p-4 bg-muted/20 font-mono text-xs leading-relaxed text-foreground custom-scrollbar select-text">
          <pre className="m-0 whitespace-pre font-mono">
            {generatedCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
