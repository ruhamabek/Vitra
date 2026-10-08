import { SceneNode, InMemorySceneStore } from '@vitra/core';
import { GripVertical, ArrowUp, ArrowDown, Trash2, X } from 'lucide-react';

export interface PropertyInspectorProps {
  selectedNode: SceneNode | null | undefined;
  store: InMemorySceneStore | null;
  handleMoveNode: (nodeId: string, newParentId: string, index?: number) => void;
  handleUpdateNode: (nodeId: string, patch: Partial<SceneNode>) => void;
  handleDeleteNode: (nodeId: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingText: (text: string) => void;
}

export function PropertyInspector({
  selectedNode,
  store,
  handleMoveNode,
  handleUpdateNode,
  handleDeleteNode,
  setSelectedNodeId,
  setEditingNodeId,
  setEditingText,
}: PropertyInspectorProps) {
  if (!selectedNode) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md border border-border rounded-xl px-4 py-2 shadow-2xl flex items-center gap-3.5 z-40 text-card-foreground select-none"
    >
      <div className="flex items-center gap-2 border-r border-border pr-3">
        <span className="text-[11px] font-bold uppercase text-primary bg-secondary px-2 py-0.5 rounded border border-border">
          {selectedNode.type}
        </span>
        <span className="text-xs text-foreground max-w-24 truncate font-medium">
          {selectedNode.id}
        </span>
      </div>

       {(() => {
        if (!selectedNode.parentId || !store) return null;
        const parentNode = store.getNode(selectedNode.parentId);
        if (!parentNode) return null;
        const siblings = store.getChildren(parentNode.id);
        if (siblings.length <= 1) return null;
        const selectedIndex = siblings.findIndex((s) => s.id === selectedNode.id);
        if (selectedIndex < 0) return null;

        return (
          <div
            className="flex items-center gap-1 border-r border-border pr-3"
            title="Drag on canvas or click to reorder"
          >
            <div className="flex items-center gap-0.5 text-primary">
              <GripVertical size={13} />
              <span className="text-[11px] text-muted-foreground font-semibold">Order:</span>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (selectedIndex > 0) {
                  handleMoveNode(selectedNode.id, parentNode.id, selectedIndex - 1);
                }
              }}
              disabled={selectedIndex <= 0}
              title="Move backward / up"
              className={`p-1 rounded text-xs flex items-center border transition-colors ${
                selectedIndex <= 0
                  ? 'border-transparent text-muted-foreground/30 cursor-default'
                  : 'bg-secondary border-border text-foreground hover:bg-accent cursor-pointer'
              }`}
            >
              <ArrowUp size={11} />
            </button>
            <span className="text-[11px] text-foreground min-w-5 text-center font-mono">
              {selectedIndex + 1}/{siblings.length}
            </span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (selectedIndex < siblings.length - 1) {
                  handleMoveNode(selectedNode.id, parentNode.id, selectedIndex + 1);
                }
              }}
              disabled={selectedIndex >= siblings.length - 1}
              title="Move forward / down"
              className={`p-1 rounded text-xs flex items-center border transition-colors ${
                selectedIndex >= siblings.length - 1
                  ? 'border-transparent text-muted-foreground/30 cursor-default'
                  : 'bg-secondary border-border text-foreground hover:bg-accent cursor-pointer'
              }`}
            >
              <ArrowDown size={11} />
            </button>
          </div>
        );
      })()}

       {(selectedNode.type === 'frame' || selectedNode.type === 'artboard') && (
        <>
           {(() => {
            const baseLayout = selectedNode.layout ?? {
              direction: 'vertical',
              gap: 0,
              alignItems: 'start',
              justifyContent: 'start',
              padding: { top: 0, right: 0, bottom: 0, left: 0 },
            };
            const pad = baseLayout.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
            const padT = pad.top ?? 0;
            const padR = pad.right ?? 0;
            const padB = pad.bottom ?? 0;
            const padL = pad.left ?? 0;

            const isAllUniform = padT === padR && padT === padB && padT === padL;
            const displayAll = isAllUniform ? padT : `${padT}`;
            const displayH = padL === padR ? padL : `${padL}`;
            const displayV = padT === padB ? padT : `${padT}`;

            const btnClass = "bg-secondary hover:bg-accent border border-border text-foreground rounded w-5 h-5 cursor-pointer flex items-center justify-center text-xs font-bold p-0 transition-colors";
            const valClass = "text-[11px] text-foreground min-w-5 text-center font-mono";

            return (
              <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-2 py-1">
                 <div className="flex items-center gap-1" title="Padding (All Sides)">
                  <span className="text-[11px] text-muted-foreground font-semibold">Pad:</span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleUpdateNode(selectedNode.id, {
                        layout: {
                          ...baseLayout,
                          padding: {
                            top: Math.max(0, padT - 4),
                            right: Math.max(0, padR - 4),
                            bottom: Math.max(0, padB - 4),
                            left: Math.max(0, padL - 4),
                          },
                        },
                      });
                    }}
                    className={btnClass}
                    title="Decrease all padding (-4px)"
                  >
                    -
                  </button>
                  <span className={valClass}>{displayAll}</span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleUpdateNode(selectedNode.id, {
                        layout: {
                          ...baseLayout,
                          padding: {
                            top: padT + 4,
                            right: padR + 4,
                            bottom: padB + 4,
                            left: padL + 4,
                          },
                        },
                      });
                    }}
                    className={btnClass}
                    title="Increase all padding (+4px)"
                  >
                    +
                  </button>
                </div>

                 <div className="w-px h-3.5 bg-border" />

                 <div className="flex items-center gap-1" title="Horizontal Padding (Left & Right)">
                  <span className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
                    <span className="text-xs">↔</span> H:
                  </span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleUpdateNode(selectedNode.id, {
                        layout: {
                          ...baseLayout,
                          padding: {
                            top: padT,
                            right: Math.max(0, padR - 4),
                            bottom: padB,
                            left: Math.max(0, padL - 4),
                          },
                        },
                      });
                    }}
                    className={btnClass}
                    title="Decrease horizontal padding (-4px)"
                  >
                    -
                  </button>
                  <span className={valClass}>{displayH}</span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleUpdateNode(selectedNode.id, {
                        layout: {
                          ...baseLayout,
                          padding: {
                            top: padT,
                            right: padR + 4,
                            bottom: padB,
                            left: padL + 4,
                          },
                        },
                      });
                    }}
                    className={btnClass}
                    title="Increase horizontal padding (+4px)"
                  >
                    +
                  </button>
                </div>

                 <div className="w-px h-3.5 bg-border" />

                 <div className="flex items-center gap-1" title="Vertical Padding (Top & Bottom)">
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <span className="text-xs">↕</span> V:
                  </span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleUpdateNode(selectedNode.id, {
                        layout: {
                          ...baseLayout,
                          padding: {
                            top: Math.max(0, padT - 4),
                            right: padR,
                            bottom: Math.max(0, padB - 4),
                            left: padL,
                          },
                        },
                      });
                    }}
                    className={btnClass}
                    title="Decrease vertical padding (-4px)"
                  >
                    -
                  </button>
                  <span className={valClass}>{displayV}</span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      handleUpdateNode(selectedNode.id, {
                        layout: {
                          ...baseLayout,
                          padding: {
                            top: padT + 4,
                            right: padR,
                            bottom: padB + 4,
                            left: padL,
                          },
                        },
                      });
                    }}
                    className={btnClass}
                    title="Increase vertical padding (+4px)"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })()}

           <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Radius:</span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                handleUpdateNode(selectedNode.id, {
                  cornerRadius: Math.max(0, (selectedNode.cornerRadius ?? 0) - 4),
                })
              }
              className="bg-secondary hover:bg-accent border border-border text-foreground rounded w-5.5 h-5.5 cursor-pointer flex items-center justify-center text-xs font-bold transition-colors"
            >
              -
            </button>
            <span className="text-xs text-foreground min-w-6 text-center font-mono">
              {selectedNode.cornerRadius ?? 0}
            </span>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                handleUpdateNode(selectedNode.id, {
                  cornerRadius: (selectedNode.cornerRadius ?? 0) + 4,
                })
              }
              className="bg-secondary hover:bg-accent border border-border text-foreground rounded w-5.5 h-5.5 cursor-pointer flex items-center justify-center text-xs font-bold transition-colors"
            >
              +
            </button>
          </div>

           <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Fill:</span>
            {['#1E1E2E', '#181926', '#313244', '#89B4FA', '#A6E3A1', '#F38BA8'].map((color) => (
              <button
                key={color}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleUpdateNode(selectedNode.id, { fill: color })}
                style={{ backgroundColor: color }}
                className={`w-4.5 h-4.5 rounded cursor-pointer p-0 transition-transform hover:scale-110 ${
                  selectedNode.fill === color ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : 'border border-border'
                }`}
              />
            ))}
          </div>
        </>
      )}

       {selectedNode.type === 'shape' && (
        <>
          {selectedNode.shapeType !== 'ellipse' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Radius:</span>
              <button
                onClick={() =>
                  handleUpdateNode(selectedNode.id, {
                    cornerRadius: Math.max(0, (selectedNode.cornerRadius ?? 0) - 4),
                  })
                }
                className="bg-secondary hover:bg-accent border border-border text-foreground rounded w-5.5 h-5.5 cursor-pointer flex items-center justify-center text-xs font-bold transition-colors"
              >
                -
              </button>
              <span className="text-xs text-foreground min-w-6 text-center font-mono">
                {selectedNode.cornerRadius ?? 0}
              </span>
              <button
                onClick={() =>
                  handleUpdateNode(selectedNode.id, {
                    cornerRadius: (selectedNode.cornerRadius ?? 0) + 4,
                  })
                }
                className="bg-secondary hover:bg-accent border border-border text-foreground rounded w-5.5 h-5.5 cursor-pointer flex items-center justify-center text-xs font-bold transition-colors"
              >
                +
              </button>
            </div>
          )}

           <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Fill:</span>
            {['#89B4FA', '#A6E3A1', '#F38BA8', '#F9E2AF', '#CBA6F7', '#FFFFFF'].map((color) => (
              <button
                key={color}
                onClick={() => handleUpdateNode(selectedNode.id, { fill: color })}
                style={{ backgroundColor: color }}
                className={`w-4.5 h-4.5 rounded cursor-pointer p-0 transition-transform hover:scale-110 ${
                  selectedNode.fill === color ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : 'border border-border'
                }`}
              />
            ))}
          </div>
        </>
      )}

       {selectedNode.type === 'text' && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Size:</span>
            <button
              onClick={() =>
                handleUpdateNode(selectedNode.id, {
                  fontSize: Math.max(10, (selectedNode.fontSize ?? 16) - 2),
                })
              }
              className="bg-secondary hover:bg-accent border border-border text-foreground rounded w-5.5 h-5.5 cursor-pointer flex items-center justify-center text-xs font-bold transition-colors"
            >
              -
            </button>
            <span className="text-xs text-foreground min-w-6 text-center font-mono">
              {selectedNode.fontSize ?? 16}
            </span>
            <button
              onClick={() =>
                handleUpdateNode(selectedNode.id, {
                  fontSize: (selectedNode.fontSize ?? 16) + 2,
                })
              }
              className="bg-secondary hover:bg-accent border border-border text-foreground rounded w-5.5 h-5.5 cursor-pointer flex items-center justify-center text-xs font-bold transition-colors"
            >
              +
            </button>
          </div>

          <button
            onClick={() => {
              const cur = selectedNode.fontWeight ?? 400;
              const next = cur === 400 ? 600 : cur === 600 ? 700 : 400;
              handleUpdateNode(selectedNode.id, { fontWeight: next });
            }}
            className="bg-secondary hover:bg-accent border border-border text-foreground rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors font-medium"
          >
            {(selectedNode.fontWeight ?? 400) >= 700
              ? 'Bold'
              : (selectedNode.fontWeight ?? 400) >= 600
              ? 'Medium'
              : 'Regular'}
          </button>

          <div className="flex items-center gap-1.5">
            {['#FFFFFF', '#CDD6F4', '#89B4FA', '#A6E3A1', '#F38BA8', '#F9E2AF'].map((color) => (
              <button
                key={color}
                onClick={() => handleUpdateNode(selectedNode.id, { fill: color })}
                style={{ backgroundColor: color }}
                className={`w-4.5 h-4.5 rounded cursor-pointer p-0 transition-transform hover:scale-110 ${
                  selectedNode.fill === color ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : 'border border-border'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              setEditingNodeId(selectedNode.id);
              setEditingText(selectedNode.text);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors"
          >
            Edit Text
          </button>
        </>
      )}

      {selectedNode.parentId && selectedNode.parentId !== 'root' && (
        <button
          onClick={() => setSelectedNodeId(selectedNode.parentId)}
          title="Select parent frame"
          className="bg-secondary hover:bg-accent border border-border text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1 text-xs cursor-pointer transition-colors font-medium"
        >
          ↑ Parent
        </button>
      )}

      {selectedNode.type !== 'artboard' && (
        <button
          onClick={() => handleDeleteNode(selectedNode.id)}
          title="Delete layer"
          className="bg-destructive/15 border border-destructive/30 hover:border-destructive/60 text-destructive rounded-md px-2.5 py-1 text-xs cursor-pointer flex items-center gap-1 transition-colors font-medium"
        >
          <Trash2 size={12} />
          <span>Delete</span>
        </button>
      )}

      <button
        onClick={() => setSelectedNodeId(null)}
        className="bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer p-1 flex items-center ml-1 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
