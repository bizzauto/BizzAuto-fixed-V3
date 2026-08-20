import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.join(__dirname, '../dist/server');

// CLEAN: Remove old tsc-compiled files that conflict with esbuild bundle
// These leftover .d.ts, .d.ts.map, and subdirectory files cause
// the redis npm package to be imported at runtime even though
// esbuild bundles everything into index.js
if (fs.existsSync(distDir)) {
  const clean = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(full, { recursive: true, force: true });
      } else if (entry.name !== 'index.js' && entry.name !== 'worker.js') {
        fs.rmSync(full, { force: true });
      }
    }
  };
  clean(distDir);
  console.log('🧹 Cleaned old dist/server files');
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

/** Common external packages for both server and worker */
const commonExternals = [
  // Node.js built-ins (must be external for ESM)
  'os', 'path', 'fs', 'crypto', 'url', 'stream', 'util', 'buffer',
  'http', 'https', 'net', 'tls', 'zlib', 'events', 'assert',
  // npm packages
  '@prisma/client',
  'bcryptjs',
  'jsonwebtoken',
  'openai',
  'googleapis',
  'nodemailer',
  'razorpay',
  'sharp',
  'speakeasy',
  'bullmq',
  'ioredis',
];

// Build main server
await esbuild.build({
  entryPoints: ['src/server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server/index.js',
  external: commonExternals,
  packages: 'external',
  format: 'esm',
  sourcemap: true,
  minify: false,
});
console.log('✅ Server built successfully');

// Build worker
await esbuild.build({
  entryPoints: ['src/server/worker.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server/worker.js',
  external: commonExternals,
  packages: 'external',
  format: 'esm',
  sourcemap: true,
  minify: false,
});
console.log('✅ Worker built successfully');
