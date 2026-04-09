import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_PATH = join(homedir(), '.claude', 'plugins', 'usage-tracker', 'config.json');

const DEFAULTS = {
  endpoint: 'http://localhost:3001/api/events',
  apiKey: null,
  userAlias: null,
  enabled: true,
  batchSize: 20,
  flushIntervalSeconds: 30,
};

export function loadConfig() {
  let userCfg = {};

  try {
    userCfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    // No config file — use defaults silently
  }

  const config = { ...DEFAULTS, ...userCfg };

  // Disable silently if no API key configured
  if (!config.apiKey) {
    config.enabled = false;
  }

  return config;
}

export function getQueueDir() {
  return join(homedir(), '.claude', 'plugins', 'usage-tracker');
}
