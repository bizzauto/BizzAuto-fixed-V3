const express = require("express");
const router = express.Router();
const { getResellerId } = require("../prisma.cjs");
const prisma = require("../prisma.cjs");

const PLAN_PRICES = { STARTER: 999, PRO: 2499, ENTERPRISE: 9999 };

// GET /api/clients
router.get("/", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const clients = await prisma.wlClient.findMany({
      where: { resellerId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: {
        clients: clients.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString().split("T")[0],
        })),
      },
    });
  } catch (err) {
    console.error("Get clients error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch clients" });
  }
});

// POST /api/clients
router.post("/", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { name, email, phone, product, plan } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Name and email required" });
    }

    const newClient = await prisma.wlClient.create({
      data: {
        resellerId,
        name,
        email,
        phone: phone || "",
        product: product || "google-reviews",
        plan: plan || "STARTER",
        status: "pending",
      },
    });

    // Update reseller revenue
    await prisma.wlReseller.update({
      where: { id: resellerId },
      data: { revenue: { increment: PLAN_PRICES[newClient.plan] || 999 } },
    });

    res.status(201).json({
      success: true,
      data: {
        client: {
          ...newClient,
          createdAt: newClient.createdAt.toISOString().split("T")[0],
        },
      },
    });
  } catch (err) {
    console.error("Create client error:", err);
    res.status(500).json({ success: false, error: "Failed to create client" });
  }
});

// DELETE /api/clients/:id
router.delete("/:id", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const client = await prisma.wlClient.findFirst({
      where: { id: req.params.id, resellerId },
    });

    if (!client) {
      return res.status(404).json({ success: false, error: "Client not found" });
    }

    await prisma.wlClient.delete({ where: { id: req.params.id } });

    // Subtract revenue
    await prisma.wlReseller.update({
      where: { id: resellerId },
      data: { revenue: { decrement: PLAN_PRICES[client.plan] || 999 } },
    });

    res.json({ success: true, message: "Client removed" });
  } catch (err) {
    console.error("Delete client error:", err);
    res.status(500).json({ success: false, error: "Failed to delete client" });
  }
});

// PATCH /api/clients/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { status } = req.body;
    if (!["active", "pending", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const client = await prisma.wlClient.findFirst({
      where: { id: req.params.id, resellerId },
    });

    if (!client) {
      return res.status(404).json({ success: false, error: "Client not found" });
    }

    const updated = await prisma.wlClient.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, data: { client: updated } });
  } catch (err) {
    console.error("Update client status error:", err);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

// GET /api/clients/stats
router.get("/stats", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const [total, active, pending, suspended] = await Promise.all([
      prisma.wlClient.count({ where: { resellerId } }),
      prisma.wlClient.count({ where: { resellerId, status: "active" } }),
      prisma.wlClient.count({ where: { resellerId, status: "pending" } }),
      prisma.wlClient.count({ where: { resellerId, status: "suspended" } }),
    ]);

    res.json({
      success: true,
      data: { total, active, pending, suspended },
    });
  } catch (err) {
    console.error("Get client stats error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

module.exports = router;
