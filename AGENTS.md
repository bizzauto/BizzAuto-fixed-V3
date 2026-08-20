# AGENTS.md - Project-Specific Guidance

## Quick Commands

```bash
# Development
npm run dev              # Frontend only (Vite + React)
npm run server           # Backend only (tsx watch)
npm run dev:full         # Frontend + Backend
npm run dev:all          # Frontend + Backend + Worker

# Build (both client + server)
npm run build            # Uses --noEmitOnError false, may show TS warnings but builds

# Database
npx prisma generate              # Generate Prisma client (run after schema changes)
npx prisma migrate dev           # Create + apply a new migration (development)
npx prisma migrate deploy        # Apply pending migrations (production)
npx prisma migrate dev --create-only  # Create migration file without applying
npx prisma studio                # Open DB GUI
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script  # SQL preview

# Migrations are now the primary way to manage schema changes
# prisma/db push is deprecated — always use prisma migrate for production

# Mobile (Capacitor)
cd mobile-app
npx cap sync android     # Sync web assets to Android
cd android && gradlew assembleDebug  # Build APK (requires JDK)
```

## Known Issues & Workarounds

- **Server build**: Uses `--noEmitOnError false` - TypeScript warnings appear but build succeeds. Check `dist/server/index.js` exists after build.
- **Prisma client**: Regenerate after any schema changes with `npx prisma generate`
- **Java for Android**: Mobile APK build requires JDK (uses Android Studio JBR at `C:\Program Files\Android\Android Studio\jbr`)

## Architecture

- **Frontend**: React 19 + Vite + TailwindCSS 4 in `src/`
- **Backend**: Express + TypeScript in `src/server/`
- **Database**: PostgreSQL + Prisma ORM in `prisma/schema.prisma`
- **Workers**: BullMQ background jobs in `src/server/workers/`
- **Mobile**: Capacitor (Android/iOS) in `mobile-app/`

## Key Files

- `package.json` - Root scripts (not mobile-app/package.json)
- `vite.config.ts` - Frontend build config
- `tsconfig.server.json` - Backend TypeScript config
- `prisma/schema.prisma` - Database schema (updated May 2026)
- `.env` - Environment variables (contains real API keys - DO NOT commit)

## CSS Classes Added (May 2026)

Futuristic UI utilities in `src/index.css`:
- `.glass-effect`, `.glass-dark` - Glassmorphism
- `.glow-effect`, `.glow-text`, `.neon-text` - Glow animations
- `.gradient-text`, `.gradient-animate` - Gradient animations
- `.btn-futuristic`, `.card-futuristic` - Component styles
- `:focus-visible` - Accessibility focus states
- CSS custom properties in `:root`

## Testing

- No explicit test framework configured
- Use `npm run build` to verify changes compile
- Server errors: check `dist/server/index.js` exists
- Client errors: check `dist/client/index.html` exists

## Security

- JWT secrets in `.env` - do not expose
- Real API keys present in `.env` (OpenRouter, Cloudflare, etc.)
- Use `JWT_SECRET` and `JWT_REFRESH_SECRET` with 32+ character strings