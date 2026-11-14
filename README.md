# BookStack — storefront + admin dashboard

React + Vite storefront, Express API, JSON-file database, JWT auth, and a full **admin dashboard** at `/admin`.

## Admin dashboard

| Page | What you can do |
|---|---|
| `/admin` | Revenue, orders, customers, 14-day revenue chart, order status breakdown, top sellers, low-stock alerts, recent orders |
| `/admin/orders` | Search/filter orders, view line items, change order status (received → processing → shipped → delivered / cancelled) and payment status (unpaid / paid / refunded). Cancelling returns items to stock |
| `/admin/books` | Add, edit, delete books; search and filter by category; price and stock management |
| `/admin/authors` | Add, edit, delete authors (an author with books can't be deleted) |
| `/admin/customers` | Registered accounts with order count, total spent and last order |

Access is restricted to users with `role: "admin"`. Every admin API route is checked server-side (`401` signed out, `403` customer accounts). The admin UI is code-split, so storefront visitors never download it.

The first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on server start (an existing account with that email is promoted). Sign in at `/admin/login`.

Placing an order now checks and decrements stock.

## Run locally

```bash
npm run install:all
cp backend/.env.example backend/.env      # edit ADMIN_EMAIL / ADMIN_PASSWORD
npm run server                            # terminal 1 — API on :5001
npm run dev                               # terminal 2 — site on :5173
```

In development, if `ADMIN_EMAIL` is not set, a default admin `admin@bookstack.local` / `admin12345` is created (never in production).

## Deploy (single service)

In production Express serves both the API and the built site from one origin, so there is no CORS or API-URL setup.

### Option A — Docker (any host: VPS, Fly.io, Railway, Render…)

```bash
docker build -t bookstack .
docker run -d -p 5001:5001 -v bookstack-data:/data \
  -e JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" \
  -e ADMIN_EMAIL=you@yourstore.com -e ADMIN_PASSWORD='a-long-strong-password' \
  bookstack
```

### Option B — Render
Push to GitHub, then **New → Blueprint** and select the repo (`render.yaml` is included). Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` when prompted. A paid instance is required for the persistent disk.

### Option C — plain Node on a VPS
```bash
npm run install:all && npm run build
cd backend && NODE_ENV=production PORT=5001 JWT_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... DATA_DIR=/var/data node server.js
```
Put Nginx/Caddy in front for HTTPS and set `TRUST_PROXY=true`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | prod | 32+ character random secret |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run | Creates/promotes the admin (password ≥ 10 chars in prod) |
| `DATA_DIR` | recommended | Folder for `db.json` — **mount a persistent disk/volume here** |
| `TRUST_PROXY` | behind a proxy | `true` so rate-limiting sees real client IPs |
| `FRONTEND_URL` | split hosting only | Comma-separated allowed origins |
| `VITE_API_URL` | split hosting only | Build-time API URL if the API is on another domain |
| `PORT` | no | Defaults to 5001 |

## Security included
Helmet headers + CSP, rate-limited login/register, bcrypt hashes, server-side role checks, input validation on every admin write, atomic database writes.

## Before taking real money
- Back up `db.json` regularly. The JSON database suits a single-instance MVP; move to SQLite/Postgres before scaling or running multiple instances.
- Add a payment provider (payment status is currently set manually by the admin).
- Add password reset, email notifications and monitoring.
