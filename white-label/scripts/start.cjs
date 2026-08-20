const { spawn } = require("child_process");
const { join } = require("path");

const rootDir = join(__dirname, "..");

console.log("\n  Starting ResellerPro White-Label System\n");
console.log("  Backend:  http://localhost:3001");
console.log("  Frontend: http://localhost:5174\n");

const server = spawn("node", ["server/index.cjs"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

const client = spawn("npx", ["vite", "--host", "0.0.0.0", "--port", "5174"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

process.on("SIGINT", () => {
  server.kill();
  client.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.kill();
  client.kill();
  process.exit(0);
});
