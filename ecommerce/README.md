# E-commerce Application

A TDD-built e-commerce web application covering the full purchase flow:
**Registration -> Search Products -> Add to Cart -> Order -> Payment**

## Architecture

- **Runtime**: Node.js + Express + TypeScript
- **Testing**: Vitest + Supertest
- **Data**: In-memory store (no database required)

## Project Structure

```
src/
  types.ts                          Domain types/interfaces
  app.ts                            Express app factory
  index.ts                          Server entry point
  store/
    in-memory-store.ts              In-memory data persistence
  services/
    auth.service.ts                 Registration & login
    auth.service.test.ts            Auth unit tests (11 tests)
    product.service.ts              Product catalog & search
    product.service.test.ts         Product unit tests (16 tests)
    cart.service.ts                 Shopping cart management
    cart.service.test.ts            Cart unit tests (16 tests)
    order.service.ts                Order creation & management
    order.service.test.ts           Order unit tests (15 tests)
    payment.service.ts              Payment processing & refunds
    payment.service.test.ts         Payment unit tests (15 tests)
  routes/
    auth.routes.ts                  POST /api/auth/register, /login
    product.routes.ts               GET/POST /api/products
    cart.routes.ts                  CRUD /api/cart (auth required)
    order.routes.ts                 CRUD /api/orders (auth required)
    payment.routes.ts               POST /api/payments (auth required)
    integration.test.ts             End-to-end integration tests (14 tests)
  middleware/
    auth.middleware.ts              Bearer token authentication
```

## Quick Start

```bash
npm install
npm test          # Run all 87 tests
npm run dev       # Start dev server on :3000
npm run typecheck # TypeScript type checking
npm run lint      # ESLint
```

## API Endpoints

| Method | Endpoint                     | Auth | Description               |
|--------|------------------------------|------|---------------------------|
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

## TDD Approach

All 87 tests were written **before** the implementation:

1. **RED** - Tests written first defining expected behavior
2. **GREEN** - Minimal implementation to make tests pass
3. **REFACTOR** - Code cleaned up while keeping tests green

Test breakdown:
- 73 unit tests across 5 service modules
- 14 integration tests covering HTTP routes and the full e-commerce flow
