import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  SceneNode,
  InMemorySceneStore,
  ArtboardNode,
  SceneEvent,
} from '@vitra/core';
import { computeLayout, LayoutNodeResult } from '@vitra/layout';
import {
  Editor,
  createShapeId,
  type TLShapePartial,
} from '@tldraw/tldraw';
import {
  setShapeContext,
  type VitraArtboardShape,
} from '../shapes/VitraArtboardShape.js';
import { measureBrowserText } from '../utils/text-measurer.js';

export interface UseSceneControllerOptions {
  editorRef: React.MutableRefObject<Editor | null>;
  sendWsMutation: (event: SceneEvent) => void;
  addActivityEvent: (text: string) => void;
}

export function useSceneController({
  editorRef,
  sendWsMutation,
  addActivityEvent,
}: UseSceneControllerOptions) {
  const [store, setStore] = useState<InMemorySceneStore | null>(null);
  const [storeRevision, setStoreRevision] = useState(0);
  const storeRevisionRef = useRef(0);

  const [layouts, setLayouts] = useState<Record<string, LayoutNodeResult>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const storeRef = useRef<InMemorySceneStore | null>(null);

   useEffect(() => {
    if (!store) return;
    const unsubscribe = store.subscribe(() => {
      storeRevisionRef.current += 1;
      setStoreRevision(storeRevisionRef.current);
    });
    return unsubscribe;
  }, [store]);

   const syncToTldraw = useCallback(
    (currentStore: InMemorySceneStore, computedLayouts: Record<string, LayoutNodeResult>) => {
      const editor = editorRef.current;
      if (!editor) return;

      const root = currentStore.getRoot();
      const children = currentStore.getChildren(root.id);

       const activeShapeIds = new Set(children.map((child) => createShapeId(`vitra-${child.id}`)));

       const allCurrentPageShapes = editor.getCurrentPageShapes();
      const shapesToDelete = allCurrentPageShapes
        .filter((shape) => shape.type === 'vitra-artboard' && !activeShapeIds.has(shape.id))
        .map((shape) => shape.id);

      if (shapesToDelete.length > 0) {
        editor.deleteShapes(shapesToDelete);
      }

      if (children.length === 0) return;

       const shapesToCreate: TLShapePartial<VitraArtboardShape>[] = [];
      const shapesToUpdate: TLShapePartial<VitraArtboardShape>[] = [];

      children.forEach((child, index) => {
        const artboardId = child.id;
        const shapeId = createShapeId(`vitra-${artboardId}`);
        const isArtboard = child.type === 'artboard';
        const artboard = isArtboard ? (child as ArtboardNode) : null;

        const layout = computedLayouts[artboardId];
        const w = artboard?.width ?? (layout ? layout.bounds.width : 400);
        const h = artboard?.height ?? (layout ? layout.bounds.height : 400);
        const x = artboard?.x ?? index * (w + 80);
        const y = artboard?.y ?? 80;

        const title = child.name || (isArtboard ? `Artboard ${index + 1}` : 'Canvas Node');
        const stateLabel = artboard?.stateLabel;
        const preset = artboard?.preset ?? 'desktop';
        const version = storeRevisionRef.current;

        const existingShape = editor.getShape<VitraArtboardShape>(shapeId);
        if (!existingShape) {
          shapesToCreate.push({
            id: shapeId,
            type: 'vitra-artboard',
            x,
            y,
            props: {
              w,
              h,
              artboardId,
              title,
              stateLabel,
              preset,
              version,
            },
          });
        } else {
          const prevProps = existingShape.props;
          if (
            prevProps.w !== w ||
            prevProps.h !== h ||
            prevProps.title !== title ||
            prevProps.stateLabel !== stateLabel ||
            prevProps.preset !== preset ||
            prevProps.version !== version
          ) {
            shapesToUpdate.push({
              id: shapeId,
              type: 'vitra-artboard',
              props: {
                w,
                h,
                artboardId,
                title,
                stateLabel,
                preset,
                version,
              },
            });
          }
        }
      });

      if (shapesToCreate.length > 0) {
        editor.createShapes(shapesToCreate);
      }
      if (shapesToUpdate.length > 0) {
        editor.updateShapes(shapesToUpdate);
      }
    },
    [editorRef]
  );

   const updateLayouts = useCallback(
    async (currentStore: InMemorySceneStore) => {
      const root = currentStore.getRoot();
      const children = currentStore.getChildren(root.id);

      if (children.length === 0) {
        setLayouts({});
        syncToTldraw(currentStore, {});
        return;
      }

      const nextLayouts: Record<string, LayoutNodeResult> = {};
      for (const child of children) {
        try {
          const computed = await computeLayout(currentStore, child.id, {
            textMeasurer: measureBrowserText,
          });
          nextLayouts[child.id] = computed;
        } catch (err) {
          console.error(`Layout computation error for node ${child.id}:`, err);
        }
      }

      setLayouts(nextLayouts);
      syncToTldraw(currentStore, nextLayouts);
    },
    [syncToTldraw]
  );

   const triggerStoreUpdate = useCallback(
    (mutatedStore: InMemorySceneStore) => {
      storeRef.current = mutatedStore;
      storeRevisionRef.current += 1;
      setStoreRevision(storeRevisionRef.current);
      setStore(mutatedStore);
      void updateLayouts(mutatedStore);
    },
    [updateLayouts]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, patch: Partial<SceneNode>) => {
      if (!storeRef.current) return;
      storeRef.current.updateNode(nodeId, patch);
      triggerStoreUpdate(storeRef.current);

      sendWsMutation({
        type: 'update',
        nodeId,
        patch,
      });
      addActivityEvent(`You edited "${nodeId}" (${Object.keys(patch).join(', ')})`);
    },
    [triggerStoreUpdate, sendWsMutation, addActivityEvent]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!storeRef.current) return;
      storeRef.current.deleteNode(nodeId);
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      triggerStoreUpdate(storeRef.current);

      sendWsMutation({
        type: 'delete',
        nodeId,
      });
      addActivityEvent(`You deleted "${nodeId}"`);
    },
    [selectedNodeId, triggerStoreUpdate, sendWsMutation, addActivityEvent]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, newParentId: string, index?: number) => {
      if (!storeRef.current) return;
      try {
        storeRef.current.moveNode(nodeId, newParentId, index);
        triggerStoreUpdate(storeRef.current);

        sendWsMutation({
          type: 'move',
          nodeId,
          newParentId,
          index,
        });
        addActivityEvent(`You moved "${nodeId}" to index ${index ?? 'end'}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[handleMoveNode] Failed:', msg);
      }
    },
    [triggerStoreUpdate, sendWsMutation, addActivityEvent]
  );

  const totalLayersCount = useMemo(() => {
    if (!store) return 0;
    const countNodes = (id: string): number => {
      const children = store.getChildren(id);
      return 1 + children.reduce((acc, c) => acc + countNodes(c.id), 0);
    };
    const root = store.getRoot();
    return store.getChildren(root.id).reduce((acc, c) => acc + countNodes(c.id), 0);
  }, [store, storeRevision]);

   useEffect(() => {
    setShapeContext({
      store,
      layouts,
      selectedNodeId,
      editingNodeId,
      editingText,
      getZoomLevel: () => editorRef.current?.getZoomLevel() ?? 1,
      onSelectNode: (id) => setSelectedNodeId(id),
      onStartEditText: (id, initialText) => {
        setEditingNodeId(id);
        setEditingText(initialText);
        setSelectedNodeId(id);
      },
      onChangeEditText: (text) => setEditingText(text),
      onFinishEditText: (id, text) => {
        setEditingNodeId(null);
        handleUpdateNode(id, { text });
      },
      onCancelEditText: () => setEditingNodeId(null),
      onMoveNode: (id, newParentId, index) => {
        handleMoveNode(id, newParentId, index);
      },
    });
  }, [
    store,
    layouts,
    selectedNodeId,
    editingNodeId,
    editingText,
    editorRef,
    handleUpdateNode,
    handleMoveNode,
  ]);

  const selectedNode = store && selectedNodeId ? store.getNode(selectedNodeId) : null;

  return {
    store,
    storeRef,
    layouts,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    editingNodeId,
    setEditingNodeId,
    editingText,
    setEditingText,
    totalLayersCount,
    updateLayouts,
    triggerStoreUpdate,
    handleUpdateNode,
    handleDeleteNode,
    handleMoveNode,
  };
}
