import { describe, it, expect } from 'vitest';
import {
  convertFigmaJsonToVitra,
  convertVitraToFigmaJson,
  createDocumentNode,
  createArtboardNode,
  createTextNode,
  createShapeNode,
  InMemorySceneStore,
  FigmaDocumentResponse,
  ArtboardNode,
  FrameNode,
  TextNode,
  ShapeNode,
} from '../src/index.js';

describe('Figma Importer & Exporter', () => {
  describe('convertFigmaJsonToVitra', () => {
    it('should convert Figma REST API response into a Vitra scene store', () => {
      const mockFigmaResponse: FigmaDocumentResponse = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '0:1',
              name: 'Page 1',
              type: 'CANVAS',
              children: [
                {
                  id: '1:2',
                  name: 'Hero Artboard',
                  type: 'FRAME',
                  absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
                  layoutMode: 'VERTICAL',
                  itemSpacing: 24,
                  paddingLeft: 32,
                  paddingRight: 32,
                  paddingTop: 48,
                  paddingBottom: 48,
                  fills: [
                    {
                      type: 'SOLID',
                      color: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
                    },
                  ],
                  children: [
                    {
                      id: '1:3',
                      name: 'Heading Title',
                      type: 'TEXT',
                      characters: 'Welcome to Vitra',
                      style: {
                        fontSize: 32,
                        fontWeight: 700,
                        lineHeightPx: 40,
                      },
                      fills: [
                        {
                          type: 'SOLID',
                          color: { r: 1, g: 1, b: 1 },
                        },
                      ],
                    },
                    {
                      id: '1:4',
                      name: 'CTA Button',
                      type: 'FRAME',
                      layoutMode: 'HORIZONTAL',
                      itemSpacing: 8,
                      cornerRadius: 8,
                      fills: [
                        {
                          type: 'SOLID',
                          color: { r: 0.38, g: 0.49, b: 0.98 },
                        },
                      ],
                      children: [
                        {
                          id: '1:5',
                          name: 'Button Label',
                          type: 'TEXT',
                          characters: 'Get Started',
                          style: {
                            fontSize: 14,
                            fontWeight: 600,
                          },
                        },
                      ],
                    },
                    {
                      id: '1:6',
                      name: 'Avatar Icon',
                      type: 'ELLIPSE',
                      absoluteBoundingBox: { x: 0, y: 0, width: 48, height: 48 },
                      fills: [
                        {
                          type: 'SOLID',
                          color: { r: 0.8, g: 0.2, b: 0.3 },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = convertFigmaJsonToVitra(mockFigmaResponse, 'Sample Figma App');
      expect(result.manifestName).toBe('Sample Figma App');
      expect(result.store).toBeDefined();

      const root = result.store.getRoot();
      const topChildren = result.store.getChildren(root.id);
      expect(topChildren.length).toBe(1);

      const artboard = topChildren[0] as ArtboardNode;
      expect(artboard.type).toBe('artboard');
      expect(artboard.name).toBe('Hero Artboard');
      expect(artboard.width).toBe(1440);
      expect(artboard.height).toBe(900);
      expect(artboard.layout?.direction).toBe('vertical');
      expect(artboard.layout?.gap).toBe(24);

      const artboardChildren = result.store.getChildren(artboard.id);
      expect(artboardChildren.length).toBe(3);

      const heading = artboardChildren.find((c) => c.name === 'Heading Title') as TextNode;
      expect(heading).toBeDefined();
      expect(heading.type).toBe('text');
      expect(heading.text).toBe('Welcome to Vitra');
      expect(heading.fontSize).toBe(32);
      expect(heading.fontWeight).toBe(700);

      const button = artboardChildren.find((c) => c.name === 'CTA Button') as FrameNode;
      expect(button).toBeDefined();
      expect(button.type).toBe('frame');
      expect(button.cornerRadius).toBe(8);
      expect(button.layout?.direction).toBe('horizontal');

      const buttonChildren = result.store.getChildren(button.id);
      expect(buttonChildren.length).toBe(1);
      const buttonText = buttonChildren[0] as TextNode;
      expect(buttonText.text).toBe('Get Started');

      const avatar = artboardChildren.find((c) => c.name === 'Avatar Icon') as ShapeNode;
      expect(avatar).toBeDefined();
      expect(avatar.type).toBe('shape');
      expect(avatar.shapeType).toBe('ellipse');
      expect(avatar.width).toBe(48);
      expect(avatar.height).toBe(48);

      expect(result.extractedColors.length).toBeGreaterThan(0);
    });

    it('should support Figma response format with nodes map', () => {
      const mockNodesResponse: FigmaDocumentResponse = {
        nodes: {
          '0:1': {
            document: {
              id: '0:1',
              name: 'Card',
              type: 'FRAME',
              absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 200 },
              children: [],
            },
          },
        },
      };

      const result = convertFigmaJsonToVitra(mockNodesResponse, 'Nodes Format Test');
      const root = result.store.getRoot();
      const children = result.store.getChildren(root.id);
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('Card');
    });
  });

  describe('convertVitraToFigmaJson', () => {
    it('should export a Vitra store into valid Figma REST API JSON structure', () => {
      const doc = createDocumentNode({ id: 'root', name: 'Export Test Doc' });
      const store = new InMemorySceneStore(doc);

      const artboard = createArtboardNode({
        id: 'ab-1',
        name: 'Mobile Screen',
        width: 375,
        height: 812,
        fill: '#181926',
        layout: {
          direction: 'vertical',
          gap: 16,
          padding: { top: 20, right: 16, bottom: 20, left: 16 },
          alignItems: 'start',
          justifyContent: 'start',
        },
      });
      store.insertNode(artboard, 'root');

      const text = createTextNode({
        id: 'txt-1',
        name: 'Header',
        text: 'Hello Figma',
        fontSize: 24,
        fontWeight: 600,
        fill: '#FFFFFF',
      });
      store.insertNode(text, 'ab-1');

      const shape = createShapeNode({
        id: 'shp-1',
        name: 'Badge Shape',
        shapeType: 'rectangle',
        width: 100,
        height: 32,
        cornerRadius: 6,
        fill: '#89B4FA',
      });
      store.insertNode(shape, 'ab-1');

      const figmaData = convertVitraToFigmaJson(store, 'My Vitra App');
      expect(figmaData.name).toBe('My Vitra App');
      expect(figmaData.document.type).toBe('DOCUMENT');
      expect(figmaData.document.children?.[0]?.type).toBe('CANVAS');

      const exportedArtboard = figmaData.document.children?.[0]?.children?.[0];
      expect(exportedArtboard).toBeDefined();
      expect(exportedArtboard?.type).toBe('FRAME');
      expect(exportedArtboard?.name).toBe('Mobile Screen');
      expect(exportedArtboard?.layoutMode).toBe('VERTICAL');
      expect(exportedArtboard?.itemSpacing).toBe(16);
      expect(exportedArtboard?.children?.length).toBe(2);

      const exportedText = exportedArtboard?.children?.find((c) => c.name === 'Header');
      expect(exportedText?.type).toBe('TEXT');
      expect(exportedText?.characters).toBe('Hello Figma');
      expect(exportedText?.style?.fontSize).toBe(24);

      const exportedShape = exportedArtboard?.children?.find((c) => c.name === 'Badge Shape');
      expect(exportedShape?.type).toBe('RECTANGLE');
      expect(exportedShape?.cornerRadius).toBe(6);
    });
  });
});
