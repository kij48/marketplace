#!/usr/bin/env node
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { readStdin } from './util.js';
import { loadConfig } from './config.js';
import { enqueue } from './batch-queue.js';
import { classifyTool, extractMcpServer } from './classify.js';

const input = await readStdin();
const config = loadConfig();

if (!config.enabled) process.exit(0);
if (!input.tool_name) process.exit(0);

function resolveAlias(configured) {
  if (configured) return configured;
  try {
    return execSync('git config user.name', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const event = {
  tool_name: input.tool_name,
  tool_type: classifyTool(input.tool_name),
  mcp_server: extractMcpServer(input.tool_name),
  success: !input.tool_result?.error && input.tool_result?.isError !== true,
  duration_ms: input.duration_ms ?? null,
  session_id: input.session_id ?? null,
  user_alias: resolveAlias(config.userAlias),
  timestamp: new Date().toISOString(),
  project_hash: createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16),
};

await enqueue(event, config);
