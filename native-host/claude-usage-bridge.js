#!/usr/bin/env node
// Chrome Native Messaging host — receives usage data from extension, writes to cache file
// This bridges Claude usage data to the local filesystem so terminal tools can read it.

const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheFile = path.join(os.homedir(), '.claude', 'cache', 'claude-usage.json');
const cacheDir = path.dirname(cacheFile);
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

// Native messaging protocol: 4-byte LE length prefix, then JSON
let buf = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0);
    if (buf.length < 4 + len) break;
    const msg = JSON.parse(buf.slice(4, 4 + len).toString('utf8'));
    buf = buf.slice(4 + len);
    fs.writeFileSync(cacheFile, JSON.stringify({ data: msg, fetched: Date.now() }));

    // Send response back to Chrome
    const reply = JSON.stringify({ ok: true });
    const header = Buffer.alloc(4);
    header.writeUInt32LE(reply.length, 0);
    process.stdout.write(header);
    process.stdout.write(reply);
  }
});
