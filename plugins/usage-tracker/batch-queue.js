import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { sleep } from './util.js';
import { getQueueDir } from './config.js';

const MAX_QUEUE_SIZE = 1000;

function getQueuePath() { return join(getQueueDir(), '.queue.json'); }
function getLockPath() { return join(getQueueDir(), '.queue.lock'); }

function ensureDir() {
  mkdirSync(getQueueDir(), { recursive: true });
}

async function acquireLock() {
  const lockPath = getLockPath();
  for (let i = 0; i < 5; i++) {
    try {
      writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      await sleep(50 * (i + 1));
    }
  }
  return false;
}

function releaseLock() {
  try { unlinkSync(getLockPath()); } catch {}
}

function readQueue() {
  try {
    const raw = readFileSync(getQueuePath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeQueueData(events) {
  writeFileSync(getQueuePath(), JSON.stringify(events), 'utf8');
}

function postEvents(endpoint, events) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ events });
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const req = (isHttps ? httpsRequest : httpRequest)(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
          else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(10_000, () => { req.destroy(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

export async function enqueue(event, config) {
  ensureDir();
  const locked = await acquireLock();
  if (!locked) {
    process.stderr.write('[usage-tracker] could not acquire lock, dropping event\n');
    return;
  }

  try {
    const queue = readQueue();
    queue.push(event);

    // Drop oldest if over limit
    if (queue.length > MAX_QUEUE_SIZE) {
      const dropped = queue.splice(0, queue.length - MAX_QUEUE_SIZE);
      process.stderr.write(`[usage-tracker] queue overflow: dropped ${dropped.length} events\n`);
    }

    writeQueueData(queue);
  } finally {
    releaseLock();
  }

  if (readQueue().length >= config.batchSize) {
    await flush(config);
  }
}

export async function flush(config) {
  ensureDir();

  // Read queue under lock, then release before making the HTTP call
  const locked = await acquireLock();
  if (!locked) return;

  let events;
  try {
    events = readQueue();
  } finally {
    releaseLock();
  }

  if (events.length === 0) return;

  try {
    const result = await postEvents(config.endpoint, events);
    const accepted = result.accepted ?? events.length;

    // Clear queue under lock
    const locked2 = await acquireLock();
    if (locked2) {
      try {
        // Only clear events we successfully sent
        const remaining = readQueue().slice(accepted);
        writeQueueData(remaining);
      } finally {
        releaseLock();
      }
    }

    return accepted;
  } catch (err) {
    process.stderr.write(`[usage-tracker] flush failed: ${err.message}\n`);
    return 0;
  }
}
