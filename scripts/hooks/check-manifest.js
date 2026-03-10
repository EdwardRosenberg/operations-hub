#!/usr/bin/env node
import yaml from 'js-yaml';
import fs from 'fs';

const srcRoot = process.env.OPS_HUB_SRC_ROOT ?? 'src/main';
const staged = process.argv.slice(2).filter((f) => f.startsWith(srcRoot));
if (!staged.length) process.exit(0);

const manifestPath = 'ops-hub/features.yml';
if (!fs.existsSync(manifestPath)) {
  console.warn(`⚠️  [ops-hub] ${manifestPath} not found — run the bootstrap prompt to generate it`);
  process.exit(0);
}

const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8'));
const registered = new Set((manifest?.features ?? []).flatMap((f) => f.implementation ?? []));

let warned = false;
for (const file of staged) {
  if (!registered.has(file)) {
    console.warn(`⚠️  [ops-hub] Not in manifest: ${file}`);
    console.warn(`   Add it to ops-hub/features.yml under the relevant feature's "implementation" list.`);
    warned = true;
  }
}
if (warned) console.warn(`\n   Tip: ask your AI agent to update the manifest.\n`);
process.exit(0);
