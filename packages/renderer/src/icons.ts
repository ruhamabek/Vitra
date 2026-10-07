import * as lucide from 'lucide';
import { LUCIDE_TAGS } from './lucide-tags.js';

type LucideElement = [string, Record<string, string | number>];

const LUCIDE_INDEX = new Map<string, LucideElement[]>();

const BY_LENGTH = new Map<number, string[]>();

const WORD_TO_LUCIDE = new Map<string, string>();

for (const [key, val] of Object.entries(lucide)) {
  if (Array.isArray(val)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    LUCIDE_INDEX.set(cleanKey, val as LucideElement[]);

    const len = cleanKey.length;
    if (!BY_LENGTH.has(len)) BY_LENGTH.set(len, []);
    BY_LENGTH.get(len)!.push(cleanKey);

    const words = key
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .split('-');

    for (const w of words) {
      if (w.length < 3) continue;
      if (!WORD_TO_LUCIDE.has(w)) {
        WORD_TO_LUCIDE.set(w, cleanKey);
      }
    }
  }
}

/**
 * Common design system, product UI, and natural language synonyms.
 */
const RESOLUTION_CACHE = new Map<string, string | null>();

/**
 * Resolves an arbitrary user/LLM input string into a valid Lucide icon key.
 */
export function resolveIconKey(rawName: string): string | null {
  if (!rawName) return null;
  if (RESOLUTION_CACHE.has(rawName)) {
    return RESOLUTION_CACHE.get(rawName) ?? null;
  }

  let s = rawName.toLowerCase().trim().replace(/^lucide:/, "");
  let clean = s.replace(/[^a-z0-9]/g, "");

  if (LUCIDE_INDEX.has(clean)) {
    RESOLUTION_CACHE.set(rawName, clean);
    return clean;
  }

  s = s.replace(/^(icon|ic|btn|button)[-_.]/, "");
  s = s.replace(/[-_.](icon|btn|button|outline|fill|line|solid)$/, "");
  clean = s.replace(/[^a-z0-9]/g, "");

  if (LUCIDE_INDEX.has(clean)) {
    RESOLUTION_CACHE.set(rawName, clean);
    return clean;
  }

  if (LUCIDE_TAGS[s]) {
    const target = LUCIDE_TAGS[s]!;
    RESOLUTION_CACHE.set(rawName, target);
    return target;
  }

  if (LUCIDE_TAGS[clean]) {
    const target = LUCIDE_TAGS[clean]!;
    if (LUCIDE_INDEX.has(target)) {
      RESOLUTION_CACHE.set(rawName, target);
      return target;
    }
  }

  const tokens = s.split(/[-_.\/\s]+/).filter((t) => t.length >= 2);
  for (const t of tokens) {
    if (LUCIDE_INDEX.has(t)) {
      RESOLUTION_CACHE.set(rawName, t);
      return t;
    }
    if (LUCIDE_TAGS[t]) {
      const target = LUCIDE_TAGS[t]!;
      if (LUCIDE_INDEX.has(target)) {
        RESOLUTION_CACHE.set(rawName, target);
        return target;
      }
    }
    if (WORD_TO_LUCIDE.has(t)) {
      const candidate = WORD_TO_LUCIDE.get(t)!;
      RESOLUTION_CACHE.set(rawName, candidate);
      return candidate;
    }
  }

  const len = clean.length;
  if (len >= 4) {
    for (let l = len - 1; l <= len + 1; l++) {
      const candidates = BY_LENGTH.get(l);
      if (!candidates) continue;
      for (const c of candidates) {
        if (clean.length === c.length) {
          let diff = 0;
          for (let k = 0; k < len; k++) {
            if (clean[k] !== c[k]) diff++;
            if (diff > 1) break;
          }
          if (diff === 1) {
            RESOLUTION_CACHE.set(rawName, c);
            return c;
          }
        }
      }
    }
  }

  RESOLUTION_CACHE.set(rawName, null);
  return null;
}

export function getSvgIconContent(iconName: string): string {
  if (!iconName) return `<circle cx="12" cy="12" r="8"/>`;

  if (iconName.includes('<path') || iconName.includes('<polygon') || iconName.includes('<line') || iconName.includes('<circle')) {
    return iconName;
  }

  const resolvedKey = resolveIconKey(iconName);
  if (resolvedKey) {
    const elements = LUCIDE_INDEX.get(resolvedKey);
    if (elements && Array.isArray(elements)) {
      return elements
        .map(([tag, attrs]) => {
          const attrStr = Object.entries(attrs || {})
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
          return `<${tag} ${attrStr}/>`;
        })
        .join('');
    }
  }

  return `<circle cx="12" cy="12" r="8"/>`;
}
