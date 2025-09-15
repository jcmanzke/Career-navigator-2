#!/usr/bin/env node
// Mirrors resources and simple search results from an MCP server
// defined in your VS Code mcp.json into docs/context7/ so this CLI
// can always use the latest documentation locally.

// Requires: npm i -D @modelcontextprotocol/sdk
// Usage:
//   node scripts/context7-sync.mjs                    # mirror resources -> files
//   node scripts/context7-sync.mjs --query "what to fetch"  # try a search tool and save results

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Lazy-import to avoid crash if package not installed yet.
let Client, StdioClientTransport;
try {
  ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js')); // ESM entry
  ({ StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js')); // stdio transport
} catch (err) {
  console.error('\nMissing dependency: @modelcontextprotocol/sdk');
  console.error('Install with: npm i -D @modelcontextprotocol/sdk\n');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'docs', 'context7');

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function extFromMime(mime) {
  if (!mime) return '.txt';
  if (mime.includes('markdown')) return '.md';
  if (mime.includes('json')) return '.json';
  if (mime.includes('html')) return '.html';
  if (mime.includes('text')) return '.txt';
  return '.txt';
}

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function writeDocFile(name, content, mimeType) {
  const file = path.join(OUT_DIR, `${slugify(name)}${extFromMime(mimeType)}`);
  await fs.writeFile(file, content, 'utf8');
  return file;
}

async function connect() {
  // Mirrors your VS Code mcp.json entry for Context7
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    env: process.env,
  });
  const client = new Client({ name: 'context7-sync', version: '0.1.0' }, transport);
  await client.connect(transport);
  return client;
}

async function mirrorResources(client) {
  let resources;
  try {
    resources = await client.listResources();
  } catch (e) {
    console.log('Server does not implement resources; skipping resource mirror.');
    return [];
  }
  if (!resources?.resources?.length) {
    console.log('No MCP resources exposed by server. Skipping resource mirror.');
    return [];
  }
  console.log(`Found ${resources.resources.length} resources. Mirroring...`);
  const written = [];
  for (const res of resources.resources) {
    try {
      const data = await client.readResource({ uri: res.uri });
      const content = Array.isArray(data?.contents)
        ? data.contents.map(c => (typeof c.text === 'string' ? c.text : '')).join('\n')
        : (data?.text || '');
      const mime = res.mimeType || data?.mimeType || 'text/plain';
      const file = await writeDocFile(res.name || res.uri, content, mime);
      written.push(file);
      console.log(`- wrote ${file}`);
    } catch (e) {
      console.warn(`! failed ${res.uri}:`, e.message);
    }
  }
  return written;
}

async function toolCall(client, options) {
  const { query, tool: toolName, args: argsJson } = options || {};
  const tools = await client.listTools().catch(() => ({ tools: [] }));
  const available = (tools?.tools || []);
  if (!available.length) {
    console.log('No tools exposed by server.');
    return [];
  }
  let selected;
  if (toolName) {
    selected = available.find(t => t.name === toolName);
    if (!selected) {
      console.log('Tool not found:', toolName);
      console.log('Available tools:', available.map(t => t.name).join(', ') || 'none');
      return [];
    }
  } else {
    selected = available.find(t => /search|retrieve|query|docs/i.test(t.name)) || available[0];
  }
  let args = {};
  if (argsJson) {
    try { args = JSON.parse(argsJson); } catch { console.warn('Invalid --args JSON; using {}'); }
  }
  if (query && args.query === undefined) args.query = query;
  console.log(`Running tool: ${selected.name} with args: ${JSON.stringify(args)}`);
  const result = await client.callTool({ name: selected.name, arguments: args });
  const payload = JSON.stringify(result, null, 2);
  const file = await writeDocFile(`tool-${selected.name}-${Date.now()}`, payload, 'application/json');
  console.log(`- wrote ${file}`);
  return [file];
}

function stringifyToolResult(result) {
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result ?? '');
  }
}

function extractLibraryIdsFromResult(result) {
  const texts = (result?.content || [])
    .filter((c) => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
  const ids = [];
  const re = /Context7-compatible library ID:\s*(\/[^\s]+)/g;
  let m;
  while ((m = re.exec(texts)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

async function resolveAndFetch(client, { library, topic, tokens }) {
  console.log(`Resolving library ID for: ${library}`);
  const resolveRes = await client.callTool({
    name: 'resolve-library-id',
    arguments: { libraryName: library }
  });
  const candidates = extractLibraryIdsFromResult(resolveRes);
  if (!candidates.length) {
    const file = await writeDocFile(`resolve-${library}-${Date.now()}`, stringifyToolResult(resolveRes), 'application/json');
    console.log(`Could not parse a library ID. Wrote raw result to ${file}`);
    return [];
  }
  const chosen = candidates[0];
  console.log(`Chosen library ID: ${chosen}`);
  const getArgs = { context7CompatibleLibraryID: chosen };
  if (topic) getArgs.topic = topic;
  if (tokens) getArgs.tokens = Number(tokens);
  const getRes = await client.callTool({ name: 'get-library-docs', arguments: getArgs });
  const out = await writeDocFile(`docs-${library}-${Date.now()}`, stringifyToolResult(getRes), 'application/json');
  console.log(`- wrote ${out}`);
  return [out];
}

async function main() {
  const queryFlagIndex = process.argv.indexOf('--query');
  const query = queryFlagIndex !== -1 ? process.argv[queryFlagIndex + 1] : undefined;
  const toolFlagIndex = process.argv.indexOf('--tool');
  const tool = toolFlagIndex !== -1 ? process.argv[toolFlagIndex + 1] : undefined;
  const argsFlagIndex = process.argv.indexOf('--args');
  const args = argsFlagIndex !== -1 ? process.argv[argsFlagIndex + 1] : undefined;
  const libraryFlagIndex = process.argv.indexOf('--library');
  const library = libraryFlagIndex !== -1 ? process.argv[libraryFlagIndex + 1] : undefined;
  const topicFlagIndex = process.argv.indexOf('--topic');
  const topic = topicFlagIndex !== -1 ? process.argv[topicFlagIndex + 1] : undefined;
  const tokensFlagIndex = process.argv.indexOf('--tokens');
  const tokens = tokensFlagIndex !== -1 ? process.argv[tokensFlagIndex + 1] : undefined;
  await ensureOutDir();
  const client = await connect();
  try {
    const written = [];
    written.push(...await mirrorResources(client));
    if (library) {
      written.push(...await resolveAndFetch(client, { library, topic, tokens }));
    } else if (query || tool || args) {
      written.push(...await toolCall(client, { query, tool, args }));
    } else {
      console.log('Tip: pass --tool <name> and --args <json> to fetch specific docs.');
      console.log('Or use --library <name> [--topic <t>] [--tokens <n>] to resolve and fetch in one go.');
      console.log('Listing available tools for reference...');
      const tools = await client.listTools().catch(() => ({ tools: [] }));
      for (const t of tools.tools || []) {
        const schema = t.inputSchema ? JSON.stringify(t.inputSchema) : '{}';
        console.log(`- ${t.name} :: schema ${schema}`);
      }
    }
    if (!written.length) {
      console.log('Nothing written. Ensure the MCP server exposes resources or a search tool.');
    }
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
