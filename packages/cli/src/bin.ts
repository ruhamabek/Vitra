#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initProject } from './commands/init.js';
import { inspectProject, formatInspection } from './commands/inspect.js';
import { commitProject } from './commands/commit.js';
import { getProjectLog, formatLog } from './commands/log.js';
import { diffProjects, diffProjectCommits, formatSceneDiff } from './commands/diff.js';
import { exportProject } from './commands/export.js';
import { serveProject } from './commands/serve.js';
import { branchProject, formatBranchList } from './commands/branch.js';
import { checkoutProject } from './commands/checkout.js';
import { mergeProject, formatMergeSummary } from './commands/merge.js';
import { statusProject, formatStatus } from './commands/status.js';
import { addProject } from './commands/add.js';
import { restoreProject, resetProject } from './commands/restore.js';
import { hashObjectCommand, catFileCommand } from './commands/plumbing.js';
import { importTokensFromCss, formatTokensImportSummary } from './commands/tokens.js';
import { runAuditCommand, formatAuditReport } from './commands/audit.js';
import { applyComponentToProject, formatApplySummary } from './commands/apply.js';
import { runSpecCommand } from './commands/spec.js';
import { runRenderCommand, formatRenderSummary } from './commands/render.js';
import { importDesign, exportFigma, exportPenpot } from './commands/import.js';
import { runMcpCommand } from './commands/mcp.js';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

const HELP_TEXT = `
  Vitra CLI - The Universal Visual Runtime & Protocol
  
  Usage:
    vitra <command> [options]
    
  Commands:
    init <dir>                 Initialize a new .vitra project directory
    audit [<dir>]              Run automated WCAG contrast & layout overflow audit [--strict] [--json] [--node <id>] [--theme <t>]
    apply <dir> <file>         Atomically insert/patch declarative component (.json or .md) [--parent <id>]
    spec [<dir>]               Export UI tree to compact design.md spec [--out <file.md>] [--node <id>]
    tokens import <cssFile>    Ingest CSS custom properties from globals.css [--out <tokens.json>]
    status [<dir>]             Show working tree status (staged, unstaged, untracked)
    add [<dir>] <nodeId...>    Stage node(s), artboard, or . (all) for commit
    restore [<dir>] <nodeId..> Discard unstaged changes in working canvas
    reset [<dir>] <nodeId...>  Unstage changes from the staging index
    commit <dir> -m <message>  Record an agent/human commit with intent & rationale
    branch [<dir>] [-d <name>] List, create, or delete branches
    checkout [<dir>] [-b] <ref> Switch branch or restore working canvas to commit
    merge [<dir>] <branch>     3-way visual AST merge of target branch into current branch
    log <dir>                  Display commit history log
    diff <dirA> [dirB]         Display visual AST diff between two versions
    export <dir> --target <t>  Compile project to react, swiftui, html, svg, or png
    serve <dir> [--port <p>]   Start local sync server & embedded canvas [--no-open]
    canvas <dir> [--port <p>]  Launch interactive live canvas in browser [--no-open]
    import <file|url>          Import Figma/Penpot JSON or live Figma URL [--token <t>] [--out <dir>]
    export-figma <dir>         Export .vitra project → Figma REST API JSON [--out <file.json>]
    export-penpot <dir>        Export .vitra project → Penpot JSON [--out <file.json>]
    render <dir> [--out <f>]   Render artboard/node directly to PNG image [--node <id>] [--scale <s>] [--theme <t>]
    hash-object [-w] <file>    Compute SHA-1 hash and optionally create zlib object
    cat-file [<dir>] -p <sha>  Display decompressed object content or tree listing
    mcp [<dir>]                Start Model Context Protocol (MCP) server on stdio
    
  Options:
    -h, --help                 Show this help message
    -v, --version              Show Vitra version
`;

function getCliArgs(): string[] {
  const raw = process.argv.slice(1);
  if (raw.length === 0) return [];

  const first = raw[0];
  if (!first) return [];

  const isScriptOrBin =
    !first.startsWith('-') &&
    (first.endsWith('.js') ||
      first.endsWith('.mjs') ||
      first.endsWith('.ts') ||
      path.basename(first).toLowerCase().includes('vitra') ||
      first.includes('/') ||
      first.includes('\\'));

  if (isScriptOrBin) {
    return raw.slice(1);
  }
  return raw;
}

