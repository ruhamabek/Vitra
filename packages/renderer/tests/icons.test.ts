import { describe, it, expect } from 'vitest';
import { resolveIconKey, getSvgIconContent } from '../src/icons.js';

describe('Vitra Icon Resolution Pipeline', () => {
  it('resolves direct Lucide names and prefixes', () => {
    expect(resolveIconKey('search')).toBe('search');
    expect(resolveIconKey('lucide:search')).toBe('search');
    expect(resolveIconKey('shopping-cart')).toBe('shoppingcart');
    expect(resolveIconKey('arrow-up-right')).toBe('arrowupright');
  });

  it('resolves UI synonyms and common aliases', () => {
    expect(resolveIconKey('gear')).toBe('settings');
    expect(resolveIconKey('cog')).toBe('cog');
    expect(resolveIconKey('warning')).toBe('trianglealert');
    expect(resolveIconKey('danger')).toBe('octagonalert');
    expect(resolveIconKey('help')).toBe('circlehelp');
    expect(resolveIconKey('refresh')).toBe('rotatecw');
    expect(resolveIconKey('sync')).toBe('refreshcw');
    expect(resolveIconKey('email')).toBe('mail');
    expect(resolveIconKey('call')).toBe('phone');
    expect(resolveIconKey('mobile')).toBe('smartphone');
    expect(resolveIconKey('magnifier')).toBe('search');
    expect(resolveIconKey('more')).toBe('morehorizontal');
    expect(resolveIconKey('overflow')).toBe('morevertical');
  });

  it('strips UI noise affixes (btn-, ic-, -icon, -outline)', () => {
    expect(resolveIconKey('btn-search-icon')).toBe('search');
    expect(resolveIconKey('ic-settings-outline')).toBe('settings');
    expect(resolveIconKey('shopping-cart-fill')).toBe('shoppingcart');
    expect(resolveIconKey('trash-icon')).toBe('trash');
  });

  it('decomposes compound tokens and semantic phrases', () => {
    expect(resolveIconKey('user_avatar')).toBe('user');
    expect(resolveIconKey('nav-dashboard')).toBe('menu');
    expect(resolveIconKey('button-trash-bin')).toBe('trash');
  });

  it('corrects minor typos with fast fuzzy matching', () => {
    expect(resolveIconKey('calender')).toBe('calendar');
  });

  it('renders SVG path content for resolved icons and placeholder circle for unknowns', () => {
    const searchSvg = getSvgIconContent('search');
    expect(searchSvg).toContain('<circle');
    expect(searchSvg).toContain('<path');

    const warningSvg = getSvgIconContent('warning');
    expect(warningSvg).toContain('<path');

    const unknownSvg = getSvgIconContent('completely_nonexistent_xyz_123');
    expect(unknownSvg).toBe('<circle cx="12" cy="12" r="8"/>');
  });

  it('preserves raw SVG element strings directly', () => {
    const raw = '<path d="M0 0 L10 10"/>';
    expect(getSvgIconContent(raw)).toBe(raw);
  });

  it('resolves diverse real-world domain concepts using official Lucide taxonomy', () => {
    expect(resolveIconKey('invoice')).toBe('receipt');
    expect(resolveIconKey('bill')).toBe('receipt');
    expect(resolveIconKey('speedometer')).toBe('gauge');
    expect(resolveIconKey('pulse')).toBe('activity');
    expect(resolveIconKey('airplane')).toBe('plane');
    expect(resolveIconKey('wheelchair')).toBe('accessibility');
  });
});
