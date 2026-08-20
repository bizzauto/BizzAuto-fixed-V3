const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const prisma = require("./prisma.cjs");

// Load .env file if dotenv is installed
try {
  require("dotenv").config();
} catch {
  // dotenv not installed, use process.env or defaults
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, etc.)
    // and any localhost:port combination, and the VPS IP
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|87\.76\.169\.6)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", require("./routes/auth.cjs"));
app.use("/api/clients", require("./routes/clients.cjs"));
app.use("/api/branding", require("./routes/branding.cjs"));
app.use("/api/products", require("./routes/products.cjs"));

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Serve static files in production
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback — serve index.html for any GET route that isn't an API call or static file
  // express.static handles real files; this catches SPA routes like /dashboard, /login
  app.get("/{*splat}", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 404 handler for API routes (catch-all at the end)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ success: false, error: "API route not found" });
  }
  next();
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("  ✓ Database connected");

    // Create separate schema for white-label tables (never conflict with BizzAuto's public schema)
    try {
      await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "wl_schema"');
      console.log("  ✓ Schema 'wl_schema' ready");
    } catch (schemaErr) {
      console.log("  ℹ️ Schema setup:", schemaErr.message);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n  ResellerPro Server running on http://localhost:${PORT}`);
      console.log(`  API:       http://localhost:${PORT}/api/health`);
      console.log(`  Frontend:  http://localhost:5174\n`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
