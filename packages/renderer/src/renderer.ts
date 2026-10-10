import zlib from "node:zlib";
import opentype from "./opentype.js";
import { EMBEDDED_FONT_GZIP_BASE64 } from "./font-data.js";

let _cachedFont: any = null;
function getEmbeddedFont(): any {
  if (_cachedFont) return _cachedFont;
  try {
    const gz = Buffer.from(EMBEDDED_FONT_GZIP_BASE64, "base64");
    const fontBuf = zlib.gunzipSync(gz);
    const buf = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
    _cachedFont = (opentype as any).parse(buf, {});
    return _cachedFont;
  } catch {
    return null;
  }
}
import { ISceneStore, SceneNode } from '@vitra/core';
import { LayoutNodeResult } from '@vitra/layout';
import { TokenRegistry } from '@vitra/tokens';
import fs from 'node:fs';
import path from 'node:path';
import { getSvgIconContent } from './icons.js';

export function getPlatformSansFont(): string {
  if (process.platform === 'darwin') {
    return 'Helvetica Neue';
  }
  if (process.platform === 'win32') {
    return 'Segoe UI';
  }
  // Linux: check Cantarell (Fedora/GNOME) -> Noto Sans -> Liberation Sans -> DejaVu Sans
  try {
    if (fs.existsSync('/usr/share/fonts/abattis-cantarell-fonts') || fs.existsSync('/usr/share/fonts/cantarell')) {
      return 'Cantarell';
    }
    if (fs.existsSync('/usr/share/fonts/google-noto-vf') || fs.existsSync('/usr/share/fonts/noto')) {
      return 'Noto Sans';
    }
    if (fs.existsSync('/usr/share/fonts/liberation-sans-fonts') || fs.existsSync('/usr/share/fonts/liberation')) {
      return 'Liberation Sans';
    }
    if (fs.existsSync('/usr/share/fonts/dejavu-sans-fonts') || fs.existsSync('/usr/share/fonts/dejavu')) {
      return 'DejaVu Sans';
    }
  } catch {}
  return 'sans-serif';
}

export interface RenderOptions {
  tokenRegistry?: TokenRegistry;
  vectorizeText?: boolean;
}

export interface RenderPngOptions extends RenderOptions {
  scale?: number;
}