async function main() {
  const args = getCliArgs();
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(HELP_TEXT + '\n');
    return;
  }

  if (command === '--version' || command === '-v') {
    process.stdout.write('0.1.0\n');
    return;
  }

  try {
    switch (command) {
      case 'init': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            name: { type: 'string', short: 'n' },
            description: { type: 'string', short: 'd' },
          },
          allowPositionals: true,
        });
        const targetDir = positionals[0] ?? './my-design.vitra';
        const projectPath = await initProject(targetDir, {
          name: values.name,
          description: values.description,
        });
        console.log(`\n✓ Vitra project initialized at: ${projectPath}\n`);
        break;
      }

      case 'status': {
        const targetDir = args[1] ?? '.';
        const status = await statusProject(targetDir);
        console.log('\n' + formatStatus(status) + '\n');
        break;
      }

      case 'add': {
        const subArgs = args.slice(1);
        let targetDir = '.';
        const targets: string[] = [];

        for (const a of subArgs) {
          if (
            (fs.existsSync(path.join(a, 'vitra.json')) || a.endsWith('.vitra') || a === '.') &&
            targetDir === '.' &&
            targets.length === 0
          ) {
            targetDir = a;
          } else {
            targets.push(a);
          }
        }

        if (targets.length === 0) {
          targets.push('.');
        }

        await addProject(targetDir, targets);
        break;
      }

      case 'restore': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            staged: { type: 'boolean', short: 's' },
          },
          allowPositionals: true,
        });

        let targetDir = '.';
        const targets: string[] = [];

        for (const p of positionals) {
          if ((p.endsWith('.vitra') || p === '.') && targetDir === '.' && targets.length === 0) {
            targetDir = p;
          } else {
            targets.push(p);
          }
        }

        if (targets.length === 0) {
          targets.push('.');
        }

        await restoreProject(targetDir, targets, { staged: values.staged });
        if (values.staged) {
          console.log(`✓ Unstaged ${targets.join(', ')} in ${targetDir}`);
        } else if (targets.includes('.')) {
          console.log(`✓ Restored working canvas in ${targetDir} back to clean state`);
        } else {
          console.log(`✓ Restored ${targets.join(', ')} in ${targetDir}`);
        }
        break;
      }

      case 'reset': {
        const subArgs = args.slice(1);
        let targetDir = '.';
        const targets: string[] = [];

        for (const a of subArgs) {
          if ((a.endsWith('.vitra') || a === '.') && targetDir === '.' && targets.length === 0) {
            targetDir = a;
          } else {
            targets.push(a);
          }
        }

        if (targets.length === 0) {
          targets.push('.');
        }

        await resetProject(targetDir, targets);
        console.log(`✓ Reset staged index in ${targetDir}`);
        break;
      }

      case 'inspect': {
        const targetDir = args[1] ?? '.';
        const inspection = await inspectProject(targetDir);
        console.log('\n' + formatInspection(inspection) + '\n');
        break;
      }

      case 'commit': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            message: { type: 'string', short: 'm' },
            author: { type: 'string', short: 'a' },
            model: { type: 'string' },
            rationale: { type: 'string', short: 'r' },
          },
          allowPositionals: true,
        });
        const targetDir = positionals[0] ?? '.';
        const message = values.message;
        if (!message) {
          console.error('Error: Commit message (-m) is required.');
          process.exit(1);
        }

        const commit = await commitProject(targetDir, {
          message,
          authorName: values.author,
          model: values.model,
          rationale: values.rationale,
        });
        console.log(`\n[commit ${commit.id}] ${commit.intent}\n`);
        break;
      }

      case 'branch': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            delete: { type: 'string', short: 'd' },
            force: { type: 'boolean', short: 'f' },
          },
          allowPositionals: true,
        });

        let targetDir = '.';
        let branchToCreate: string | undefined;

        const firstPos = positionals[0];
        const secondPos = positionals[1];

        if (firstPos && secondPos) {
          targetDir = firstPos;
          branchToCreate = secondPos;
        } else if (firstPos) {
          if (firstPos.endsWith('.vitra') || firstPos === '.' || firstPos.startsWith('./') || firstPos.startsWith('/')) {
            targetDir = firstPos;
          } else {
            branchToCreate = firstPos;
          }
        }

        if (values.delete) {
          await branchProject(targetDir, { delete: values.delete, force: values.force });
          console.log(`\nDeleted branch "${values.delete}".\n`);
        } else if (branchToCreate) {
          await branchProject(targetDir, { create: branchToCreate, force: values.force });
          console.log(`\nCreated branch "${branchToCreate}".\n`);
        } else {
          const branches = await branchProject(targetDir, { list: true });
          console.log('\n' + formatBranchList(branches) + '\n');
        }
        break;
      }

      case 'checkout': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            branch: { type: 'string', short: 'b' },
          },
          allowPositionals: true,
        });

        let targetDir = '.';
        let targetRef: string | undefined;
        let createBranch = false;

        const firstPos = positionals[0];
        const secondPos = positionals[1];

        if (values.branch) {
          createBranch = true;
          targetRef = values.branch;
          if (firstPos) {
            targetDir = firstPos;
          }
        } else {
          if (firstPos && secondPos) {
            targetDir = firstPos;
            targetRef = secondPos;
          } else if (firstPos) {
            if (firstPos.endsWith('.vitra')) {
              targetDir = firstPos;
            } else {
              targetRef = firstPos;
            }
          }
        }

        if (!targetRef) {
          console.error('Error: Please specify a branch name or commit ID to checkout: vitra checkout <ref>');
          process.exit(1);
        }

        const result = await checkoutProject(targetDir, {
          target: targetRef,
          createBranch,
        });

        if (result.type === 'branch') {
          console.log(`\nSwitched to branch '${result.branch}' (${result.commitId})\n`);
        } else {
          console.log(`\nNote: switching to '${result.commitId}'.\nYou are in 'detached HEAD' state.\n`);
        }
        break;
      }

      case 'merge': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            message: { type: 'string', short: 'm' },
            strategy: { type: 'string' },
          },
          allowPositionals: true,
        });

        let targetDir = '.';
        let branchToMerge: string | undefined;

        const firstPos = positionals[0];
        const secondPos = positionals[1];

        if (firstPos && secondPos) {
          targetDir = firstPos;
          branchToMerge = secondPos;
        } else if (firstPos) {
          if (firstPos.endsWith('.vitra')) {
            targetDir = firstPos;
          } else {
            branchToMerge = firstPos;
          }
        }

        if (!branchToMerge) {
          console.error('Error: Please specify the branch to merge: vitra merge <branch>');
          process.exit(1);
        }

        const strategy = values.strategy as 'ours' | 'theirs' | undefined;
        const result = await mergeProject(targetDir, branchToMerge, {
          strategy,
          commitMessage: values.message,
        });

        console.log('\n' + formatMergeSummary(result) + '\n');
        if (result.status === 'conflicts') {
          process.exit(1);
        }
        break;
      }

      case 'log': {
        const targetDir = args[1] ?? '.';
        const history = await getProjectLog(targetDir);
        console.log('\n' + formatLog(history) + '\n');
        break;
      }

      case 'diff': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            commit: { type: 'string', short: 'c' },
            between: { type: 'string', short: 'b' },
          },
          allowPositionals: true,
        });

        const targetA = positionals[0];
        const targetB = positionals[1];

        if (!targetA) {
          console.error('Error: Please provide a project directory: vitra diff <path> or vitra diff <dirA> <dirB>');
          process.exit(1);
        }

        try {
          if (targetB) {

            const diff = await diffProjects(targetA, targetB);
            console.log(`\nDiff: [${targetA}] vs [${targetB}]`);
            console.log(formatSceneDiff(diff) + '\n');
          } else {
 
            const result = await diffProjectCommits(targetA, {
              commit: values.commit,
              between: values.between,
            });
            console.log(`\n${result.title}`);
            console.log(formatSceneDiff(result.diff) + '\n');
          }
        } catch (err: unknown) {
          const msg = getErrorMessage(err);
          const code = (err as { code?: string })?.code;
          if (code === 'ENOENT' || msg.includes('ENOENT')) {
            console.error(`\nError: Could not load project from path. Please check that the directory exists:`);
            console.error(`  - ${targetA}`);
            if (targetB) console.error(`  - ${targetB}`);
            console.error(`\nTip: You can initialize a new project with: vitra init <path>\n`);
          } else {
            console.error(`\nError: ${msg}\n`);
          }
          process.exit(1);
        }
        break;
      }

      case 'export': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            target: { type: 'string', short: 't', default: 'react' },
            out: { type: 'string', short: 'o', default: './dist' },
            artboard: { type: 'string' },
          },
          allowPositionals: true,
        });
        const targetDir = positionals[0] ?? '.';
        const rawTarget = values.target ?? 'react';
        const validTargets = ['react', 'swiftui', 'html', 'svg', 'png'] as const;
        type ExportTarget = (typeof validTargets)[number];

        if (!validTargets.includes(rawTarget as ExportTarget)) {
          console.error(`Error: Invalid export target "${rawTarget}". Allowed: ${validTargets.join(', ')}`);
          process.exit(1);
        }

        const target = rawTarget as ExportTarget;
        const outDir = values.out ?? './dist';
        const files = await exportProject(targetDir, {
          target,
          outDir,
          artboardId: values.artboard,
        });
        console.log(`\n✓ Exported ${files.length} file(s) to ${outDir}:\n`);
        for (const f of files) {
          console.log(`  • ${f}`);
        }
        console.log('');
        break;
      }

      case 'canvas':
      case 'serve': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            port: { type: 'string', short: 'p', default: '9876' },
            open: { type: 'boolean', default: true },
            'no-open': { type: 'boolean', default: false },
          },
          allowPositionals: true,
        });
        const targetDir = positionals[0] ?? '.';
        const port = parseInt(values.port ?? '9876', 10);
        const shouldOpen = values.open !== false && !values['no-open'];
        try {
          const { port: actualPort } = await serveProject(targetDir, { port });
          const canvasUrl = `http://localhost:${actualPort}`;
          console.log(`\n Vitra Sync Server & Canvas running at ${canvasUrl}`);
          console.log(`  Project: ${targetDir}`);
          console.log(`  WebSocket Sync: ws://localhost:${actualPort}`);
          console.log(`  Canvas URL: ${canvasUrl}`);
          console.log(`  Ready for Canvas Web, IDEs, and Agent connections.\n`);

          if (shouldOpen) {
            try {
              const { exec } = await import('node:child_process');
              const startCmd =
                process.platform === 'darwin'
                  ? `open "${canvasUrl}"`
                  : process.platform === 'win32'
                  ? `start "" "${canvasUrl}"`
                  : `xdg-open "${canvasUrl}"`;
              exec(startCmd, () => {});
            } catch {}
          }

          await new Promise(() => {});
        } catch (err: unknown) {
          const msg = getErrorMessage(err);
          const code = (err as { code?: string })?.code;
          if (code === 'EADDRINUSE' || msg.includes('EADDRINUSE')) {
            console.error(`\n❌ Port ${port} is already in use by another process.`);
            console.error(`To resolve this:`);
            console.error(`  1. Kill the process currently running on port ${port}:`);
            console.error(`     fuser -k ${port}/tcp   (or: kill $(lsof -t -i:${port}))`);
            console.error(`  2. Or serve on a different port:`);
            console.error(`     node packages/cli/dist/bin.js canvas ${targetDir} --port ${port + 1}`);
            const altCanvasUrl = `http://localhost:${port + 1}`;
            console.error(`     (and open ${altCanvasUrl} in your browser)\n`);
          } else {
            console.error(`\n❌ Failed to start Vitra Sync Server: ${msg}\n`);
          }
          process.exit(1);
        }
        break;
      }


      case 'hash-object': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            write: { type: 'boolean', short: 'w' },
          },
          allowPositionals: true,
        });
        const file = positionals[0];
        if (!file) {
          console.error('Error: file path is required: vitra hash-object [-w] <file>');
          process.exit(1);
        }
        const sha = await hashObjectCommand(file, { write: values.write });
        console.log(sha);
        break;
      }

      case 'cat-file': {
        const { positionals } = parseArgs({
          args: args.slice(1),
          options: {
            pretty: { type: 'boolean', short: 'p' },
          },
          allowPositionals: true,
        });

        let targetDir = '.';
        let sha: string | undefined;

        const firstPos = positionals[0];
        const secondPos = positionals[1];

        if (firstPos && secondPos) {
          targetDir = firstPos;
          sha = secondPos;
        } else if (firstPos) {
          if (firstPos.endsWith('.vitra')) {
            targetDir = firstPos;
          } else {
            sha = firstPos;
          }
        }

        if (!sha) {
          console.error('Error: SHA-1 hash is required: vitra cat-file -p <sha>');
          process.exit(1);
        }

        const output = await catFileCommand(targetDir, sha);
        console.log(output);
        break;
      }

      case 'render': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            out: { type: 'string', short: 'o' },
            node: { type: 'string', short: 'n' },
            scale: { type: 'string', short: 's' },
            theme: { type: 'string', short: 't' },
          },
          allowPositionals: true,
        });

        const targetDir = positionals[0] ?? '.';
        const scale = values.scale ? parseFloat(values.scale) : undefined;
        const result = await runRenderCommand(targetDir, {
          out: values.out,
          node: values.node,
          scale,
          theme: values.theme,
        });

        console.log('\n' + formatRenderSummary(result) + '\n');
        break;
      }

      case 'import': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            format: { type: 'string', short: 'f', default: 'figma' },
            token: { type: 'string', short: 't' },
            out: { type: 'string', short: 'o' },
            name: { type: 'string', short: 'n', default: 'Imported Project' },
          },
          allowPositionals: true,
        });

        const input = positionals[0];
        if (!input) {
          console.error('Usage: vitra import <file.json | figma-url> [--token <token>] [--format figma|penpot] [--out <dir.vitra>]');
          process.exit(1);
        }

        const result = await importDesign(input, values);
        if (result.isWarning) {
          console.warn(`\n⚠️  Warning: 0 artboards or visual layers were found in "${input}".`);
        } else {
          console.log(`\n✓ Imported ${result.format} design (${result.artboardCount} artboard${result.artboardCount === 1 ? '' : 's'}) → ${result.outDir}`);
        }

        if (result.extractedColors.length > 0) {
          console.log(`  Design tokens extracted: ${result.extractedColors.slice(0, 5).join(', ')}${result.extractedColors.length > 5 ? ' ...' : ''}`);
        }
        console.log(`\n  Start Canvas:  vitra serve ${result.outDir}\n`);
        break;
      }

      case 'export-figma': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            out: { type: 'string', short: 'o' },
          },
          allowPositionals: true,
        });

        const targetDir = positionals[0] ?? '.';
        const resolvedOut = await exportFigma(targetDir, values.out);
        console.log(`\n✓ Exported Vitra project → ${resolvedOut} (Figma REST API format)\n`);
        break;
      }

      case 'export-penpot': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            out: { type: 'string', short: 'o' },
          },
          allowPositionals: true,
        });

        const targetDir = positionals[0] ?? '.';
        const resolvedOut = await exportPenpot(targetDir, values.out);
        console.log(`\n✓ Exported Vitra project → ${resolvedOut} (Penpot JSON format)\n`);
        break;
      }

      case 'tokens': {
        const subCommand = args[1];
        if (subCommand === 'import') {
          const cssFile = args[2];
          if (!cssFile) {
            console.error('Error: Please provide path to CSS file. e.g. vitra tokens import ./src/app/globals.css');
            process.exit(1);
          }
          const { values } = parseArgs({
            args: args.slice(3),
            options: {
              out: { type: 'string', short: 'o' },
              project: { type: 'string', short: 'p' },
            },
            allowPositionals: true,
          });
          const result = await importTokensFromCss(cssFile, {
            outFile: values.out,
            projectDir: values.project,
          });
          console.log('\n' + formatTokensImportSummary(result) + '\n');
          break;
        } else {
          console.error('Unknown tokens sub-command. Usage: vitra tokens import <cssFile> [--out <file>]');
          process.exit(1);
        }
      }

      case 'audit': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            node: { type: 'string', short: 'n' },
            strict: { type: 'boolean' },
            json: { type: 'boolean' },
            theme: { type: 'string', short: 't' },
            'no-exit-code': { type: 'boolean' },
          },
          allowPositionals: true,
        });

        const targetDir = positionals[0] || '.';
        const summary = await runAuditCommand(targetDir, {
          nodeId: values.node,
          strict: values.strict,
          json: values.json,
          theme: values.theme,
        });

        if (values.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log(formatAuditReport(summary));
        }

        if (!summary.valid && !values['no-exit-code']) {
          process.exit(1);
        }
        break;
      }

      case 'apply': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            parent: { type: 'string', short: 'p' },
            index: { type: 'string', short: 'i' },
          },
          allowPositionals: true,
        });

        const targetDir = positionals[0];
        const jsonFile = positionals[1];

        if (!targetDir || !jsonFile) {
          console.error('Usage: vitra apply <projectDir> <component.json> [--parent <nodeId>]');
          process.exit(1);
        }

        const result = await applyComponentToProject(targetDir, jsonFile, {
          parent: values.parent,
          index: values.index ? parseInt(values.index, 10) : undefined,
        });

        console.log('\n' + formatApplySummary(result) + '\n');
        break;
      }

      case 'spec': {
        const { values, positionals } = parseArgs({
          args: args.slice(1),
          options: {
            out: { type: 'string', short: 'o' },
            node: { type: 'string', short: 'n' },
          },
          allowPositionals: true,
        });

        const targetDir = positionals[0] ?? '.';
        const result = await runSpecCommand(targetDir, {
          out: values.out,
          node: values.node,
        });

        if (result.outFile) {
          console.log(`\n📄 Exported design specification to: ${result.outFile}\n`);
        } else {
          console.log('\n' + result.markdown + '\n');
        }
        break;
      }

      case 'mcp': {
        const targetDir = args[1] && !args[1].startsWith('-') ? args[1] : undefined;
        await runMcpCommand(targetDir);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP_TEXT);
        process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`\nError: ${getErrorMessage(err)}\n`);
    process.exit(1);
  }
}

void main();
