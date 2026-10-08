import { useEffect, useState, useRef, useCallback } from 'react';
import { InMemorySceneStore, SceneNode, SceneEvent } from '@vitra/core';
import { GitCommitSummary, GitDiffResult, SyncMessage } from '../types.js';
import { parseTargetPort } from '../utils/port.js';

export interface UseVitraSyncOptions {
  addEvent: (text: string) => void;
  onSnapshot: (store: InMemorySceneStore) => Promise<void> | void;
  onSceneEvent: (event: SceneEvent, store: InMemorySceneStore) => Promise<void> | void;
  getStore: () => InMemorySceneStore | null;
}

export function useVitraSync({
  addEvent,
  onSnapshot,
  onSceneEvent,
  getStore,
}: UseVitraSyncOptions) {
  const [connected, setConnected] = useState(false);
  const [activePort, setActivePort] = useState<string>(parseTargetPort);

   const [gitBranches, setGitBranches] = useState<string[]>([]);
  const [gitCurrentBranch, setGitCurrentBranch] = useState('main');
  const [gitCommits, setGitCommits] = useState<GitCommitSummary[]>([]);
  const [gitHeadIndex, setGitHeadIndex] = useState(-1);
  const [gitSliderIndex, setGitSliderIndex] = useState(-1);
  const [isGitPanelOpen, setIsGitPanelOpen] = useState(false);
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);
  const [gitDiff, setGitDiff] = useState<GitDiffResult | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingMutationsRef = useRef<SyncMessage[]>([]);

  const sendWsMessage = useCallback((msg: SyncMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingMutationsRef.current.push(msg);
    }
  }, []);

  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  const onSceneEventRef = useRef(onSceneEvent);
  onSceneEventRef.current = onSceneEvent;

  const getStoreRef = useRef(getStore);
  getStoreRef.current = getStore;

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let ws: WebSocket | null = null;

    function connect() {
      if (!isMounted) return;
      try {
        const targetPort = parseTargetPort();
        setActivePort(targetPort);
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
        ws = new WebSocket(`${protocol}//${host}:${targetPort}`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnected(true);
          addEvent(`Connected to Vitra Sync Server (ws://localhost:${targetPort})`);

           while (pendingMutationsRef.current.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
            const m = pendingMutationsRef.current.shift();
            ws.send(JSON.stringify(m));
          }

           if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'git_status_request' }));
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnected(false);
          addEvent('Disconnected from Vitra Sync Server. Reconnecting in 1.5s...');
          reconnectTimeout = setTimeout(connect, 1500);
        };

        ws.onerror = () => {
          // Handled via onclose
        };

        ws.onmessage = async (event) => {
          if (!isMounted) return;
          try {
            const msg: SyncMessage = JSON.parse(event.data);

            if (msg.type === 'snapshot' && msg.root && msg.nodes) {
              const newStore = new InMemorySceneStore(msg.root);
              let remaining = Object.values(msg.nodes).filter((n) => n.id !== msg.root!.id);
              let progress = true;

              while (remaining.length > 0 && progress) {
                progress = false;
                const nextRemaining: SceneNode[] = [];
                for (const node of remaining) {
                  if (node.parentId && newStore.getNode(node.parentId)) {
                    newStore.insertNode(node, node.parentId);
                    progress = true;
                  } else {
                    nextRemaining.push(node);
                  }
                }
                remaining = nextRemaining;
              }

              addEvent(`Loaded snapshot with ${Object.keys(msg.nodes).length} nodes`);
              await onSnapshotRef.current(newStore);
            } else if (msg.type === 'event') {
              const curStore = getStoreRef.current();
              if (curStore) {
                const e = msg.event;
                if (e.type === 'insert' && e.node) {
                  if (!curStore.getNode(e.nodeId)) {
                    curStore.insertNode(e.node, e.parentId);
                  }
                  addEvent(`Agent inserted ${e.node.type} "${e.nodeId}"`);
                } else if (e.type === 'update') {
                  curStore.updateNode(e.nodeId, e.patch);
                  addEvent(`Agent updated "${e.nodeId}"`);
                } else if (e.type === 'delete') {
                  curStore.deleteNode(e.nodeId);
                  addEvent(`Agent deleted "${e.nodeId}"`);
                } else if (e.type === 'move') {
                  curStore.moveNode(e.nodeId, e.newParentId, e.index);
                  addEvent(`Agent moved "${e.nodeId}"`);
                }

                await onSceneEventRef.current(e, curStore);
              }
            } else if (msg.type === 'git_status') {
              setGitBranches(msg.branches);
              setGitCurrentBranch(msg.currentBranch);
              setGitCommits(msg.commits);
              setGitHeadIndex(msg.headIndex);
              setGitSliderIndex(msg.headIndex);
              addEvent(`Git: ${msg.commits.length} commits, branch "${msg.currentBranch}"`);
            } else if (msg.type === 'git_diff_response') {
              setGitDiff({ added: msg.added, modified: msg.modified, deleted: msg.deleted });
              setIsDiffModalOpen(true);
            }
          } catch (parseErr) {
            console.error('Error handling sync message:', parseErr);
          }
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 1500);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [addEvent]);

  const checkoutBranch = useCallback(
    (branch: string) => {
      sendWsMessage({ type: 'checkout_branch', branch });
      setGitCurrentBranch(branch);
      setIsTimeTraveling(false);
    },
    [sendWsMessage]
  );

  const checkoutCommit = useCallback(
    (commitId: string) => {
      setIsTimeTraveling(true);
      sendWsMessage({ type: 'checkout_commit', commitId });
    },
    [sendWsMessage]
  );

  const restoreHead = useCallback(() => {
    setIsTimeTraveling(false);
    setGitSliderIndex(gitHeadIndex);
    sendWsMessage({ type: 'restore_head' });
    addEvent('Restored to HEAD');
  }, [sendWsMessage, gitHeadIndex, addEvent]);

  const requestDiff = useCallback(() => {
    sendWsMessage({ type: 'git_diff_request' });
  }, [sendWsMessage]);

  const importFigma = useCallback(
    (json: string, fileName: string) => {
      sendWsMessage({ type: 'import_figma', json });
      addEvent(`Importing Figma file: ${fileName}`);
    },
    [sendWsMessage, addEvent]
  );

  const importPenpot = useCallback(
    (json: string, fileName: string) => {
      sendWsMessage({ type: 'import_penpot', json });
      addEvent(`Importing Penpot file: ${fileName}`);
    },
    [sendWsMessage, addEvent]
  );

  return {
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
  };
}
