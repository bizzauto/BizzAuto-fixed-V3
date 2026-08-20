const { copyFileSync, mkdirSync, existsSync, cpSync } = require("fs");
const { join, dirname } = require("path");
const { fileURLToPath } = require("url");

const rootDir = join(__dirname, "..");
const serverDir = join(rootDir, "server");
const distDir = join(rootDir, "dist");
const distServerDir = join(distDir, "server");

if (!existsSync(distServerDir)) {
  mkdirSync(distServerDir, { recursive: true });
}

// Copy server files
const serverFiles = ["index.cjs"];
const serverDirs = ["routes", "data"];

for (const file of serverFiles) {
  const src = join(serverDir, file);
  const dest = join(distServerDir, file);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`  Copied: server/${file}`);
  }
}

for (const dir of serverDirs) {
  const src = join(serverDir, dir);
  const dest = join(distServerDir, dir);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`  Copied: server/${dir}/`);
  }
}

console.log("\n  Build complete! Run with: node dist/server/index.cjs\n");
