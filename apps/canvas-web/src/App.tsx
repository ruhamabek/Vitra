import { useState, useRef, useMemo, useCallback } from 'react';
import type { SceneEvent } from '@vitra/core';
import { Tldraw, Editor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

import { VitraArtboardShapeUtil } from './shapes/VitraArtboardShape.js';
import { ActivityEvent, SyncMessage } from './types.js';
import { useVitraSync } from './hooks/useVitraSync.js';
import { useSceneController } from './hooks/useSceneController.js';

import { Header } from './components/Header.js';
import { LayersPanel } from './components/LayersPanel.js';
import { PropertyInspector } from './components/PropertyInspector.js';
import { ActivitySidebar } from './components/ActivitySidebar.js';
import { CodeExportModal } from './components/CodeExportModal.js';
import { GitTimelinePanel } from './components/GitTimelinePanel.js';
import { GitDiffModal } from './components/GitDiffModal.js';

export function App() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(true);
  const [isActivityOpen, setIsActivityOpen] = useState(true);

  const editorRef = useRef<Editor | null>(null);
  const customShapeUtils = useMemo(() => [VitraArtboardShapeUtil], []);

  const addEvent = useCallback((text: string) => {
    const now = new Date().toLocaleTimeString();
    setEvents((prev) => [{ id: crypto.randomUUID(), text, time: now }, ...prev.slice(0, 19)]);
  }, []);

  const sendWsMessageRef = useRef<(msg: SyncMessage) => void>(() => {});
  const sendWsMutation = useCallback((event: SceneEvent) => {
    sendWsMessageRef.current({ type: 'mutation', event });
  }, []);

   const scene = useSceneController({
    editorRef,
    sendWsMutation,
    addActivityEvent: addEvent,
  });

   const {
    connected,
    activePort,
    sendWsMessage,
    gitBranches,
    gitCurrentBranch,
    gitCommits,
    gitHeadIndex,
    gitSliderIndex,
    setGitSliderIndex,
    isGitPanelOpen,
    setIsGitPanelOpen,
    isTimeTraveling,
    gitDiff,
    isDiffModalOpen,
    setIsDiffModalOpen,
    checkoutBranch,
    checkoutCommit,
    restoreHead,
    requestDiff,
    importFigma,
    importPenpot,
  } = useVitraSync({
    addEvent,
    getStore: () => scene.storeRef.current,
    onSnapshot: (newStore) => scene.triggerStoreUpdate(newStore),
    onSceneEvent: (_event, curStore) => scene.triggerStoreUpdate(curStore),
  });

  sendWsMessageRef.current = sendWsMessage;

  const handleChangePort = () => {
    const entered = prompt('Enter Vitra Sync Server port (e.g. 9898 or 9876):', activePort);
    if (entered && /^\d+$/.test(entered.trim())) {
      const nextPort = entered.trim();
      const url = new URL(window.location.href);
      url.search = `?port=${nextPort}`;
      window.location.href = url.toString();
    }
  };

  const handleExportVitra = () => {
    if (!scene.storeRef.current) return;
    const snapshot = scene.storeRef.current.exportSnapshot();
    const firstArtboard = scene.storeRef.current.getChildren(scene.storeRef.current.getRoot().id)[0];
    const projectName = firstArtboard?.name || scene.storeRef.current.getRoot().name || 'Vitra Project';
    const safeFileName = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    const bundle = {
      manifest: {
        schemaVersion: '1.0.0',
        name: projectName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        defaultTheme: 'dark',
      },
      scene: snapshot,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}.vitra.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-background overflow-hidden text-foreground">
      <Header
        git={{
          branches: gitBranches,
          currentBranch: gitCurrentBranch,
          commitsCount: gitCommits.length,
          isPanelOpen: isGitPanelOpen,
          onCheckoutBranch: checkoutBranch,
          onTogglePanel: () => setIsGitPanelOpen((prev) => !prev),
          onRequestDiff: requestDiff,
          onImportFigma: importFigma,
          onImportPenpot: importPenpot,
        }}
        canvas={{
          onResetZoom: () => editorRef.current?.resetZoom(),
          onOpenCodeModal: () => setIsCodeModalOpen(true),
          onExportVitra: handleExportVitra,
        }}
        status={{
          isLayersOpen,
          onToggleLayers: () => setIsLayersOpen((prev) => !prev),
          totalLayersCount: scene.totalLayersCount,
          isActivityOpen,
          onToggleActivity: () => setIsActivityOpen((prev) => !prev),
          activityEventsCount: events.length,
          connected,
          activePort,
          onChangePort: handleChangePort,
        }}
      />

       <div className="flex flex-1 overflow-hidden relative">
        <LayersPanel
          isOpen={isLayersOpen}
          store={scene.store}
          totalLayersCount={scene.totalLayersCount}
          selectedNodeId={scene.selectedNodeId}
          onSelectNode={(id) => scene.setSelectedNodeId(id)}
          onDeleteNode={scene.handleDeleteNode}
        />

         <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            <Tldraw
              shapeUtils={customShapeUtils}
              onMount={(editor) => {
                editorRef.current = editor;
                if (scene.storeRef.current) {
                  void scene.updateLayouts(scene.storeRef.current);
                }
              }}
            />
          </div>

          <PropertyInspector
            selectedNode={scene.selectedNode}
            store={scene.store}
            handleMoveNode={scene.handleMoveNode}
            handleUpdateNode={scene.handleUpdateNode}
            handleDeleteNode={scene.handleDeleteNode}
            setSelectedNodeId={scene.setSelectedNodeId}
            setEditingNodeId={scene.setEditingNodeId}
            setEditingText={scene.setEditingText}
          />
        </main>

        <ActivitySidebar
          isOpen={isActivityOpen}
          onToggle={() => setIsActivityOpen((prev) => !prev)}
          events={events}
        />
      </div>

       <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        store={scene.store}
        selectedNodeId={scene.selectedNodeId}
      />

      <GitTimelinePanel
        isOpen={isGitPanelOpen}
        gitCommits={gitCommits}
        gitHeadIndex={gitHeadIndex}
        gitSliderIndex={gitSliderIndex}
        isTimeTraveling={isTimeTraveling}
        onClose={() => setIsGitPanelOpen(false)}
        onRestoreHead={restoreHead}
        onSelectCommit={(idx) => {
          setGitSliderIndex(idx);
          const commit = gitCommits[idx];
          if (!commit) return;
          if (idx !== gitHeadIndex) {
            checkoutCommit(commit.hash);
          } else {
            restoreHead();
          }
        }}
      />

      <GitDiffModal
        isOpen={isDiffModalOpen}
        gitDiff={gitDiff}
        onClose={() => setIsDiffModalOpen(false)}
      />
    </div>
  );
}

