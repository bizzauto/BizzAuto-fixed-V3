# BizzAuto CRM - Marketing Posters

Editable HTML/CSS marketing posters for social media, app stores, and Google Ads.

## Quick Start

1. Open any `.html` file in your browser
2. Edit text/CSS directly in the HTML file
3. Take a screenshot or use browser DevTools to export as PNG

## Directory Structure

```
posters/
├── shared/
│   ├── brand-colors.css    # Edit colors here to change branding
│   └── base-styles.css     # Shared typography, glassmorphism, effects
├── social-media/           # Instagram, Facebook, LinkedIn posts
├── app-store/              # Play Store / App Store screenshots
└── google-ads/             # Display ad banners
```

## How to Edit

### Change Branding (Colors)
Edit `shared/brand-colors.css` — all CSS variables are documented:
- `--logo-start` / `--logo-end` — Logo teal gradient
- `--primary` — Main brand color (indigo)
- `--accent` — Accent color (pink)
- `--bg-primary` — Background color

### Change Text
Each HTML file has `<!-- EDIT: ... -->` comments marking editable sections. Search for these markers to find all customizable text.

### Change Fonts
Edit the `@import url(...)` line in `base-styles.css` or individual poster files.

## How to Export as PNG

### Method 1: Browser Screenshot (Recommended)
1. Open the HTML file in Chrome/Edge
2. Open DevTools (F12) → Console
3. Run:
```javascript
// For exact-size capture
const poster = document.querySelector('.poster');
const canvas = await html2canvas(poster);
const link = document.createElement('a');
link.download = 'poster.png';
link.href = canvas.toDataURL();
link.click();
```

### Method 2: DevTools Screenshot
1. Open the HTML file
2. Open DevTools (F12) → Elements
3. Right-click the `.poster` div → "Capture node screenshot"

### Method 3: Online Tool
Use [hcti.io](https://htmlcsstoimage.com) or similar HTML-to-image service.

## Poster Specifications

### Social Media (7 posters)
| File | Size | Platform |
|------|------|----------|
| `01-whatsapp-marketing-1080x1080.html` | 1080×1080 | Instagram/Facebook Square |
| `02-ai-crm-1080x1080.html` | 1080×1080 | Instagram/Facebook Square |
| `03-ecommerce-1080x1350.html` | 1080×1350 | Instagram/Facebook Portrait |
| `04-automation-1080x1350.html` | 1080×1350 | Instagram/Facebook Portrait |
| `05-multi-channel-1200x628.html` | 1200×628 | Facebook/LinkedIn Landscape |
| `06-pricing-plans-1080x1080.html` | 1080×1080 | Instagram/Facebook Square |
| `07-testimonial-social-proof-1080x1080.html` | 1080×1080 | Instagram/Facebook Square |

### App Store (3 screenshots)
| File | Size | Platform |
|------|------|----------|
| `01-feature-overview-1242x2688.html` | 1242×2688 | iPhone |
| `02-whatsapp-deep-dive-1242x2688.html` | 1242×2688 | iPhone |
| `03-ai-features-1242x2688.html` | 1242×2688 | iPhone |

### Google Ads (4 banners)
| File | Size | Type |
|------|------|------|
| `01-medium-rectangle-300x250.html` | 300×250 | Medium Rectangle |
| `02-leaderboard-728x90.html` | 728×90 | Leaderboard |
| `03-wide-skyscraper-160x600.html` | 160×600 | Wide Skyscraper |
| `04-mobile-banner-320x50.html` | 320×50 | Mobile Leaderboard |

## Features Highlighted

| Poster | Feature |
|--------|---------|
| WhatsApp Marketing | Bulk messaging, chatbot, templates |
| AI-Powered CRM | Lead scoring, pipeline, AI suggestions |
| E-Commerce | Online store, UPI/Razorpay, orders |
| Automation | Workflows, drip campaigns, triggers |
| Multi-Channel | FB, IG, LinkedIn, Email, SMS |
| Pricing | FREE to ENTERPRISE plans |
| Social Proof | Stats, testimonials, trust badges |

## Brand Colors Reference

| Name | Hex | Usage |
|------|-----|-------|
| Teal | `#0D9488` → `#14B8A6` | Logo, CTAs |
| Indigo | `#6366f1` | Primary UI |
| Violet | `#8b5cf6` | Secondary UI |
| Pink | `#ec4899` | Accent |
| Green | `#22c55e` | Success, WhatsApp |
| Dark BG | `#0f172a` | Backgrounds |
