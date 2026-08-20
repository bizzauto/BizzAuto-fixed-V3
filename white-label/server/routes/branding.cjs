const express = require("express");
const router = express.Router();
const { getResellerId } = require("../prisma.cjs");
const prisma = require("../prisma.cjs");

// GET /api/branding
router.get("/", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const reseller = await prisma.wlReseller.findUnique({
      where: { id: resellerId },
    });

    if (!reseller) return res.status(404).json({ success: false, error: "Reseller not found" });

    res.json({
      success: true,
      data: {
        company: reseller.company,
        domain: reseller.domain,
        logo: reseller.logo,
        primaryColor: reseller.primaryColor,
      },
    });
  } catch (err) {
    console.error("Get branding error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch branding" });
  }
});

// PUT /api/branding
router.put("/", async (req, res) => {
  try {
    const resellerId = getResellerId(req.headers.authorization);
    if (!resellerId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { company, domain, logo, primaryColor } = req.body;

    const reseller = await prisma.wlReseller.findUnique({
      where: { id: resellerId },
    });

    if (!reseller) return res.status(404).json({ success: false, error: "Reseller not found" });

    // Track changes for audit log
    const changes = [];
    if (company !== undefined && company !== reseller.company) changes.push({ field: "company", oldValue: reseller.company, newValue: company });
    if (domain !== undefined && domain !== reseller.domain) changes.push({ field: "domain", oldValue: reseller.domain, newValue: domain });
    if (logo !== undefined && logo !== reseller.logo) changes.push({ field: "logo", oldValue: reseller.logo, newValue: logo });
    if (primaryColor !== undefined && primaryColor !== reseller.primaryColor) changes.push({ field: "primaryColor", oldValue: reseller.primaryColor, newValue: primaryColor });

    const updated = await prisma.wlReseller.update({
      where: { id: resellerId },
      data: {
        ...(company !== undefined && { company }),
        ...(domain !== undefined && { domain }),
        ...(logo !== undefined && { logo }),
        ...(primaryColor !== undefined && { primaryColor }),
      },
    });

    // Log changes
    if (changes.length > 0) {
      await prisma.wlBrandingLog.createMany({
        data: changes.map((c) => ({
          resellerId,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
      });
    }

    res.json({
      success: true,
      data: {
        company: updated.company,
        domain: updated.domain,
        logo: updated.logo,
        primaryColor: updated.primaryColor,
      },
    });
  } catch (err) {
    console.error("Update branding error:", err);
    res.status(500).json({ success: false, error: "Failed to update branding" });
  }
});

module.exports = router;
