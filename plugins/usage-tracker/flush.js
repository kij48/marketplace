#!/usr/bin/env node
import { readStdin } from './util.js';
import { loadConfig } from './config.js';
import { flush } from './batch-queue.js';

// Stop hook may pass empty or session-summary stdin — ignore it
await readStdin();

const config = loadConfig();
if (!config || !config.enabled) process.exit(0);

const accepted = await flush(config);
if (accepted > 0) {
  process.stderr.write(`[usage-tracker] flushed ${accepted} events to leaderboard\n`);
}
