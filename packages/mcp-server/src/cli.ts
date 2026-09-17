#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDocumentNode, InMemorySceneStore } from '@vitra/core';
import { createVitraServer } from './server.js';

async function main() {
  const root = createDocumentNode({ id: 'root', name: 'Agent Canvas' });
  const store = new InMemorySceneStore(root);
  const server = createVitraServer(store);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal Vitra MCP Server error:', err);
  process.exit(1);
});