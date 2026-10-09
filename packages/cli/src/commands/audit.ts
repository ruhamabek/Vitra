import * as path from 'node:path';
import { loadVitraProject } from '@vitra/core';
import { auditDesign, AuditResult } from '@vitra/eval';
import { TokenRegistry, TokenTree } from '@vitra/tokens';
import * as fs from 'node:fs';

export interface AuditCliOptions {
  nodeId?: string;
  strict?: boolean;
  json?: boolean;
  theme?: string;
}

export interface ProjectAuditSummary {
  projectName: string;
  score: number;
  valid: boolean;
  totalChecks: number;
  auditedNodes: Array<{
    nodeId: string;
    nodeName: string;
    result: AuditResult;
  }>;
}

export async function runAuditCommand(
  targetDir: string,
  options: AuditCliOptions = {}
): Promise<ProjectAuditSummary> {
  const resolvedDir = path.resolve(process.cwd(), targetDir);
  const project = await loadVitraProject(resolvedDir);

  let registry: TokenRegistry | undefined;
  const tokenCandidatePaths = [
    path.join(resolvedDir, 'tokens.json'),
    path.join(resolvedDir, 'tokens', 'tokens.json'),
  ];
  for (const tPath of tokenCandidatePaths) {
    if (fs.existsSync(tPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(tPath, 'utf-8'));
        registry = new TokenRegistry();
        if (data.tokens) registry.registerTokens(data.tokens as TokenTree);
        else registry.registerTokens(data as TokenTree);
        if (data.themes && typeof data.themes === 'object') {
          const themes = data.themes as Record<string, TokenTree>;
          for (const [theme, t] of Object.entries(themes)) {
            registry.registerTheme(theme, t);
          }
        }
      } catch {
        // Ignore token parse error
      }
      break;
    }
  }

  if (options.theme) {
    if (!registry) registry = new TokenRegistry();
    registry.setTheme(options.theme);
  }

  const auditOpts = {
    tokenRegistry: registry,
    strictWcagAAA: options.strict ?? false,
  };

  const targetIds: string[] = [];
  if (options.nodeId) {
    targetIds.push(options.nodeId);
  } else {
     const root = project.store.getRoot();
    if (root.childIds && root.childIds.length > 0) {
      targetIds.push(...root.childIds);
    } else {
      targetIds.push(root.id);
    }
  }

  const auditedNodes: ProjectAuditSummary['auditedNodes'] = [];
  let minScore = 100;
  let allValid = true;
  let totalChecks = 0;

  for (const id of targetIds) {
    const node = project.store.getNode(id);
    if (!node) continue;

    const res = await auditDesign(project.store, id, auditOpts);
    auditedNodes.push({
      nodeId: id,
      nodeName: node.name || id,
      result: res,
    });

    if (res.score < minScore) minScore = res.score;
    if (!res.valid) allValid = false;
    totalChecks += res.totalChecks;
  }

  return {
    projectName: project.manifest.name,
    score: auditedNodes.length > 0 ? minScore : 100,
    valid: allValid,
    totalChecks,
    auditedNodes,
  };
}

export function formatAuditReport(summary: ProjectAuditSummary): string {
  const lines: string[] = [];
  lines.push(`\n Vitra Design & Accessibility Audit Report: "${summary.projectName}"`);
  lines.push(`────────────────────────────────────────────────────────────`);

  const scoreBadge = summary.score >= 90
    ? `\x1b[32m${summary.score}/100 (Excellent)\x1b[0m`
    : summary.score >= 70
    ? `\x1b[33m${summary.score}/100 (Needs Improvement)\x1b[0m`
    : `\x1b[31m${summary.score}/100 (Failing)\x1b[0m`;

  lines.push(`Overall Score: ${scoreBadge} | Total Checks: ${summary.totalChecks}`);
  lines.push(`────────────────────────────────────────────────────────────`);

  for (const { nodeId, nodeName, result } of summary.auditedNodes) {
    const status = result.valid ? '✅ PASS' : '❌ FAIL';
    lines.push(`\n▶ [${status}] Node "${nodeName}" (ID: ${nodeId}) - Score: ${result.score}/100`);

    if (result.issues.length === 0) {
      lines.push(`   ✓ All contrast ratios and layout bounds passed WCAG criteria.`);
    } else {
      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
        lines.push(`   ${icon} [${issue.type.toUpperCase()}] ${issue.message}`);
        if (issue.suggestedFix?.description) {
          lines.push(`      💡 Fix: ${issue.suggestedFix.description}`);
        }
      }
    }
  }

  lines.push(`\n────────────────────────────────────────────────────────────`);
  lines.push(summary.valid ? `\x1b[32m✓ Audit Passed successfully.\x1b[0m\n` : `\x1b[31m✗ Audit Failed with errors.\x1b[0m\n`);

  return lines.join('\n');
}
