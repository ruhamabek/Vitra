import { describe, it, expect } from 'vitest';
import {
  findMergeBase,
  AgentCommit,
  InMemorySceneStore,
  DocumentNode,
  FrameNode,
  TextNode,
  mergeSceneStores,
  mergeTokens,
  PropertyConflict,
} from '../src/index.js';

describe('Vitra 3-Way AST Merge Engine', () => {
  describe('findMergeBase (DAG Lowest Common Ancestor)', () => {
    it('should find merge base in linear commit sequence', () => {
      const history: AgentCommit[] = [
        {
          id: 'c0',
          parentId: null,
          timestamp: '2026-01-01T00:00:00Z',
          author: { type: 'human' },
          intent: 'Root',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'c1',
          parentId: 'c0',
          timestamp: '2026-01-01T01:00:00Z',
          author: { type: 'human' },
          intent: 'Commit 1',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'c2',
          parentId: 'c1',
          timestamp: '2026-01-01T02:00:00Z',
          author: { type: 'human' },
          intent: 'Commit 2',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
      ];

      expect(findMergeBase(history, 'c1', 'c2')).toBe('c1');
      expect(findMergeBase(history, 'c0', 'c2')).toBe('c0');
      expect(findMergeBase(history, 'c2', 'c2')).toBe('c2');
    });

    it('should find merge base for diverged branches (Y-shaped DAG)', () => {
      const history: AgentCommit[] = [
        {
          id: 'root',
          parentId: null,
          timestamp: '2026-01-01T00:00:00Z',
          author: { type: 'human' },
          intent: 'Initial',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
         {
          id: 'a1',
          parentId: 'root',
          timestamp: '2026-01-01T01:00:00Z',
          author: { type: 'human' },
          intent: 'A1',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'a2',
          parentId: 'a1',
          timestamp: '2026-01-01T02:00:00Z',
          author: { type: 'human' },
          intent: 'A2',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
         {
          id: 'b1',
          parentId: 'root',
          timestamp: '2026-01-01T01:30:00Z',
          author: { type: 'human' },
          intent: 'B1',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
      ];

      expect(findMergeBase(history, 'a2', 'b1')).toBe('root');
    });

    it('should find merge base with multi-parent merge commits (Diamond DAG)', () => {
      const history: AgentCommit[] = [
        {
          id: 'c0',
          parentId: null,
          timestamp: '2026-01-01T00:00:00Z',
          author: { type: 'human' },
          intent: 'Initial',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'c1',
          parentId: 'c0',
          timestamp: '2026-01-01T01:00:00Z',
          author: { type: 'human' },
          intent: 'Branch A',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
        {
          id: 'c2',
          parentId: 'c0',
          timestamp: '2026-01-01T02:00:00Z',
          author: { type: 'human' },
          intent: 'Branch B',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
         {
          id: 'c3',
          parentId: 'c1',
          parentIds: ['c1', 'c2'],
          timestamp: '2026-01-01T03:00:00Z',
          author: { type: 'human' },
          intent: 'Merge B into A',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
         {
          id: 'c4',
          parentId: 'c2',
          timestamp: '2026-01-01T04:00:00Z',
          author: { type: 'human' },
          intent: 'B2',
          changes: { nodesAdded: [], nodesModified: [], nodesDeleted: [], tokensModified: [] },
        },
      ];

       expect(findMergeBase(history, 'c3', 'c4')).toBe('c2');
    });
  });

  describe('mergeSceneStores (3-Way AST Reconciliation)', () => {
    function createInitialDoc(): { root: DocumentNode; container: FrameNode; label: TextNode } {
      const root: DocumentNode = {
        id: 'doc-root',
        type: 'document',
        name: 'Root',
        parentId: null,
        childIds: ['container-1'],
        visible: true,
        locked: false,
      };
      const container: FrameNode = {
        id: 'container-1',
        type: 'frame',
        name: 'Container',
        parentId: 'doc-root',
        childIds: ['label-1'],
        fill: '#FFFFFF',
        stroke: '#CCCCCC',
        cornerRadius: 8,
        sizingHorizontal: 'fixed',
        sizingVertical: 'fixed',
        visible: true,
        locked: false,
      };
      const label: TextNode = {
        id: 'label-1',
        type: 'text',
        name: 'Title',
        parentId: 'container-1',
        text: 'Initial Text',
        fontSize: 16,
        fontWeight: 400,
        fill: '#000000',
        wrap: false,
        sizingHorizontal: 'hug',
        sizingVertical: 'hug',
        visible: true,
        locked: false,
      };
      return { root, container, label };
    }

    it('should cleanly merge independent property changes on the same node', () => {
       const { root: bRoot, container: bCont, label: bLabel } = createInitialDoc();
      const baseStore = new InMemorySceneStore(bRoot);
      baseStore.insertNode(bCont, 'doc-root');
      baseStore.insertNode(bLabel, 'container-1');

       const { root: oRoot, container: oCont, label: oLabel } = createInitialDoc();
      const ourStore = new InMemorySceneStore(oRoot);
      oCont.fill = '#1E1E2E';
      ourStore.insertNode(oCont, 'doc-root');
      ourStore.insertNode(oLabel, 'container-1');

       const { root: tRoot, container: tCont, label: tLabel } = createInitialDoc();
      const theirStore = new InMemorySceneStore(tRoot);
      tCont.stroke = '#89B4FA';
      tCont.cornerRadius = 16;
      tLabel.text = 'Updated Title';
      theirStore.insertNode(tCont, 'doc-root');
      theirStore.insertNode(tLabel, 'container-1');

      const result = mergeSceneStores(baseStore, ourStore, theirStore);
      expect(result.conflicts).toHaveLength(0);

      const mergedCont = result.store.getNode('container-1') as FrameNode;
      expect(mergedCont.fill).toBe('#1E1E2E'); // from ours
      expect(mergedCont.stroke).toBe('#89B4FA'); // from theirs
      expect(mergedCont.cornerRadius).toBe(16); // from theirs

      const mergedLabel = result.store.getNode('label-1') as TextNode;
      expect(mergedLabel.text).toBe('Updated Title'); // from theirs
    });

    it('should detect conflicting edits on the same scalar property', () => {
      const { root: bRoot, container: bCont } = createInitialDoc();
      const baseStore = new InMemorySceneStore(bRoot);
      baseStore.insertNode(bCont, 'doc-root');

       const { root: oRoot, container: oCont } = createInitialDoc();
      oCont.fill = '#FF007F';
      const ourStore = new InMemorySceneStore(oRoot);
      ourStore.insertNode(oCont, 'doc-root');

       const { root: tRoot, container: tCont } = createInitialDoc();
      tCont.fill = '#0070F3';
      const theirStore = new InMemorySceneStore(tRoot);
      theirStore.insertNode(tCont, 'doc-root');

      const result = mergeSceneStores(baseStore, ourStore, theirStore);
      expect(result.conflicts.length).toBeGreaterThanOrEqual(1);

      const propConflict = result.conflicts.find(
        (c): c is PropertyConflict => c.type === 'property' && c.property === 'fill'
      );
      expect(propConflict).toBeDefined();
      expect(propConflict?.ourValue).toBe('#FF007F');
      expect(propConflict?.theirValue).toBe('#0070F3');
      expect(propConflict?.baseValue).toBe('#FFFFFF');
    });

    it('should merge node additions from both branches', () => {
      const { root: bRoot, container: bCont } = createInitialDoc();
      const baseStore = new InMemorySceneStore(bRoot);
      baseStore.insertNode(bCont, 'doc-root');

       const { root: oRoot, container: oCont } = createInitialDoc();
      const ourStore = new InMemorySceneStore(oRoot);
      ourStore.insertNode(oCont, 'doc-root');
      ourStore.insertNode(
        {
          id: 'btn-ours',
          type: 'frame',
          name: 'Button Ours',
          parentId: 'container-1',
          childIds: [],
          visible: true,
          locked: false,
          cornerRadius: 4,
          sizingHorizontal: 'fixed',
          sizingVertical: 'fixed',
        } as FrameNode,
        'container-1'
      );

       const { root: tRoot, container: tCont } = createInitialDoc();
      const theirStore = new InMemorySceneStore(tRoot);
      theirStore.insertNode(tCont, 'doc-root');
      theirStore.insertNode(
        {
          id: 'badge-theirs',
          type: 'frame',
          name: 'Badge Theirs',
          parentId: 'container-1',
          childIds: [],
          visible: true,
          locked: false,
          cornerRadius: 4,
          sizingHorizontal: 'fixed',
          sizingVertical: 'fixed',
        } as FrameNode,
        'container-1'
      );

      const result = mergeSceneStores(baseStore, ourStore, theirStore);
      expect(result.conflicts).toHaveLength(0);
      expect(result.store.getNode('btn-ours')).toBeDefined();
      expect(result.store.getNode('badge-theirs')).toBeDefined();

      const mergedContainer = result.store.getNode('container-1') as FrameNode;
      expect(mergedContainer.childIds).toContain('btn-ours');
      expect(mergedContainer.childIds).toContain('badge-theirs');
    });

    it('should cleanly apply node deletions if untouched in other branch', () => {
      const { root: bRoot, container: bCont, label: bLabel } = createInitialDoc();
      const baseStore = new InMemorySceneStore(bRoot);
      baseStore.insertNode(bCont, 'doc-root');
      baseStore.insertNode(bLabel, 'container-1');

       const { root: oRoot, container: oCont } = createInitialDoc();
      const ourStore = new InMemorySceneStore(oRoot);
      ourStore.insertNode(oCont, 'doc-root'); // label-1 is omitted/deleted

       const { root: tRoot, container: tCont, label: tLabel } = createInitialDoc();
      tCont.cornerRadius = 24;
      const theirStore = new InMemorySceneStore(tRoot);
      theirStore.insertNode(tCont, 'doc-root');
      theirStore.insertNode(tLabel, 'container-1');

      const result = mergeSceneStores(baseStore, ourStore, theirStore);
      expect(result.conflicts).toHaveLength(0);
      expect(result.store.getNode('label-1')).toBeUndefined();
      expect((result.store.getNode('container-1') as FrameNode).cornerRadius).toBe(24);
      expect((result.store.getNode('container-1') as FrameNode).childIds).not.toContain('label-1');
    });
  });

  describe('mergeTokens (3-Way Design Token Merge)', () => {
    it('should merge non-conflicting token edits across categories', () => {
      const baseTokens = {
        color: {
          primary: { $value: '#000000', $type: 'color' },
          secondary: { $value: '#666666', $type: 'color' },
        },
        spacing: {
          sm: { $value: '8px', $type: 'dimension' },
        },
      };

       const ourTokens = {
        color: {
          primary: { $value: '#10B981', $type: 'color' },
          secondary: { $value: '#666666', $type: 'color' },
        },
        spacing: {
          sm: { $value: '8px', $type: 'dimension' },
        },
      };

       const theirTokens = {
        color: {
          primary: { $value: '#000000', $type: 'color' },
          secondary: { $value: '#666666', $type: 'color' },
          accent: { $value: '#8B5CF6', $type: 'color' },
        },
        spacing: {
          sm: { $value: '12px', $type: 'dimension' },
        },
      };

      interface MergedTokens {
        color: {
          primary: { $value: string; $type?: string };
          secondary?: { $value: string; $type?: string };
          accent: { $value: string; $type?: string };
        };
        spacing: {
          sm: { $value: string; $type?: string };
        };
      }

      const result = mergeTokens<MergedTokens>(baseTokens, ourTokens, theirTokens);
      expect(result.conflicts).toHaveLength(0);
      expect(result.tokens.color.primary.$value).toBe('#10B981'); // from ours
      expect(result.tokens.color.accent.$value).toBe('#8B5CF6'); // from theirs
      expect(result.tokens.spacing.sm.$value).toBe('12px'); // from theirs
    });

    it('should detect conflicting token edits', () => {
      const baseTokens = {
        color: {
          primary: { $value: '#000000', $type: 'color' },
        },
      };
      const ourTokens = {
        color: {
          primary: { $value: '#10B981', $type: 'color' },
        },
      };
      const theirTokens = {
        color: {
          primary: { $value: '#EF4444', $type: 'color' },
        },
      };

      const result = mergeTokens(baseTokens, ourTokens, theirTokens);
      expect(result.conflicts).toHaveLength(1);
      const conflict = result.conflicts[0];
      expect(conflict).toBeDefined();
      expect(conflict?.type).toBe('token');
      if (conflict?.type === 'token') {
        expect(conflict.path).toBe('color.primary.$value');
        expect(conflict.ourValue).toBe('#10B981');
        expect(conflict.theirValue).toBe('#EF4444');
      }
    });
  });
});
