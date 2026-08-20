const express = require("express");
const router = express.Router();

const PRODUCTS = [
  {
    id: "google-reviews",
    name: "AI Google Reviews QR",
    tagline: "Automate Google Reviews with AI",
    description: "AI-powered Google Review QR code system with auto-reply, review filtering, and NFC card integration.",
    icon: "Star",
    price: "₹499/mo",
    color: "#f59e0b",
    features: [
      "AI-powered Google Review QR codes",
      "Smart auto-reply to reviews",
      "Negative review filtering & redirect",
      "NFC card integration",
      "White-label branding",
      "Real-time review monitoring",
      "Review request automation",
      "Analytics dashboard",
    ],
  },
  {
    id: "digital-vcard",
    name: "Digital V-Card Maker",
    tagline: "Smart Digital Business Cards with NFC",
    description: "Create stunning digital business cards with 30+ templates, NFC support, media galleries, and full white-label customization.",
    icon: "CreditCard",
    price: "₹399/mo",
    color: "#6366f1",
    features: [
      "30+ ready-to-use templates",
      "NFC technology support",
      "Add products & services",
      "Social media integration",
      "Image & video galleries",
      "Fully editable anytime",
      "Powerful admin dashboard",
      "100% white-label solution",
    ],
  },
  {
    id: "website-builder",
    name: "Single Page Website Builder",
    tagline: "No-Code Website Builder for Businesses",
    description: "Build beautiful single-page websites in minutes. No coding required. Perfect for portfolios, landing pages, and small businesses.",
    icon: "Globe",
    price: "₹599/mo",
    color: "#14b8a6",
    features: [
      "Drag-and-drop no-code builder",
      "Responsive mobile-first design",
      "20+ professional templates",
      "Custom domain support",
      "SEO optimized",
      "Analytics integration",
      "Contact form builder",
      "White-label under your brand",
    ],
  },
];

// GET /api/products
router.get("/", (req, res) => {
  res.json({ success: true, data: { products: PRODUCTS } });
});

// GET /api/products/:id
router.get("/:id", (req, res) => {
  const product = PRODUCTS.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: "Product not found" });
  }
  res.json({ success: true, data: { product } });
});

module.exports = router;
