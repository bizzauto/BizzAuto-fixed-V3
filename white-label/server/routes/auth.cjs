const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getResellerId } = require("../prisma.cjs");
const prisma = require("../prisma.cjs");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    const reseller = await prisma.wlReseller.findUnique({ where: { email } });

    if (!reseller) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    if (!reseller.isActive) {
      return res.status(403).json({ success: false, error: "Account is deactivated" });
    }

    const validPassword = await bcrypt.compare(password, reseller.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const clients = await prisma.wlClient.findMany({
      where: { resellerId: reseller.id },
    });

    const activeClients = clients.filter((c) => c.status === "active").length;
    const clientCount = clients.length;

    const { password: _, ...safeReseller } = reseller;

    res.json({
      success: true,
      data: {
        reseller: {
          ...safeReseller,
          clients: clientCount,
          activeClients,
          revenue: `₹${(reseller.revenue || 0).toLocaleString()}`,
        },
        clients: clients.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString().split("T")[0],
        })),
        token: "rp-token-" + reseller.id + "-" + Date.now(),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, company, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email and password required" });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    const existing = await prisma.wlReseller.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newReseller = await prisma.wlReseller.create({
      data: {
        name,
        email,
        password: hashedPassword,
        company: company || `${name}'s Company`,
        phone: phone || null,
        plan: "STARTER",
        domain: `${name.toLowerCase().replace(/\s+/g, "")}.resellerpro.com`,
      },
    });

    const { password: _, ...safeReseller } = newReseller;

    res.status(201).json({
      success: true,
      data: { reseller: safeReseller },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// GET /api/auth/profile
router.get("/profile", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const reseller = await prisma.wlReseller.findUnique({
      where: { id: resellerId },
    });

    if (!reseller) {
      return res.status(404).json({ success: false, error: "Reseller not found" });
    }

    const clients = await prisma.wlClient.findMany({
      where: { resellerId: reseller.id },
    });

    const { password: _, ...safeReseller } = reseller;

    res.json({
      success: true,
      data: {
        reseller: safeReseller,
        clients: clients.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString().split("T")[0],
        })),
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, error: "Failed to get profile" });
  }
});

module.exports = router;
