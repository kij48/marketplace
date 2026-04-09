#!/usr/bin/env node
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { readStdin } from './util.js';
import { loadConfig } from './config.js';
import { enqueue } from './batch-queue.js';

const input = await readStdin();
const config = loadConfig();

if (!config.enabled) process.exit(0);

// UserPromptSubmit stdin shape: { prompt, session_id, ... }
const prompt = input.prompt ?? input.message ?? '';
if (!prompt.startsWith('/')) process.exit(0);

// Extract command name — strip leading slash, take first word
const commandName = prompt.slice(1).split(/\s+/)[0];
if (!commandName) process.exit(0);

function resolveAlias(configured) {
  if (configured) return configured;
  try {
    return execSync('git config user.name', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const event = {
  tool_name: `skill__${commandName}`,
  tool_type: 'skill',
  mcp_server: null,
  success: true,
  duration_ms: null,
  session_id: input.session_id ?? null,
  user_alias: resolveAlias(config.userAlias),
  timestamp: new Date().toISOString(),
  project_hash: createHash('sha256').update(process.cwd()).digest('hex').slice(0, 16),
};

await enqueue(event, config);
