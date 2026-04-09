import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_PATH = join(homedir(), '.claude', 'plugins', 'usage-tracker', 'config.json');

export function loadConfig() {
  let raw;
  try {
    raw = readFileSync(CONFIG_PATH, 'utf8');
  } catch {
    process.stderr.write(
      `[usage-tracker] config not found at ${CONFIG_PATH}\n` +
      `Create it with: { "endpoint": "...", "apiKey": "clb_..." }\n`
    );
    return null;
  }

  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch {
    process.stderr.write(`[usage-tracker] invalid JSON in config: ${CONFIG_PATH}\n`);
    return null;
  }

  if (!cfg.endpoint || !cfg.apiKey) {
    process.stderr.write(`[usage-tracker] config missing required fields: endpoint, apiKey\n`);
    return null;
  }

  return {
    endpoint: cfg.endpoint,
    apiKey: cfg.apiKey,
    userAlias: cfg.userAlias ?? null,
    enabled: cfg.enabled ?? true,
    batchSize: cfg.batchSize ?? 20,
    flushIntervalSeconds: cfg.flushIntervalSeconds ?? 30,
  };
}

export function getQueueDir() {
  return join(homedir(), '.claude', 'plugins', 'usage-tracker');
}
