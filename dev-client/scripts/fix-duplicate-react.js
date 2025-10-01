#!/usr/bin/env node

/**
 * TODO: Remove this script once terraso-client-shared is updated to React 19 or uses peerDependencies
 *
 * This is a temporary workaround for the React version mismatch issue.
 * terraso-client-shared has React 18.3.1 in its dependencies, while this project uses React 19.1.0.
 * This causes the "React Element from an older version of React was rendered" error.
 *
 * This script removes the duplicate React modules from terraso-client-shared's node_modules
 * so it uses the React 19.1.0 from the root node_modules instead.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing duplicate React modules from terraso-client-shared...');

const packagesToRemove = ['react', 'react-dom', 'react-redux'];

packagesToRemove.forEach(pkg => {
  const pkgPath = path.join('node_modules', 'terraso-client-shared', 'node_modules', pkg);

  if (fs.existsSync(pkgPath)) {
    fs.rmSync(pkgPath, { recursive: true, force: true });
    console.log(`  ✅ Removed duplicate ${pkg}`);
  }
});

console.log('✨ Done!');