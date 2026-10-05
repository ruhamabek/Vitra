import { DocumentNode, FrameNode, ArtboardNode, SceneNode } from "./nodes.js";


export type SceneEvent =
  | { type: 'insert'; nodeId: string; parentId: string; node: SceneNode }
  | { type: 'update'; nodeId: string; patch: Partial<SceneNode> }
  | { type: 'delete'; nodeId: string }
  | { type: 'move'; nodeId: string; newParentId: string; index?: number };

export type SceneListener = (event: SceneEvent) => void;

export interface SceneSnapshot {
  rootId: string;
  nodes: Record<string, SceneNode>;
}

export interface ISceneStore {
  getRoot(): DocumentNode;
  getNode(id: string): SceneNode | undefined;
  getChildren(parentId: string): SceneNode[];
  insertNode(node: SceneNode, parentId: string, index?: number): void;
  updateNode(id: string, patch: Partial<SceneNode>): void;
  deleteNode(id: string): void;
  moveNode(id: string, newParentId: string, index?: number): void;
  subscribe(listener: SceneListener): () => void;
  exportSnapshot(): SceneSnapshot;
  importSnapshot(snapshot: SceneSnapshot): void;
}

export class InMemorySceneStore implements ISceneStore {
  private nodes = new Map<string, SceneNode>();
  private rootId: string;
  private listeners = new Set<SceneListener>();

  constructor(root: DocumentNode) {
    this.rootId = root.id;
    this.nodes.set(root.id, root);
  }

  subscribe(listener: SceneListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: SceneEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getRoot(): DocumentNode {
    const root = this.nodes.get(this.rootId);
    if (!root || root.type !== 'document') {
      throw new Error(`Root document node "${this.rootId}" not found in store.`);
    }
    return root;
  }

  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  getChildren(parentId: string): SceneNode[] {
    const parent = this.nodes.get(parentId);
    if (!parent) return [];
    if (parent.type !== 'document' && parent.type !== 'frame' && parent.type !== 'artboard') return [];
    if (!parent.childIds) return [];

    return parent.childIds
      .map(childId => this.nodes.get(childId))
      .filter((n): n is SceneNode => n !== undefined);
  }

  insertNode(node: SceneNode, parentId: string, index?: number): void {
    const parent = this.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent node "${parentId}" not found.`);
    }
    if (parent.type !== 'document' && parent.type !== 'frame' && parent.type !== 'artboard') {
      throw new Error(`Cannot insert child into node "${parentId}" of type "${parent.type}".`);
    }

    const updatedChild = { ...node, parentId };
    this.nodes.set(node.id, updatedChild);

    const newChildIds = parent.childIds.filter(id => id !== node.id);
    if (typeof index === 'number' && index >= 0 && index <= newChildIds.length) {
      newChildIds.splice(index, 0, node.id);
    } else {
      newChildIds.push(node.id);
    }

    this.nodes.set(parentId, {
      ...parent,
      childIds: newChildIds,
    });

    this.emit({ type: 'insert', nodeId: node.id, parentId, node: updatedChild });
  }

  updateNode(id: string, patch: Partial<SceneNode>): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node "${id}" not found.`);
    }

    const updated = { ...node, ...patch } as SceneNode;
    this.nodes.set(id, updated);
    this.emit({ type: 'update', nodeId: id, patch });
  }

  deleteNode(id: string): void {
    const target = this.nodes.get(id);
    if (!target) return;
    if (target.id === this.rootId) {
      throw new Error('Cannot delete root document node.');
    }

    if (target.parentId) {
      const parent = this.nodes.get(target.parentId);
      if (parent && (parent.type === 'document' || parent.type === 'frame' || parent.type === 'artboard')) {
        this.nodes.set(parent.id, {
          ...parent,
          childIds: parent.childIds.filter(cid => cid !== id),
        });
      }
    }

    if (target.type === 'document' || target.type === 'frame' || target.type === 'artboard') {
      for (const childId of target.childIds) {
        this.deleteNode(childId);
      }
    }

    this.nodes.delete(id);
    this.emit({ type: 'delete', nodeId: id });
  }

  moveNode(id: string, newParentId: string, index?: number): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node "${id}" not found.`);
    }
    if (node.id === this.rootId) {
      throw new Error('Cannot move root document node.');
    }

    const newParent = this.nodes.get(newParentId);
    if (!newParent) {
      throw new Error(`Target parent node "${newParentId}" not found.`);
    }
    if (newParent.type !== 'document' && newParent.type !== 'frame' && newParent.type !== 'artboard') {
      throw new Error(`Cannot move node into target "${newParentId}" of type "${newParent.type}".`);
    }

    if (node.parentId) {
      const oldParent = this.nodes.get(node.parentId);
      if (oldParent && (oldParent.type === 'document' || oldParent.type === 'frame' || oldParent.type === 'artboard')) {
        this.nodes.set(oldParent.id, {
          ...oldParent,
          childIds: oldParent.childIds.filter(cid => cid !== id),
        });
      }
    }

    const targetParent = (this.nodes.get(newParentId) as DocumentNode | FrameNode | ArtboardNode) || newParent;
    const newChildIds = targetParent.childIds.filter((cid: string) => cid !== id);
    if (typeof index === 'number' && index >= 0 && index <= newChildIds.length) {
      newChildIds.splice(index, 0, id);
    } else {
      newChildIds.push(id);
    }

    this.nodes.set(targetParent.id, {
      ...targetParent,
      childIds: newChildIds,
    });

    this.nodes.set(id, {
      ...node,
      parentId: newParentId,
    });

    this.emit({ type: 'move', nodeId: id, newParentId, index });
  }

  exportSnapshot(): { rootId: string; nodes: Record<string, SceneNode> } {
    const nodesObj: Record<string, SceneNode> = {};
    for (const [id, node] of this.nodes.entries()) {
      nodesObj[id] = node;
    }
    return {
      rootId: this.rootId,
      nodes: nodesObj,
    };
  }

  importSnapshot(snapshot: SceneSnapshot): void {
    const rootNode = snapshot.nodes[snapshot.rootId];
    if (!rootNode || rootNode.type !== 'document') {
      throw new Error(`Invalid snapshot: root node "${snapshot.rootId}" is missing or not a document.`);
    }
    this.nodes.clear();
    this.rootId = snapshot.rootId;
    for (const [id, node] of Object.entries(snapshot.nodes)) {
      this.nodes.set(id, node);
    }
  }

  static fromSnapshot(snapshot: SceneSnapshot): InMemorySceneStore {
    const rootNode = snapshot.nodes[snapshot.rootId];
    if (!rootNode || rootNode.type !== 'document') {
      throw new Error(`Invalid snapshot: root node "${snapshot.rootId}" is missing or not a document.`);
    }
    const store = new InMemorySceneStore(rootNode as DocumentNode);
    for (const [id, node] of Object.entries(snapshot.nodes)) {
      if (id !== snapshot.rootId) {
        store.nodes.set(id, node);
      }
    }
    return store;
  }
}