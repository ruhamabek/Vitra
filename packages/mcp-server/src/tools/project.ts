import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  InMemorySceneStore,
  saveVitraProject,
  loadVitraProject,
  computeSceneDiff,
  formatSceneDiff,
  diffProjectCommits,
  AgentCommit,
  saveCommitSnapshot,
  updateHeadRef,
} from '@vitra/core';
import { McpToolContext } from './context.js';

export function registerProjectTools(server: McpServer, ctx: McpToolContext): void {
  const { store } = ctx;

  server.registerTool(
    'save_project',
    {
      description: 'Saves the current scene store, tokens, and history to a local-first .vitra project directory.',
      inputSchema: {
        path: z.string().describe('Target directory path (e.g. "./my-app.vitra")'),
        name: z.string().describe('Human-readable project name'),
        description: z.string().optional().describe('Project description'),
      },
    },
    async (args) => {
      try {
        if (!(store instanceof InMemorySceneStore)) {
          throw new Error('Scene store does not support project serialization.');
        }
        await saveVitraProject(args.path, {
          manifest: {
            name: args.name,
            description: args.description,
          },
          store: store as InMemorySceneStore,
        });
        return {
          content: [{ type: 'text', text: `Project saved successfully to "${args.path}".` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    }
  );

  server.registerTool(
    'load_project',
    {
      description: 'Loads a local-first .vitra project directory into the active scene store.',
      inputSchema: {
        path: z.string().describe('Directory path of the .vitra project to load'),
      },
    },
    async (args) => {
      try {
        const loaded = await loadVitraProject(args.path);
        store.importSnapshot(loaded.store.exportSnapshot());
        const totalNodes = Object.keys(loaded.store.exportSnapshot().nodes).length;
        return {
          content: [{ type: 'text', text: `Project "${loaded.manifest.name}" loaded successfully with ${totalNodes} nodes.` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    }
  );

  server.registerTool(
    'commit_version',
    {
      description: 'Records an intentional semantic commit to a .vitra project directory history.',
      inputSchema: {
        path: z.string().describe('Directory path of the .vitra project'),
        intent: z.string().describe('The primary goal/change made (e.g. "Optimize mobile typography for accessibility")'),
        rationale: z.string().optional().describe('Technical or design rationale for this iteration'),
        model: z.string().optional().describe('AI model identifier (e.g. "claude-3-7-sonnet")'),
      },
    },
    async (args) => {
      try {
        const loaded = await loadVitraProject(args.path);
        const lastCommit = loaded.history.length > 0 ? loaded.history[loaded.history.length - 1] : undefined;
        const parentId = lastCommit ? lastCommit.id : null;
        const commitId = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const commit: AgentCommit = {
          id: commitId,
          parentId,
          timestamp: new Date().toISOString(),
          author: {
            type: 'agent',
            model: args.model,
            client: 'vitra-mcp',
          },
          intent: args.intent,
          rationale: args.rationale,
          changes: {
            nodesAdded: [],
            nodesModified: [],
            nodesDeleted: [],
            tokensModified: [],
          },
        };

        const treeSha = await saveCommitSnapshot(args.path, commitId, loaded.store.exportSnapshot());
        commit.treeSha = treeSha || undefined;

        await saveVitraProject(args.path, {
          manifest: {
            ...loaded.manifest,
            updatedAt: new Date().toISOString(),
          },
          store: loaded.store,
          tokens: loaded.tokens,
          history: [...loaded.history, commit],
        });

        await updateHeadRef(args.path, commitId);

        return {
          content: [{ type: 'text', text: `Committed version "${commitId}": "${args.intent}".` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    }
  );

  server.registerTool(
    'get_history',
    {
      description: 'Retrieves the semantic commit history log of a .vitra project directory.',
      inputSchema: {
        path: z.string().describe('Directory path of the .vitra project'),
      },
    },
    async (args) => {
      try {
        const loaded = await loadVitraProject(args.path);
        return {
          content: [{ type: 'text', text: JSON.stringify(loaded.history, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    }
  );

  server.registerTool(
    'diff_projects',
    {
      description:
        'Calculates the AST/visual scene diff between two .vitra project directories or across commits within a single project.',
      inputSchema: {
        pathA: z.string().describe('Target .vitra project directory path'),
        pathB: z.string().optional().describe('Optional second .vitra project directory path to compare against'),
        commit: z.string().optional().describe('Optional commit reference (e.g. "HEAD~1" or "c-init..HEAD")'),
      },
    },
    async (args) => {
      try {
        if (args.pathB) {
          const projA = await loadVitraProject(args.pathA);
          const projB = await loadVitraProject(args.pathB);
          const diff = computeSceneDiff(projA.store, projB.store);
          return {
            content: [{ type: 'text', text: formatSceneDiff(diff) }],
          };
        } else {
          const result = await diffProjectCommits(args.pathA, { commit: args.commit });
          return {
            content: [{ type: 'text', text: `${result.title}\n\n${formatSceneDiff(result.diff)}` }],
          };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text', text: message }] };
      }
    }
  );
}
