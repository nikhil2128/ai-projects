# E-commerce Application

A full-stack e-commerce application with a React frontend and microservice-based backend covering the full purchase flow:
**Registration -> Search Products -> Add to Cart -> Order -> Payment**

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture Guide](docs/ARCHITECTURE.md) | System design, Mermaid diagrams, data models, service details, and design patterns |
| [API Reference](docs/API.md) | Complete API documentation with request/response examples and curl commands |
| This README | Quick start guide and project overview |

## Project Structure

```
ecommerce/
├── backend/                    Backend microservices (Node.js + Express)
│   ├── gateway/                  API Gateway (:3000)
│   ├── services/                 Domain microservices
│   │   ├── auth/src/               Auth Service (:3001)
│   │   ├── product/src/            Product Service (:3002)
│   │   ├── cart/src/               Cart Service (:3003)
│   │   ├── order/src/              Order Service (:3004)
│   │   └── payment/src/            Payment Service (:3005)
│   ├── shared/                   Shared types & inter-service HTTP clients
│   ├── tests/                    Integration tests
│   ├── scripts/                  Utility scripts (seed data)
│   ├── package.json
│   ├── tsconfig.json
│   └── eslint.config.mjs
│
├── frontend/                   React SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/           Reusable UI components
│   │   ├── context/              React context (auth state)
│   │   └── pages/                Route pages
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docs/                       Documentation
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── package.json                Root monorepo scripts
└── README.md
```

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   React SPA │────▶│  API Gateway │  :3000  ─ Routes requests, validates auth tokens
│    :5173    │     └──────┬──────┘
└─────────────┘            │
       ├──────────────────────────────────────────────┐
       │              │              │                │
┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌───────▼───────┐
│ Auth Service│ │  Product  │ │   Cart    │ │    Order      │
│    :3001    │ │  Service  │ │  Service  │ │   Service     │
│             │ │   :3002   │ │   :3003   │ │    :3004      │
│ Users       │ │ Products  │ │ Carts     │ │ Orders        │
│ Tokens      │ │ Stock     │ │           │ │               │
└─────────────┘ └───────────┘ └─────┬─────┘ └──┬────────┬───┘
                      ▲             │           │        │
                      │         calls Product   │    calls Cart
                      │             │           │    calls Product
                      └─────────────┘           │        │
                      ▲                         │        │
                      │              ┌──────────▼────────▼──┐
                      │              │   Payment Service     │
                      └──────────────│       :3005           │
                         calls       │  Payments             │
                         Product     └──────────┬────────────┘
                                                │
                                           calls Order
                                           calls Product
```

## Quick Start

### Install everything

```bash
npm run install:all
```

### Run the full stack (backend + frontend)

```bash
npm run dev
```

### Run backend or frontend individually

```bash
npm run dev:backend     # All microservices + gateway
npm run dev:frontend    # React dev server on :5173
```

### Seed product data

```bash
npm run seed            # Requires backend to be running
```

### Testing

```bash
npm test                # Run all tests (unit + integration)
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
```

### Other commands

```bash
npm run typecheck       # TypeScript type checking (backend)
npm run lint            # ESLint (backend)
npm run build:frontend  # Production build of frontend
```

## Backend Details

See `backend/package.json` for the full list of backend-specific scripts. You can run them directly:

```bash
cd backend
npm run dev:auth        # Auth service on :3001
npm run dev:product     # Product service on :3002
npm run dev:cart        # Cart service on :3003
npm run dev:order       # Order service on :3004
npm run dev:payment     # Payment service on :3005
npm run dev:gateway     # API Gateway on :3000
```

## API Endpoints (via Gateway :3000)

| Method | Endpoint                     | Auth | Description               |
|--------|------------------------------|------|---------------------------|
| GET    | /health                      | No   | Gateway health check      |
| POST   | /api/auth/register           | No   | Register a new user       |
| POST   | /api/auth/login              | No   | Login, get bearer token   |
| GET    | /api/products                | No   | Search/list products      |
| GET    | /api/products/:id            | No   | Get product by ID         |
| POST   | /api/products                | No   | Create a product          |
| GET    | /api/cart                    | Yes  | Get user's cart           |
| POST   | /api/cart/items              | Yes  | Add item to cart          |
| PUT    | /api/cart/items/:productId   | Yes  | Update item quantity      |
| DELETE | /api/cart/items/:productId   | Yes  | Remove item from cart     |
| DELETE | /api/cart                    | Yes  | Clear entire cart         |
| POST   | /api/orders                  | Yes  | Create order from cart    |
| GET    | /api/orders                  | Yes  | List user's orders        |
| GET    | /api/orders/:id              | Yes  | Get order details         |
| POST   | /api/orders/:id/cancel       | Yes  | Cancel an order           |
| POST   | /api/payments                | Yes  | Process payment           |
| GET    | /api/payments/:id            | Yes  | Get payment details       |
| GET    | /api/payments/order/:orderId | Yes  | Get payment by order      |
| POST   | /api/payments/:id/refund     | Yes  | Refund a payment          |

## Testing

All services have comprehensive unit tests using mock implementations of their dependencies. Integration tests spin up all services on random ports and test the full flow through the gateway.

```
Unit tests:    73 tests across 5 service modules
Integration:   10 tests covering full e-commerce flows
Total:         83 tests
```
