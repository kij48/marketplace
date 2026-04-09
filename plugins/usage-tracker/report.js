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
if (!config.trackBuiltins && classifyTool(input.tool_name) === 'builtin') process.exit(0);

function resolveAlias(configured) {
  if (configured) return configured;
  try {
    return execSync('git config user.name', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// When the Skill tool fires, extract the actual skill name from tool_input
const effectiveToolName = input.tool_name === 'Skill' && input.tool_input?.skill
  ? `skill__${input.tool_input.skill}`
  : input.tool_name;

const event = {
  tool_name: effectiveToolName,
  tool_type: classifyTool(effectiveToolName),
  mcp_server: extractMcpServer(effectiveToolName),
  success: !input.tool_result?.error && input.tool_result?.isError !== true,
  duration_ms: input.duration_ms ?? null,
  session_id: input.session_id ?? null,
  user_alias: resolveAlias(config.userAlias),
  timestamp: new Date().toISOString(),
  project_hash: createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16),
};

await enqueue(event, config);
