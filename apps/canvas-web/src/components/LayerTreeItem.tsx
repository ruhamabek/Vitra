import { useState } from 'react';
import { SceneNode, InMemorySceneStore } from '@vitra/core';
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  Type,
  Circle,
  Square,
  Sparkles,
  Trash2,
} from 'lucide-react';

export interface LayerTreeItemProps {
  node: SceneNode;
  store: InMemorySceneStore;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
}

export function LayerTreeItem({
  node,
  store,
  depth,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
}: LayerTreeItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isSelected = selectedNodeId === node.id;
  const children = store.getChildren(node.id);
  const hasChildren = children.length > 0;

  const nodeName =
    node.name ||
    (node.type === 'text'
      ? node.text.length > 20
        ? node.text.slice(0, 20) + '...'
        : node.text
      : node.id);

  return (
    <div>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node.id);
        }}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        className={`flex items-center py-1.5 pr-2 gap-1.5 cursor-pointer text-xs transition-colors group ${
          isSelected
            ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-[3px] border-primary font-medium'
            : 'border-l-[3px] border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50'
        }`}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground p-0.5"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </span>
        ) : (
          <span className="w-3" />
        )}

        {node.type === 'artboard' && <Layers size={13} className="text-primary shrink-0" />}
        {node.type === 'frame' && <Box size={13} className="text-emerald-400 shrink-0" />}
        {node.type === 'text' && <Type size={13} className="text-amber-300 shrink-0" />}
        {node.type === 'shape' &&
          (node.shapeType === 'ellipse' ? (
            <Circle size={13} className="text-purple-400 shrink-0" />
          ) : (
            <Square size={13} className="text-purple-400 shrink-0" />
          ))}
        {node.type === 'icon' && <Sparkles size={13} className="text-orange-400 shrink-0" />}

        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          title={node.id}
        >
          {nodeName}
        </span>

        {isSelected && node.type !== 'artboard' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            title="Delete layer"
            className="bg-transparent border-none text-destructive hover:text-destructive/80 cursor-pointer p-0.5 flex items-center opacity-80 hover:opacity-100 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {!collapsed && hasChildren && (
        <div>
          {children.map((child) => (
            <LayerTreeItem
              key={child.id}
              node={child}
              store={store}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
