import { describe, it, expect } from 'vitest';
import {
  mapVitraLayoutToPenpot,
  mapVitraFillsToPenpot,
  mapVitraStrokesToPenpot,
  mapVitraSizingToPenpot,
  getPageTopLevelShapes,
  serializePenpotShape,
} from '../src/penpot-adapter.js';

describe('Penpot Adapter', () => {
  it('maps Vitra AutoLayout to Penpot flex layout properties', () => {
    const penpotLayout = mapVitraLayoutToPenpot({
      direction: 'vertical',
      gap: 16,
      padding: { top: 10, right: 20, bottom: 10, left: 20 },
      alignItems: 'center',
      justifyContent: 'space-between',
    });

    expect(penpotLayout).toEqual({
      layout: 'flex',
      flexDirection: 'column',
      rowGap: 16,
      columnGap: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      paddingRight: 20,
      paddingBottom: 10,
      paddingLeft: 20,
    });
  });

  it('maps horizontal layout direction to row flex direction', () => {
    const penpotLayout = mapVitraLayoutToPenpot({
      direction: 'horizontal',
      gap: 8,
      alignItems: 'start',
      justifyContent: 'start',
    });

    expect(penpotLayout?.flexDirection).toBe('row');
    expect(penpotLayout?.rowGap).toBe(8);
    expect(penpotLayout?.columnGap).toBe(8);
  });

  it('maps fills and strokes to Penpot colors', () => {
    const fills = mapVitraFillsToPenpot('#0066FF');
    expect(fills.fillColor).toBe('#0066FF');

    const strokes = mapVitraStrokesToPenpot('#FFFFFF', 2);
    expect(strokes.strokeColor).toBe('#FFFFFF');
    expect(strokes.strokeWidth).toBe(2);
  });

  it('maps Vitra sizing enums to Penpot child sizing deterministically', () => {
    const parentColumn = mapVitraLayoutToPenpot({ direction: 'vertical', alignItems: 'stretch' });
    const parentRow = mapVitraLayoutToPenpot({ direction: 'horizontal', alignItems: 'center' });

     const hugBadge = { id: 'bot-badge', sizingHorizontal: 'hug', sizingVertical: 'hug' };
    expect(mapVitraSizingToPenpot(hugBadge, parentRow)).toEqual({
      horizontalSizing: 'auto',
      verticalSizing: 'auto',
    });

     const fillCard = { id: 'card', sizingHorizontal: 'fill', sizingVertical: 'fixed', height: 200 };
    expect(mapVitraSizingToPenpot(fillCard, parentColumn)).toEqual({
      horizontalSizing: 'fill',
      verticalSizing: 'fix',
    });

     const fixedAvatar = { id: 'avatar', width: 36, height: 36 };
    expect(mapVitraSizingToPenpot(fixedAvatar, parentRow)).toEqual({
      horizontalSizing: 'fix',
      verticalSizing: 'fix',
    });

     const wrapText = { id: 'msg', type: 'text', wrap: true };
    expect(mapVitraSizingToPenpot(wrapText, parentColumn)).toEqual({
      horizontalSizing: 'fill',
      verticalSizing: 'auto',
    });
  });

  it('retrieves top-level shapes from Penpot currentPage.root.children', () => {
    const mockBoard = { id: 'board-1', name: 'Desktop Preview', type: 'board' };
    const mockPenpot = {
      currentPage: {
        id: 'page-1',
        name: 'Page 1',
        root: {
          id: 'root-shape',
          children: [mockBoard],
        },
      },
    };

    const shapes = getPageTopLevelShapes(mockPenpot as any);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].name).toBe('Desktop Preview');
  });

  it('falls back to findShapes when root.children is empty', () => {
    const mockBoard = { id: 'board-mobile', name: 'Mobile Preview', type: 'board' };
    const mockPenpot = {
      currentPage: {
        id: 'page-2',
        findShapes: (criteria?: any) => {
          if (criteria?.type === 'board') return [mockBoard];
          return [mockBoard];
        },
      },
    };

    const shapes = getPageTopLevelShapes(mockPenpot as any);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].id).toBe('board-mobile');
  });

  it('serializes Penpot native shapes with children, shapes, and color fallbacks', () => {
    const nativeBoard = {
      id: 'board-hero',
      name: 'Hero Section',
      type: 'board',
      width: 1440,
      height: 900,
      fills: [{ fillColor: '#0F172A' }],
      children: [
        {
          id: 'title-node',
          name: 'Title',
          type: 'text',
          characters: 'Build Fast',
          fontSize: 32,
          fills: [{ fillColor: '#FFFFFF' }],
        },
      ],
    };

    const serialized = serializePenpotShape(nativeBoard as any);
    expect(serialized.id).toBe('board-hero');
    expect(serialized.fillColor).toBe('#0F172A');
    expect(serialized.children).toHaveLength(1);
    expect(serialized.shapes).toHaveLength(1);
    expect(serialized.children?.[0].characters).toBe('Build Fast');
  });
});

