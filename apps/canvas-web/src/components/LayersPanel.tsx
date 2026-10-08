import { InMemorySceneStore } from '@vitra/core';
import { Layers } from 'lucide-react';
import { LayerTreeItem } from './LayerTreeItem.js';

export interface LayersPanelProps {
  isOpen: boolean;
  store: InMemorySceneStore | null;
  totalLayersCount: number;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
}

export function LayersPanel({
  isOpen,
  store,
  totalLayersCount,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
}: LayersPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-64 min-w-64 max-w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-20 select-none overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-primary" />
          <span className="text-xs font-bold text-sidebar-foreground tracking-wider">
            LAYERS
          </span>
        </div>
        <span className="text-[11px] text-primary bg-secondary px-2 py-0.5 rounded-full font-semibold border border-sidebar-border">
          {totalLayersCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 custom-scrollbar">
        {store &&
          store.getChildren(store.getRoot().id).map((artboard) => (
            <LayerTreeItem
              key={artboard.id}
              node={artboard}
              store={store}
              depth={0}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
      </div>
    </aside>
  );
}
