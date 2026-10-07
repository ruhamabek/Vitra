export type ExportTarget = 'react-tailwind' | 'html-tailwind' | 'swiftui';

export interface CodegenOptions {
  /**
   * The target output language and framework.
   * Defaults to 'react-tailwind'.
   */
  target?: ExportTarget;

  /**
   * The name of the exported component / view struct.
   * Defaults to a PascalCase version of node.name or 'DesignComponent'.
   */
  componentName?: string;

  /**
   * Whether to preserve token references as CSS variables / semantic classes.
   * Defaults to true.
   */
  useTokens?: boolean;

  /**
   * Whether to export as a full component with imports or just the inner element tree.
   * Defaults to true.
   */
  includeWrapper?: boolean;
}

export interface CodegenResult {
  target: ExportTarget;
  code: string;
  componentName: string;
  tokensUsed: string[];
}
