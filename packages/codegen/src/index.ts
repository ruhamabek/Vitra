import { ISceneStore } from '@vitra/core';
import { CodegenOptions, CodegenResult } from './types.js';
import { generateReactTailwind } from './react-generator.js';
import { generateSwiftUI } from './swiftui-generator.js';

export * from './types.js';
export * from './tailwind-mapper.js';
export * from './react-generator.js';
export * from './swiftui-generator.js';

/**
 * High-level unified code export function for Vitra scene nodes.
 */
export function exportCode(
  store: ISceneStore,
  targetNodeId: string,
  options?: CodegenOptions
): CodegenResult {
  const target = options?.target ?? 'react-tailwind';

  switch (target) {
    case 'swiftui':
      return generateSwiftUI(store, targetNodeId, options);
    case 'react-tailwind':
    case 'html-tailwind':
    default:
      return generateReactTailwind(store, targetNodeId, options);
  }
}
