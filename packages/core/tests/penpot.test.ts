import { describe, it, expect } from 'vitest';
import {
  convertPenpotJsonToVitra,
  convertVitraToPenpotJson,
  createDocumentNode,
  createArtboardNode,
  createFrameNode,
  createTextNode,
  InMemorySceneStore,
  ArtboardNode,
  FrameNode,
  TextNode,
} from '../src/index.js';

describe('Penpot Importer & Exporter', () => {
  it('should import a Penpot board with nested frames, typography, and tokens', () => {
    const mockPenpotData = {
      name: 'Penpot Test Project',
      pages: [
        {
          id: 'page-1',
          name: 'Dashboard Page',
          shapes: [
            {
              id: 'penpot-board-1',
              name: 'Analytics Dashboard',
              type: 'board',
              x: 100,
              y: 50,
              width: 1440,
              height: 900,
              fillColor: '#0E1117',
              flexDirection: 'column',
              rowGap: 24,
              paddingTop: 32,
              paddingBottom: 32,
              paddingLeft: 32,
              paddingRight: 32,
              shapes: [
                {
                  id: 'penpot-title',
                  name: 'Page Title',
                  type: 'text',
                  text: 'Cluster Telemetry',
                  fontSize: 24,
                  fontWeight: 700,
                  fillColor: '#58A6FF',
                },
                {
                  id: 'penpot-card',
                  name: 'Stat Card',
                  type: 'frame',
                  width: 320,
                  height: 140,
                  fillColor: '#161B22',
                  strokeColor: '#30363D',
                  strokeWidth: 1,
                  borderRadius: 10,
                  shapes: [
                    {
                      id: 'penpot-metric',
                      name: 'Metric',
                      type: 'text',
                      text: '99.98% Uptime',
                      fontSize: 18,
                      fillColor: '#7EE787',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = convertPenpotJsonToVitra(mockPenpotData, 'Cloud Analytics');
    expect(result.manifestName).toBe('Cloud Analytics');
    expect(result.extractedColors).toContain('#0E1117');
    expect(result.extractedColors).toContain('#58A6FF');
    expect(result.extractedColors).toContain('#161B22');

    const root = result.store.getRoot();
    const children = result.store.getChildren(root.id);
    expect(children.length).toBe(1);

    const board = children[0] as ArtboardNode;
    expect(board.type).toBe('artboard');
    expect(board.name).toBe('Analytics Dashboard');
    expect(board.width).toBe(1440);
    expect(board.height).toBe(900);

    const boardChildren = result.store.getChildren(board.id);
    expect(boardChildren.length).toBe(2);

    const title = boardChildren.find((c) => c.name === 'Page Title') as TextNode | undefined;
    expect(title).toBeDefined();
    expect(title?.type).toBe('text');
    expect(title?.text).toBe('Cluster Telemetry');

    const card = boardChildren.find((c) => c.name === 'Stat Card') as FrameNode | undefined;
    expect(card).toBeDefined();
    expect(card?.type).toBe('frame');
    expect(card?.cornerRadius).toBe(10);

    const cardChildren = result.store.getChildren(card!.id);
    expect(cardChildren.length).toBe(1);
    const metricText = cardChildren[0] as TextNode;
    expect(metricText.text).toBe('99.98% Uptime');
  });

  it('should export a Vitra store into Penpot JSON document format', () => {
    const doc = createDocumentNode({ id: 'root', name: 'Penpot Export Doc' });
    const store = new InMemorySceneStore(doc);

    const artboard = createArtboardNode({
      id: 'ab-penpot',
      name: 'Mobile Screen',
      width: 375,
      height: 812,
      fill: '#181926',
    });
    store.insertNode(artboard, 'root');

    const card = createFrameNode({
      id: 'frm-card',
      name: 'Preview Box',
      width: 320,
      height: 120,
      fill: '#24273A',
      cornerRadius: 8,
    });
    store.insertNode(card, 'ab-penpot');

    const text = createTextNode({
      id: 'txt-1',
      name: 'Label',
      text: 'Exported from Vitra to Penpot',
      fontSize: 16,
    });
    store.insertNode(text, 'frm-card');

    const penpotJson = convertVitraToPenpotJson(store, 'My Exported App');
    expect(penpotJson.name).toBe('My Exported App');
    expect(penpotJson.pages?.[0]?.shapes?.length).toBe(1);

    const boardShape = penpotJson.pages?.[0]?.shapes?.[0];
    expect(boardShape).toBeDefined();
    expect(boardShape?.type).toBe('board');
    expect(boardShape?.name).toBe('Mobile Screen');
    expect(boardShape?.width).toBe(375);
    expect(boardShape?.shapes?.length).toBe(1);

    const frameShape = boardShape?.shapes?.[0];
    expect(frameShape).toBeDefined();
    expect(frameShape?.type).toBe('frame');
    expect(frameShape?.width).toBe(320);
    expect(frameShape?.shapes?.[0]?.type).toBe('text');
    expect(frameShape?.shapes?.[0]?.text).toBe('Exported from Vitra to Penpot');
  });
});
