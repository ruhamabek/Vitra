import { describe, it, expect } from 'vitest';
import {
  mapVitraLayoutToPenpot,
  mapVitraFillsToPenpot,
  mapVitraStrokesToPenpot,
  mapVitraSizingToPenpot,
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
});