export function renderToSvg(
  store: ISceneStore,
  targetNodeId: string,
  layout: LayoutNodeResult,
  options?: RenderOptions
): string {
  const targetNode = store.getNode(targetNodeId);
  if (!targetNode) {
    throw new Error(`Target node "${targetNodeId}" not found in store.`);
  }

  const { width, height } = layout.bounds;
  const registry = options?.tokenRegistry;

  function resolveVal(val?: string | number): string | number | undefined {
    if (val !== undefined && registry && typeof registry.resolveValue === 'function') {
      return registry.resolveValue(val);
    }
    return val;
  }

  const defs: string[] = [];

  function getShadowFilterAttr(node: SceneNode): string {
    if ('effects' in node && node.effects && node.effects.length > 0) {
      const shadow = node.effects.find(e => e.type === 'drop-shadow');
      if (shadow) {
        const filterId = `shadow-${node.id}`;
        const shadowColor = String(resolveVal(shadow.color) ?? shadow.color);
        defs.push(`
          <filter id="${filterId}" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="${shadow.offsetX}" dy="${shadow.offsetY}" stdDeviation="${shadow.blur / 2}" flood-color="${shadowColor}" />
          </filter>
        `);
        return `filter="url(#${filterId})"`;
      }
    }
    return '';
  }

  function getStrokeAttr(node: SceneNode): string {
    if ('stroke' in node && node.stroke) {
      const strokeColor = resolveVal(node.stroke);
      const width = ('strokeWidth' in node && node.strokeWidth) ? node.strokeWidth : 1;
      return `stroke="${strokeColor}" stroke-width="${width}"`;
    }
    return '';
  }

   function renderElement(node: SceneNode, nodeLayout: LayoutNodeResult): string {
    const { x, y, width: w, height: h } = nodeLayout.bounds;
    const filterAttr = getShadowFilterAttr(node);
    const strokeAttr = getStrokeAttr(node);

    if (node.type === 'frame' || node.type === 'artboard') {
      const resolvedFill = resolveVal(node.fill);
      const fillAttr = resolvedFill ? `fill="${resolvedFill}"` : 'fill="none"';
      const resolvedRadius = resolveVal(node.cornerRadius) ?? node.cornerRadius;
      const rxAttr = resolvedRadius ? `rx="${resolvedRadius}" ry="${resolvedRadius}"` : '';

      const children = store.getChildren(node.id);
      const renderedChildren = children
        .map(child => {
          const childLayout = nodeLayout.children.find(c => c.nodeId === child.id);
          if (!childLayout) return '';
          return renderElement(child, childLayout);
        })
        .join('\n');

      return `
        <g transform="translate(${x}, ${y})">
          <rect width="${w}" height="${h}" ${fillAttr} ${rxAttr} ${strokeAttr} ${filterAttr} />
          ${renderedChildren}
        </g>
      `;
    }

    if (node.type === 'shape') {
      const resolvedFill = resolveVal(node.fill);
      const fillAttr = resolvedFill ? `fill="${resolvedFill}"` : 'fill="none"';

      if (node.shapeType === 'ellipse') {
        const rx = w / 2;
        const ry = h / 2;
        return `
          <g transform="translate(${x}, ${y})">
            <ellipse cx="${rx}" cy="${ry}" rx="${rx}" ry="${ry}" ${fillAttr} ${strokeAttr} ${filterAttr} />
          </g>
        `;
      }

      if (node.shapeType === 'divider') {
        const strokeColor = resolveVal(node.stroke ?? node.fill) ?? '#E2E8F0';
        const strokeW = resolveVal(node.strokeWidth) ?? Math.max(1, h);
        return `
          <g transform="translate(${x}, ${y})">
            <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${strokeColor}" stroke-width="${strokeW}" ${filterAttr} />
          </g>
        `;
      }

      // Default: rectangle shape
      const resolvedRadius = resolveVal(node.cornerRadius) ?? node.cornerRadius;
      const rxAttr = resolvedRadius ? `rx="${resolvedRadius}" ry="${resolvedRadius}"` : '';
      return `
        <g transform="translate(${x}, ${y})">
          <rect width="${w}" height="${h}" ${fillAttr} ${rxAttr} ${strokeAttr} ${filterAttr} />
        </g>
      `;
    }

    if (node.type === 'icon') {
      const stroke = resolveVal(node.color) ?? '#FFFFFF';
      const fill = resolveVal(node.fill) ?? 'none';
      const strokeW = node.strokeWidth ?? 2;
      const iconContent = getSvgIconContent(node.icon);

      return `
        <g transform="translate(${x}, ${y})">
          <svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" ${filterAttr}>
            ${iconContent}
          </svg>
        </g>
      `;
    }

    if (node.type === 'text') {
      const fontSize = Number(resolveVal(node.fontSize) ?? 16);
      const lineHeight = Number(resolveVal(node.lineHeight) ?? fontSize * 1.35);
      const fill = resolveVal(node.fill) ?? '#000000';
      const fontWeight = resolveVal(node.fontWeight) ?? 400;

      const embeddedFont = options?.vectorizeText ? getEmbeddedFont() : null;

      if (embeddedFont) {
        const ascentRatio = embeddedFont.ascender / (embeddedFont.ascender - embeddedFont.descender);
        if (node.wrap) {
          const wrapLimit = (node.maxWidth && node.maxWidth > 0) ? node.maxWidth : 260;
          const words = node.text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testW = embeddedFont.getAdvanceWidth(testLine, fontSize);
            if (testW > wrapLimit && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          const paths = lines.map((line, idx) => {
            const lineY = (idx * lineHeight) + (fontSize * ascentRatio);
            const p = embeddedFont.getPath(line, 0, lineY, fontSize);
            return `<path d="${p.toPathData(2)}" fill="${fill}" />`;
          }).join('\n');

          return `
            <g transform="translate(${x}, ${y})" ${filterAttr}>
              ${paths}
            </g>
          `;
        } else {
          const baseline = (h - fontSize) / 2 + (fontSize * ascentRatio);
          const p = embeddedFont.getPath(node.text, 0, baseline, fontSize);
          return `
            <g transform="translate(${x}, ${y})" ${filterAttr}>
              <path d="${p.toPathData(2)}" fill="${fill}" />
            </g>
          `;
        }
      }

      if (node.wrap) {
        const wrapLimit = (node.maxWidth && node.maxWidth > 0) ? node.maxWidth : 260;
        const words = node.text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const estWidth = testLine.length * fontSize * 0.55;
          if (estWidth > wrapLimit && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const tspans = lines
          .map((line, idx) => {
            const dy = idx === 0 ? fontSize * 0.85 : lineHeight;
            const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<tspan x="0" dy="${dy}">${escaped}</tspan>`;
          })
          .join('');

        return `
          <g transform="translate(${x}, ${y})">
            <text
              fill="${fill}"
              font-size="${fontSize}"
              font-weight="${fontWeight}"
              font-family="${primaryFont}, sans-serif"
              ${filterAttr}
            >${tspans}</text>
          </g>
        `;
      }

      const escapedText = node.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `
        <g transform="translate(${x}, ${y})">
          <text
            x="0"
            y="${Math.round(h / 2)}"
            dominant-baseline="central"
            fill="${fill}"
            font-size="${fontSize}"
            font-weight="${fontWeight}"
            font-family="${primaryFont}, sans-serif"
            ${filterAttr}
          >${escapedText}</text>
        </g>
      `;
    }

    return '';
  }

  const primaryFont = getPlatformSansFont();
  const content = renderElement(targetNode, {
    ...layout,
    bounds: { ...layout.bounds, x: 0, y: 0 },
  });

  const defsBlock = defs.length > 0 ? `<defs>${defs.join('\n')}</defs>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defsBlock}
${content}
</svg>`;
}

async function loadResvgClass(): Promise<any> {
  // 1. Try native @resvg/resvg-js from module resolution
  try {
    const resvgModule = await import("@resvg/resvg-js");
    if (resvgModule?.Resvg) return resvgModule.Resvg;
    if (typeof resvgModule === "function") return resvgModule;
  } catch {}

  // 2. Try local project require
  try {
    const { createRequire } = await import("node:module");
    const localReq = createRequire(path.join(process.cwd(), "package.json"));
    const mod = localReq("@resvg/resvg-js");
    if (mod?.Resvg) return mod.Resvg;
    if (typeof mod === "function") return mod;
  } catch {}

  // 3. Try probing installed locations (packages/renderer, nvm, npm, pnpm, etc.)
  try {
    const { createRequire } = await import("node:module");
    const candidateDirs = [
      path.join(process.cwd(), "packages", "renderer", "node_modules"),
      path.join(process.cwd(), "node_modules"),
      process.env.APPDATA ? path.join(process.env.APPDATA, "npm", "node_modules") : null,
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "npm", "node_modules") : null,
      process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "nodejs", "node_modules") : null,
      process.env.NVM_BIN ? path.join(process.env.NVM_BIN, "..", "lib", "node_modules") : null,
      process.env.HOME && process.version ? path.join(process.env.HOME, ".nvm", "versions", "node", process.version, "lib", "node_modules") : null,
      "/usr/local/lib/node_modules",
      "/usr/lib/node_modules",
      process.env.HOME ? path.join(process.env.HOME, ".npm-global", "lib", "node_modules") : null,
      process.env.HOME ? path.join(process.env.HOME, ".local", "share", "pnpm", "global", "node_modules") : null,
    ].filter(Boolean) as string[];

    for (const dir of candidateDirs) {
      const targetPkg = path.join(dir, "@resvg", "resvg-js");
      if (fs.existsSync(targetPkg)) {
        try {
          const entryFile = fs.existsSync(path.join(targetPkg, "index.js"))
            ? path.join(targetPkg, "index.js")
            : targetPkg;
          const gReq = createRequire(entryFile);
          const mod = gReq(entryFile);
          if (mod?.Resvg) return mod.Resvg;
          if (typeof mod === "function") return mod;
        } catch {}
      }
    }
  } catch {}

  // 4. Fallback to embedded zero-dependency WebAssembly engine
  try {
    const { initEmbeddedResvg, EmbeddedResvg } = await import("./embedded-wasm.js");
    await initEmbeddedResvg();
    return EmbeddedResvg;
  } catch (err) {}

  return null;
}

export async function renderToPng(
  svgOrInput: string | { store: ISceneStore; targetNodeId: string; layout: LayoutNodeResult; tokenRegistry?: TokenRegistry },
  options?: RenderPngOptions
): Promise<Buffer> {
  const primaryFont = getPlatformSansFont();
  const ResvgClass = await loadResvgClass();
  if (!ResvgClass) {
    throw new Error(
      "PNG rendering failed. Vitra includes an embedded WebAssembly rendering engine, but it could not be initialized.\n" +
      "You can export directly as vector SVG with: vitra export <dir> --target svg"
    );
  }

  // Determine if using embedded WASM engine (which requires vector text for 100% font fidelity)
  const isWasmEngine = ResvgClass.name === "EmbeddedResvg" || typeof ResvgClass.prototype?.asPng !== "function" && ResvgClass.toString().includes("EmbeddedResvg");

  let svg: string;
  if (typeof svgOrInput === "string") {
    svg = svgOrInput;
  } else {
    // If input is store + layout, we can automatically vectorize text if using WASM engine
    svg = renderToSvg(svgOrInput.store, svgOrInput.targetNodeId, svgOrInput.layout, {
      tokenRegistry: svgOrInput.tokenRegistry ?? options?.tokenRegistry,
      vectorizeText: isWasmEngine || options?.vectorizeText,
    });
  }

  const resvg = new ResvgClass(svg, {
    fitTo: options?.scale ? { mode: "zoom", value: options.scale } : { mode: "original" },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: primaryFont,
      sansSerifFamily: primaryFont,
    },
    textRendering: 1,
    shapeRendering: 2,
    imageRendering: 0,
  });

  const pngData = resvg.render();
  const result = pngData.asPng();
  if (typeof pngData.free === "function") {
    pngData.free();
  }
  if (typeof resvg.free === "function") {
    resvg.free();
  }
  return Buffer.isBuffer(result) ? result : Buffer.from(result);
}
