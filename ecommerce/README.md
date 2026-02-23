# E-commerce Microservices

A microservice-based e-commerce application covering the full purchase flow:
**Registration -> Search Products -> Add to Cart -> Order -> Payment**

## Architecture

```
┌─────────────┐
│  API Gateway │  :3000  ─ Routes requests, validates auth tokens
└──────┬──────┘
       │
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

### Microservices

| Service | Port | Responsibilities | Data Owned |
|---------|------|-----------------|------------|
| **API Gateway** | 3000 | Request routing, auth validation | None |
| **Auth Service** | 3001 | Registration, login, token management | Users, Tokens |
| **Product Service** | 3002 | Product catalog, search, stock | Products |
| **Cart Service** | 3003 | Shopping cart management | Carts |
| **Order Service** | 3004 | Order lifecycle management | Orders |
| **Payment Service** | 3005 | Payment processing, refunds | Payments |

### Design Principles

- **Single Responsibility**: Each service owns its domain data and logic
- **Data Isolation**: Each service has its own in-memory store
- **Loose Coupling**: Services communicate via HTTP (service client interfaces)
- **Dependency Injection**: Services accept client interfaces, enabling mock-based unit testing
- **API Gateway Pattern**: Single entry point handles auth and routing

## Project Structure

```
shared/
  types.ts                          Shared domain types + service client interfaces
  http-clients.ts                   HTTP implementations of service client interfaces
gateway/
  app.ts                            API Gateway (auth validation + request proxying)
  index.ts                          Gateway entry point
services/
  auth/src/
    store.ts                        In-memory user/token storage
    service.ts                      Auth business logic
    service.test.ts                 Unit tests (11 tests)
    routes.ts                       HTTP routes + /validate-token internal endpoint
    app.ts                          Express app factory
    index.ts                        Service entry point
  product/src/
    store.ts                        In-memory product storage
    service.ts                      Product catalog + search logic
    service.test.ts                 Unit tests (16 tests)
    routes.ts                       HTTP routes + internal stock endpoints
    app.ts                          Express app factory
    index.ts                        Service entry point
  cart/src/
    store.ts                        In-memory cart storage
    service.ts                      Cart management (calls Product Service)
    service.test.ts                 Unit tests (16 tests)
    routes.ts                       HTTP routes + internal cart endpoints
    app.ts                          Express app factory
    index.ts                        Service entry point
  order/src/
    store.ts                        In-memory order storage
    service.ts                      Order lifecycle (calls Cart + Product Services)
    service.test.ts                 Unit tests (15 tests)
    routes.ts                       HTTP routes + internal order endpoints
    app.ts                          Express app factory
    index.ts                        Service entry point
  payment/src/
    store.ts                        In-memory payment storage
    service.ts                      Payment processing (calls Order + Product Services)
    service.test.ts                 Unit tests (15 tests)
    routes.ts                       HTTP routes
    app.ts                          Express app factory
    index.ts                        Service entry point
tests/
  integration.test.ts               End-to-end integration tests (10 tests)
```

## Quick Start

```bash
npm install
npm test                # Run all tests (unit + integration)
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run dev             # Start all services + gateway
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint
```

### Start Individual Services

```bash
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

## Inter-Service Communication

Services communicate via HTTP using typed client interfaces (`ProductServiceClient`, `CartServiceClient`, `OrderServiceClient`). Each interface has:

- **HTTP implementation** (`shared/http-clients.ts`) for production use
- **Mock implementation** (in test files) for isolated unit testing

### Internal Endpoints (not exposed via gateway)

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Auth | POST /validate-token | Token validation for gateway |
| Product | GET /internal/:id | Product lookup for other services |
| Product | PUT /internal/stock/:id | Stock updates from Order/Payment |
| Cart | GET /internal/:userId | Cart retrieval for Order Service |
| Cart | DELETE /internal/:userId | Cart clearing after order |
| Order | GET /internal/:id | Order lookup for Payment Service |
| Order | PUT /internal/:id/status | Order status updates |

## Testing

All services have comprehensive unit tests using mock implementations of their dependencies. Integration tests spin up all services on random ports and test the full flow through the gateway.

```
Unit tests:    73 tests across 5 service modules
Integration:   10 tests covering full e-commerce flows
Total:         83 tests
```
