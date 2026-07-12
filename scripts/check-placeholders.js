#!/usr/bin/env node
/**
 * check-placeholders.js
 * Fails if any publishable HTML file contains placeholder markers.
 * Run from project root: node scripts/check-placeholders.js
 * Automatically called by publish-sync.sh.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PATTERNS = [
  /\[GB_DATA:/,
  /\bTODO\b/,
  /\bTBD\b/,
  /\bPLACEHOLDER\b/,
  /PLACEHOLDER_/,
];

const EXCLUDED = new Set([
  'insights/_template/index.html',
  'motor-onderhoud-bijhouden/alternatief.html',
]);

function listHtmlFiles() {
  try {
    const out = execSync('git ls-files --others --cached --exclude-standard "*.html"', {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
    });
    return out.split('\n').filter(Boolean);
  } catch (_) {
    const out = execSync('find . -name "*.html" -not -path "*/node_modules/*"', {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
    });
    return out.split('\n').filter(Boolean).map(f => f.replace(/^\.\//, ''));
  }
}

const files = listHtmlFiles();
const failures = [];

for (const file of files) {
  if (EXCLUDED.has(file)) continue;
  if (!file.endsWith('index.html') && !file.endsWith('.html')) continue;

  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, 'utf8');

  for (const pattern of PATTERNS) {
    if (pattern.test(content)) {
      const match = content.match(pattern);
      failures.push(`${file}: contains placeholder matching "${match[0]}"`);
      break;
    }
  }
}

if (failures.length > 0) {
  console.error('Placeholder check FAILED:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}

console.log('Placeholder check passed: no placeholder markers found in publishable HTML.');
