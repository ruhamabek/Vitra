import * as lucide from 'lucide';

type LucideIconNode = [string, Record<string, string | number | boolean>];

 const LUCIDE_INDEX = new Map<string, Array<LucideIconNode>>();

for (const [key, val] of Object.entries(lucide)) {
  if (Array.isArray(val)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    LUCIDE_INDEX.set(cleanKey, val as Array<LucideIconNode>);
  }
}

// Common aliases mapping popular shorthand or alternative names to Lucide icon keys
const ICON_ALIASES: Record<string, string> = {
  cart: 'shoppingcart',
  shopping_cart: 'shoppingcart',
  'shopping-cart': 'shoppingcart',
  close: 'x',
  cancel: 'x',
  cross: 'x',
  trash: 'trash2',
  delete: 'trash2',
  edit: 'pencil',
  modify: 'pencil',
  check_double: 'checkcheck',
  'check-double': 'checkcheck',
  hamburger: 'menu',
  nav: 'menu',
  home: 'house',
  profile: 'user',
  account: 'user',
  avatar: 'user',
  like: 'heart',
  favorite: 'heart',
  rating: 'star',
  chat: 'messagesquare',
  message: 'messagesquare',
  comment: 'messagesquare',
  folder_open: 'folderopen',
  'folder-open': 'folderopen',
  attachment: 'paperclip',
  clip: 'paperclip',
  audio: 'headphones',
  send_message: 'send',
  logout: 'logout',
  log_out: 'logout',
};

/**
 * Resolves any Lucide icon name, alias, or raw SVG into a standardized Penpot-ready SVG string.
 */
export function getSvgForIcon(
  iconName?: string,
  color: string = '#708499',
  size: number = 20,
  rawSvg?: string
): string | null {
   if (rawSvg && (rawSvg.includes('<path') || rawSvg.includes('<svg') || rawSvg.includes('<polygon') || rawSvg.includes('<circle') || rawSvg.includes('<line'))) {
    if (rawSvg.trim().startsWith('<svg')) {
      return rawSvg;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${rawSvg}</svg>`;
  }

  if (!iconName) return null;

   if (iconName.trim().startsWith('<svg')) {
    return iconName;
  }
  if (iconName.includes('<path') || iconName.includes('<line') || iconName.includes('<polygon') || iconName.includes('<circle')) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${iconName}</svg>`;
  }

   let clean = iconName.toLowerCase().replace(/^lucide:/, '').replace(/^feather:/, '').trim();
  const aliasClean = clean.replace(/[^a-z0-9]/g, '');

  if (ICON_ALIASES[clean] || ICON_ALIASES[aliasClean]) {
    clean = ICON_ALIASES[clean] || ICON_ALIASES[aliasClean];
  } else {
    clean = aliasClean;
  }

   const elements = LUCIDE_INDEX.get(clean);
  if (elements && Array.isArray(elements)) {
    const innerXml = elements
      .map(([tag, attrs]) => {
        const attrStr = Object.entries(attrs || {})
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        return `<${tag} ${attrStr}/>`;
      })
      .join('');

    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${innerXml}</svg>`;
  }

  return null;
}
