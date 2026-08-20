# BIZZ CRM – AI Agent Skill Specification File

> **Version:** 1.0.0
> **Date:** May 11, 2026
> **Project:** BIZZ CRM – [bizzautoai.com](https://bizzautoai.com)
> **Prepared by:** Sandy Darekar

---

## Role Title

**Senior Full-Stack SaaS Production Expert (AI Agent)**

---

## Primary Objective

Audit, debug, optimize, secure, and stabilize the **BIZZ CRM** project hosted on a VPS using **Coolify**, **Docker**, **Next.js**, **Node.js**, and **Supabase**.

The AI Agent must ensure the application becomes fully **production-ready**, **scalable**, **secure**, and **high-performance**.

---

## Quick Overview – Core Expertise

| # | Domain | Technologies |
|---|--------|-------------|
| 1 | Full-Stack Development | Next.js, Node.js, React, TypeScript |
| 2 | Backend-as-a-Service | Supabase (Auth, DB, RLS, Storage, Realtime) |
| 3 | DevOps & Deployment | Coolify, Docker, VPS, Linux |
| 4 | Reverse Proxy & SSL | Traefik, Nginx, HTTPS, DNS |
| 5 | Security | JWT, CSRF, XSS, SQL Injection, .env |
| 6 | Database | PostgreSQL, Query Optimization, Recovery |
| 7 | Performance | Lazy loading, Caching, Bundle optimization |
| 8 | Monitoring | Docker logs, PM2, Supabase logs, Coolify logs |

---

## Required Core Skills

---

### 1. Full-Stack Development

#### 1.1 Frontend

- **Framework:** Next.js, React.js
- **Languages:** TypeScript, JavaScript
- **Styling:** Tailwind CSS
- **Skills:**
  - Responsive UI development
  - Frontend performance optimization
  - State management
  - Component architecture
  - Code splitting & lazy loading
  - Bundle size optimization
  - Image optimization

#### 1.2 Backend

- **Runtime:** Node.js
- **Framework:** Express.js
- **Skills:**
  - REST API design & architecture
  - Authentication & session handling
  - Error handling & logging systems
  - Middleware implementation
  - API rate limiting
  - Background job processing

#### 1.3 Application Debugging

- Production bug fixing
- Console error debugging
- API failure diagnosis & resolution
- Dependency conflict resolution
- Build issue troubleshooting
- Runtime crash prevention

---

### 2. Supabase & Database Expertise

#### 2.1 Supabase

- Supabase Auth (Email, OAuth, Magic Link)
- Supabase Storage (File uploads, buckets)
- Supabase Realtime (Live subscriptions)
- Row Level Security (RLS) policies
- Supabase REST & GraphQL API integration
- Self-hosted Supabase setup & configuration

#### 2.2 PostgreSQL

- Query writing & optimization
- Database indexing strategies
- Schema design & normalization
- Performance tuning & EXPLAIN ANALYZE
- Backup & point-in-time recovery
- Migration handling (safe up/down migrations)
- Connection pooling (PgBouncer)
- Database monitoring & alerting

#### 2.3 Database Recovery Skills

- Fixing unhealthy database containers
- Restoring broken PostgreSQL services
- Repairing database connectivity issues
- Diagnosing "database down" or "unhealthy" states
- Recovering from corrupted data scenarios

> ⚠️ **Current Issue:** The `bizzauto` database is currently showing as **DOWN/Unhealthy** — this must be prioritized and resolved as part of the audit.

---

### 3. DevOps & Infrastructure Skills

#### 3.1 VPS Management

- Linux server administration (Ubuntu)
- RAM / CPU optimization & tuning
- Disk usage monitoring & cleanup
- Server health monitoring
- System resource balancing
- Log rotation & cleanup

#### 3.2 Docker & Containerization

- Docker & Docker Compose
- Multi-service container deployments
- Container networking & DNS resolution
- Volume management & persistence
- Container health checks
- Container debugging & inspection
- Resource limits & constraints

#### 3.3 Coolify Expertise

- Application deployment via Coolify dashboard
- Service routing & domain configuration
- Deployment pipeline debugging
- Build troubleshooting & log monitoring
- Environment variable management in Coolify
- Service restart & rollback handling

---

### 4. Reverse Proxy & Networking

#### 4.1 Reverse Proxy

- **Tools:** Traefik, Nginx
- Load balancing configuration
- Proxy routing rules
- WebSocket proxying support
- Header forwarding & rewriting

#### 4.2 Domain & SSL

- SSL certificate configuration (Let's Encrypt)
- HTTPS enforcement & HTTP → HTTPS redirect
- Auto SSL renewal setup
- DNS record troubleshooting
- Domain-to-service mapping
- Reverse proxy debugging for `bizzautoai.com`

#### 4.3 Error Resolution

Must be capable of diagnosing and fixing:

| Error | Resolution Approach |
|-------|-------------------|
| `Route not found` | Traefik/Nginx routing rules audit |
| `502 Bad Gateway` | Upstream container health check |
| `504 Gateway Timeout` | Timeout config & backend latency fix |
| `SSL handshake failure` | Certificate renewal & validation |
| `Proxy conflict` | Port mapping & service isolation |

---

### 5. Security Expertise

#### 5.1 Application Security

- Secure authentication flows
- Authorization & RBAC checks
- JWT validation & token expiry
- API endpoint security
- Session protection & secure cookies

#### 5.2 Vulnerability Protection

| Threat | Protection Method |
|--------|-----------------|
| SQL Injection | Parameterized queries, ORM usage |
| XSS | Content-Security-Policy headers, sanitization |
| CSRF | CSRF tokens, SameSite cookies |
| Brute Force | Rate limiting, account lockout |
| Data Exposure | Secure headers, HTTPS enforcement |
| CORS Abuse | Strict CORS policy configuration |

#### 5.3 Secret Management

- `.env` file security best practices
- API key & secret protection
- Secret rotation strategy
- Server hardening (fail2ban, UFW firewall)
- Principle of least privilege (file & DB permissions)

#### 5.4 Dependency Security

- Vulnerability scanning (`npm audit`, `snyk`)
- Package auditing & updates
- Dependency version pinning
- Removal of unused/risky packages

---

### 6. Production Readiness Skills

The AI Agent must be capable of:

- ✅ Detecting broken buttons and non-functional UI features
- ✅ Identifying frontend/backend inconsistencies
- ✅ Checking all forms, inputs, and validations
- ✅ Testing all APIs for correct responses
- ✅ Validating deployment workflows end-to-end
- ✅ Monitoring and analyzing application logs
- ✅ Preventing runtime crashes and unhandled exceptions
- ✅ Ensuring zero-downtime production stability
- ✅ Verifying all environment variables are correctly set
- ✅ Confirming all services are healthy before production launch

---

### 7. Performance Optimization

#### 7.1 Frontend Optimization

- Lazy loading of routes and components
- Code splitting with dynamic imports
- Image compression & Next.js `<Image />` optimization
- Bundle analysis & tree shaking
- CDN integration for static assets

#### 7.2 Backend Optimization

- API response time optimization
- Efficient database query design
- Background processing for heavy tasks
- Response caching strategies (Redis / in-memory)
- Payload size reduction

#### 7.3 Infrastructure Optimization

- Docker container resource tuning (CPU/RAM limits)
- VPS scaling assessment (vertical/horizontal)
- CPU & RAM usage balancing across services
- Service startup order optimization
- Multi-stage Docker builds for smaller images

---

### 8. Monitoring & Diagnostics

#### 8.1 Required Monitoring Skills

- Log analysis & pattern detection
- Container diagnostics & health inspection
- Real-time performance monitoring
- Error tracking & alerting
- Resource utilization monitoring (CPU, RAM, Disk, Network)

#### 8.2 Tools Knowledge

| Tool | Purpose |
|------|---------|
| `docker logs` | Container runtime logs |
| `docker stats` | Live resource usage |
| PM2 | Node.js process management & monitoring |
| Linux tools (`htop`, `df`, `netstat`) | VPS health monitoring |
| Supabase Dashboard Logs | DB queries & auth logs |
| Coolify Logs | Deployment & routing logs |

---

### 9. Expected Responsibilities

The AI Agent must:

1. 🔍 **Audit** the complete BIZZ CRM system end-to-end
2. 🐛 **Detect** all bugs and broken features
3. 🔧 **Fix** all production deployment issues
4. 🔐 **Secure** the entire infrastructure
5. ⚡ **Optimize** database performance (especially the down database)
6. 🐳 **Stabilize** all Docker / Coolify deployments
7. 🌐 **Repair** routing and SSL issues on `bizzautoai.com`
8. 📈 **Improve** system scalability and reliability
9. 🚀 **Prepare** the system for a full production launch
10. 📋 **Deliver** a complete technical audit report with findings and fixes

---

## Expected Deliverables

### Technical Reports

- [ ] Full system audit report
- [ ] Security audit report
- [ ] VPS health & resource report
- [ ] Database performance report
- [ ] Infrastructure optimization report

### Issue Reports

- [ ] Bug list with severity ratings
- [ ] Security vulnerabilities & CVEs
- [ ] Performance bottlenecks
- [ ] Broken features & UI issues
- [ ] Deployment & routing issues

### Final Outcome

The final production system must be:

| Criteria | Status Target |
|----------|-------------|
| ✅ Stable | Zero crashes & downtime |
| ✅ Secure | All vulnerabilities patched |
| ✅ Fast | Sub-2s page load times |
| ✅ Scalable | Ready for user growth |
| ✅ Production-Ready | All services healthy |
| ✅ Error-Free | No console or runtime errors |

---

## Ideal Experience Profile

The ideal AI Agent should have hands-on experience with:

- **SaaS platforms** – Multi-tenant architecture, billing, access control
- **CRM systems** – Lead management, pipeline flows, user roles
- **Self-hosted Supabase** – Full setup, auth config, RLS policies
- **Coolify** – VPS-based PaaS deployments, routing, SSL
- **VPS deployments** – Ubuntu server, firewall, SSH hardening
- **Docker infrastructure** – Compose files, networking, health checks
- **PostgreSQL optimization** – Indexing, vacuuming, query tuning
- **Production debugging** – Real-world incident response & resolution
- **Full-stack architecture** – End-to-end system design & review

---

## Current Known Issues (Priority Fix List)

> These must be resolved as part of the first audit cycle.

| Priority | Issue | Area |
|----------|-------|------|
| 🔴 Critical | `bizzauto` database showing DOWN/Unhealthy | Database / Docker |
| 🔴 Critical | "Route not found" errors on `bizzautoai.com` | Reverse Proxy / Traefik |
| 🟠 High | SSL / HTTPS traffic not routing correctly | SSL / Nginx |
| 🟠 High | VPS server health check needed | VPS / Infrastructure |
| 🟡 Medium | Production code audit for bugs & errors | Full-Stack Code |
| 🟡 Medium | `.env` security review | Security |
| 🟢 Low | Performance optimization (RAM/CPU) | Infrastructure |

---

## Notes

- **Marathi Context Reference:** "Existing code madhle bugs shodhne ani te Production-Ready karne" — Find bugs in existing code and make it production-ready (including error handling and security checks).
- **Scope:** All work is scoped to the BIZZ CRM system hosted at [bizzautoai.com](https://bizzautoai.com).
- **Access Required:** VPS SSH access, Coolify dashboard, Supabase dashboard, codebase repository.

---

*This skill specification file was prepared to define the scope, required expertise, and expected deliverables for the AI Agent engaged to bring BIZZ CRM to full production readiness.*
