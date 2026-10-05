import { describe, it, expect } from 'vitest';
import { HistoryManager, AgentCommit } from '../src/history.js';

describe('HistoryManager (Agent-Native History Engine)', () => {
  it('should initialize empty and allow recording agent commits', () => {
    const history = new HistoryManager();
    expect(history.getLog()).toHaveLength(0);
    expect(history.getHead()).toBeUndefined();

    const commit1: AgentCommit = {
      id: 'c-001',
      parentId: null,
      timestamp: new Date().toISOString(),
      author: {
        type: 'human',
        name: 'Ruhama',
      },
      intent: 'Initial project setup with desktop artboard',
      changes: {
        nodesAdded: ['root', 'artboard-desktop'],
        nodesModified: [],
        nodesDeleted: [],
        tokensModified: [],
      },
    };

    history.addCommit(commit1);
    expect(history.getLog()).toHaveLength(1);
    expect(history.getHead()?.id).toBe('c-001');
    expect(history.getCommit('c-001')?.intent).toBe('Initial project setup with desktop artboard');
  });

  it('should record sequential agent iterations with rationale and parent link', () => {
    const history = new HistoryManager();

    const c1: AgentCommit = {
      id: 'c-001',
      parentId: null,
      timestamp: '2026-09-19T08:00:00Z',
      author: { type: 'human', name: 'Ruhama' },
      intent: 'Base layout',
      changes: { nodesAdded: ['card'], nodesModified: [], nodesDeleted: [], tokensModified: [] },
    };
    history.addCommit(c1);

    const c2: AgentCommit = {
      id: 'c-002',
      parentId: 'c-001',
      timestamp: '2026-09-19T08:05:00Z',
      author: {
        type: 'agent',
        model: 'claude-3-7-sonnet',
        client: 'claude-code',
      },
      intent: 'Redesign user dock and improve spacing',
      rationale: 'Shifted user text to the left next to avatar and reduced subtitle gap for visual compactness.',
      changes: {
        nodesAdded: [],
        nodesModified: ['sx-d-user-dock', 'sx-d-user-info'],
        nodesDeleted: [],
        tokensModified: [],
      },
    };
    history.addCommit(c2);

    expect(history.getHead()?.id).toBe('c-002');
    expect(history.getHead()?.parentId).toBe('c-001');
    expect(history.getHead()?.author.model).toBe('claude-3-7-sonnet');
    expect(history.getHead()?.rationale).toContain('Shifted user text');
  });

  it('should serialize and deserialize history cleanly', () => {
    const history = new HistoryManager();
    history.addCommit({
      id: 'c-1',
      parentId: null,
      timestamp: '2026-09-19T08:00:00Z',
      author: { type: 'human', name: 'Dev' },
      intent: 'Init',
      changes: { nodesAdded: ['root'], nodesModified: [], nodesDeleted: [], tokensModified: [] },
    });

    const json = history.toJSON();
    const restored = HistoryManager.fromJSON(json);

    expect(restored.getLog()).toHaveLength(1);
    expect(restored.getHead()?.id).toBe('c-1');
  });
});
