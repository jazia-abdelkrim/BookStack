# BookStack

A small full-stack e-commerce MVP for selling books: a React storefront, an Express API, and an admin dashboard for managing the catalogue, orders and customers. Prices are shown in **DZD**.

> **MVP status:** no online payment is collected. Customers place an *order request*, and an administrator tracks it and marks it paid by hand. Data is stored in a single JSON file, which suits one server instance and a small catalogue.

## Features

### Storefront
- Home page, library with search and category filter, authors page
- Customer registration and sign-in (JWT)
- Cart drawer and order requests for signed-in customers
- Stock is checked when an order is placed, and the ordered quantity is deducted

### Admin dashboard (`/admin`)
| Page | What it does |
|---|---|
| Dashboard | Revenue, order and customer counts, 14-day revenue chart, orders by status, top sellers, low-stock list (5 or fewer), recent orders |
| Orders | Search and filter by status, view line items, change order status (`received`, `processing`, `shipped`, `delivered`, `cancelled`) and payment status (`unpaid`, `paid`, `refunded`). Cancelling an order returns its items to stock |
| Books | Add, edit and delete books, with search and category filter. Manage price and stock |
| Authors | Add, edit and delete authors. An author who still has books cannot be deleted |
| Customers | Registered accounts with order count, total spent and last order date |

The admin interface is code-split, so storefront visitors never download it.

## Tech stack
- **Frontend:** React 19, React Router 7, Vite 8 (plain CSS)
- **Backend:** Node.js (20.19 or newer), Express 4, JSON-file database
- **Security:** bcrypt password hashing, JWT sessions (7 days), Helmet headers with a Content-Security-Policy, rate-limited login and registration, server-side role checks, input validation on all admin writes, atomic database writes

## Project structure
```
.
├── backend/
│   ├── server.js            # API, auth, admin routes, serves the built site in production
│   ├── data/db.json         # seed data (8 books, 17 authors)
│   ├── fill-authors*.js     # one-off helper scripts used to populate author data
│   └── .env.example
├── src/
│   ├── admin/               # admin dashboard (pages, components, styles, API client)
│   ├── components/          # storefront components
│   ├── pages/               # storefront pages
│   ├── context/             # cart state
│   └── services/            # API and auth helpers
├── Dockerfile
├── render.yaml              # Render blueprint
└── vite.config.js           # dev proxy: /api -> http://localhost:5001
```

## API overview

All routes are under `/api`. Admin routes require a `Bearer` token for an account with the `admin` role (`401` when signed out, `403` for customer accounts).

| Method and path | Access | Purpose |
|---|---|---|
| `GET /health` | public | Health check |
| `POST /auth/register`, `POST /auth/login` | public | Create account, sign in |
| `GET /auth/me` | signed in | Current user |
| `GET /books`, `GET /books/:id` | public | Catalogue (`search`, `authorId`, `category` filters) |
| `GET /authors`, `GET /authors/:id` | public | Authors |
| `POST /orders`, `GET /orders/mine` | signed in | Place an order, list own orders |
| `POST /books`, `PUT /books/:id`, `DELETE /books/:id` | admin | Manage books |
| `POST /authors`, `PUT /authors/:id`, `DELETE /authors/:id` | admin | Manage authors |
| `GET /admin/orders`, `PATCH /admin/orders/:id` | admin | List and update orders |
| `GET /admin/customers` | admin | Customer list with order totals |
| `GET /admin/stats` | admin | Dashboard figures |

