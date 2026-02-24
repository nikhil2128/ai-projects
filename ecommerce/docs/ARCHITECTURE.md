# Architecture Documentation

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Service Dependency Graph](#service-dependency-graph)
- [Request Flow Through the Gateway](#request-flow-through-the-gateway)
- [Authentication Flow](#authentication-flow)
- [Core Business Flows](#core-business-flows)
  - [User Registration & Login](#user-registration--login)
  - [Product Browsing](#product-browsing)
  - [Cart Management](#cart-management)
  - [Order Creation](#order-creation)
  - [Payment Processing](#payment-processing)
  - [Refund Processing](#refund-processing)
- [Data Architecture](#data-architecture)
  - [Domain Model](#domain-model)
  - [Entity Relationships](#entity-relationships)
  - [Data Ownership](#data-ownership)
- [Service Details](#service-details)
  - [API Gateway](#api-gateway)
  - [Auth Service](#auth-service)
  - [Product Service](#product-service)
  - [Cart Service](#cart-service)
  - [Order Service](#order-service)
  - [Payment Service](#payment-service)
- [Inter-Service Communication](#inter-service-communication)
- [Design Patterns](#design-patterns)
- [Tech Stack](#tech-stack)
- [Testing Architecture](#testing-architecture)
- [Known Limitations & Future Improvements](#known-limitations--future-improvements)

---

## System Overview

This is a **microservices-based e-commerce application** built with TypeScript and Express.js. It covers the full purchase lifecycle:

> **Register → Browse Products → Add to Cart → Place Order → Pay**

The system is composed of **5 domain services** and an **API Gateway**, each running as an independent process with its own in-memory data store.

---

## High-Level Architecture

```mermaid
graph TB
    Client["🖥️ Client Application"]

    subgraph Gateway["API Gateway :3000"]
        GW["Request Router<br/>+ Auth Middleware"]
    end

    subgraph Services["Microservices"]
        AUTH["Auth Service<br/>:3001"]
        PROD["Product Service<br/>:3002"]
        CART["Cart Service<br/>:3003"]
        ORD["Order Service<br/>:3004"]
        PAY["Payment Service<br/>:3005"]
    end

    subgraph DataStores["In-Memory Data Stores"]
        DS_AUTH["Users<br/>Tokens"]
        DS_PROD["Products"]
        DS_CART["Carts"]
        DS_ORD["Orders"]
        DS_PAY["Payments"]
    end

    Client -->|"HTTP Requests"| GW
    GW -->|"/api/auth/*"| AUTH
    GW -->|"/api/products/*"| PROD
    GW -->|"/api/cart/*"| CART
    GW -->|"/api/orders/*"| ORD
    GW -->|"/api/payments/*"| PAY

    AUTH --- DS_AUTH
    PROD --- DS_PROD
    CART --- DS_CART
    ORD --- DS_ORD
    PAY --- DS_PAY

    style Gateway fill:#4A90D9,color:#fff
    style AUTH fill:#E8A838,color:#fff
    style PROD fill:#50C878,color:#fff
    style CART fill:#9B59B6,color:#fff
    style ORD fill:#E74C3C,color:#fff
    style PAY fill:#1ABC9C,color:#fff
```

### Port Allocation

| Service | Port | URL |
|---------|------|-----|
| API Gateway | `3000` | `http://localhost:3000` |
| Auth Service | `3001` | `http://localhost:3001` |
| Product Service | `3002` | `http://localhost:3002` |
| Cart Service | `3003` | `http://localhost:3003` |
| Order Service | `3004` | `http://localhost:3004` |
| Payment Service | `3005` | `http://localhost:3005` |

---

## Service Dependency Graph

This diagram shows how services depend on each other for data and operations. All inter-service calls are synchronous HTTP requests.

```mermaid
graph LR
    GW["API Gateway"]
    AUTH["Auth Service"]
    PROD["Product Service"]
    CART["Cart Service"]
    ORD["Order Service"]
    PAY["Payment Service"]

    GW -->|"validate token"| AUTH
    GW -->|"proxy requests"| PROD
    GW -->|"proxy requests"| CART
    GW -->|"proxy requests"| ORD
    GW -->|"proxy requests"| PAY

    CART -->|"validate product<br/>& fetch price"| PROD
    ORD -->|"get cart items"| CART
    ORD -->|"clear cart"| CART
    ORD -->|"validate stock<br/>& decrement stock"| PROD
    PAY -->|"get order details<br/>& update status"| ORD
    PAY -->|"restore stock<br/>(on refund)"| PROD

    style GW fill:#4A90D9,color:#fff
    style AUTH fill:#E8A838,color:#fff
    style PROD fill:#50C878,color:#fff
    style CART fill:#9B59B6,color:#fff
    style ORD fill:#E74C3C,color:#fff
    style PAY fill:#1ABC9C,color:#fff
```

**Key observations:**
- **Product Service** is the most depended-upon service (called by Cart, Order, and Payment)
- **Auth Service** is only called by the Gateway for token validation
- **Cart Service** has no downstream dependents (only called by Order Service)
- No circular dependencies exist

---

## Request Flow Through the Gateway

Every client request passes through the API Gateway, which handles authentication and proxying.

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant SVC as Target Service

    C->>GW: HTTP Request with<br/>Authorization: Bearer <token>

    alt Public Route (/api/auth/*, /api/products/*)
        GW->>SVC: Proxy request directly
        SVC-->>GW: Response
        GW-->>C: Response
    else Protected Route (/api/cart/*, /api/orders/*, /api/payments/*)
        GW->>AUTH: POST /validate-token<br/>{token}
        alt Valid Token
            AUTH-->>GW: {valid: true, userId: "..."}
            GW->>SVC: Proxy request +<br/>x-user-id header
            SVC-->>GW: Response
            GW-->>C: Response
        else Invalid Token
            AUTH-->>GW: {valid: false}
            GW-->>C: 401 Unauthorized
        end
    end
```

### Public vs. Protected Routes

| Route Pattern | Authentication | Behavior |
|--------------|----------------|----------|
| `GET /health` | Not required | Returns gateway health status |
| `/api/auth/*` | Not required | Proxied directly to Auth Service |
| `/api/products/*` | Not required | Proxied directly to Product Service |
| `/api/cart/*` | **Required** | Token validated, then proxied with `x-user-id` |
| `/api/orders/*` | **Required** | Token validated, then proxied with `x-user-id` |
| `/api/payments/*` | **Required** | Token validated, then proxied with `x-user-id` |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant AUTH as Auth Service

    Note over C,AUTH: Registration
    C->>GW: POST /api/auth/register<br/>{email, name, password}
    GW->>AUTH: POST /register
    AUTH->>AUTH: Validate input<br/>Hash password (bcrypt)<br/>Store user
    AUTH-->>GW: {id, email, name, createdAt}
    GW-->>C: 201 Created

    Note over C,AUTH: Login
    C->>GW: POST /api/auth/login<br/>{email, password}
    GW->>AUTH: POST /login
    AUTH->>AUTH: Find user by email<br/>Verify password hash<br/>Generate UUID token
    AUTH-->>GW: {userId, email, token}
    GW-->>C: 200 OK with token

    Note over C,AUTH: Using Protected Routes
    C->>GW: GET /api/cart<br/>Authorization: Bearer <token>
    GW->>AUTH: POST /validate-token {token}
    AUTH->>AUTH: Look up token → userId
    AUTH-->>GW: {valid: true, userId}
    GW->>GW: Inject x-user-id header
    GW->>GW: Proxy to Cart Service
```

### Security Measures

| Feature | Implementation |
|---------|---------------|
| Password storage | bcrypt hash (salt rounds: 10) |
| Token format | UUID v4 |
| Token storage | In-memory map (token → userId) |
| Email validation | Regex pattern matching |
| Password policy | Minimum 8 characters |
| User isolation | `x-user-id` header enforced per request |

---

## Core Business Flows

### User Registration & Login

```mermaid
stateDiagram-v2
    [*] --> Register: POST /api/auth/register
    Register --> ValidateInput: Check email format,<br/>password length, name
    ValidateInput --> CheckDuplicate: Check email uniqueness
    CheckDuplicate --> HashPassword: bcrypt hash
    HashPassword --> StoreUser: Save to AuthStore
    StoreUser --> Registered: Return user (no password)

    [*] --> Login: POST /api/auth/login
    Login --> FindUser: Lookup by email
    FindUser --> VerifyPassword: Compare bcrypt hash
    VerifyPassword --> GenerateToken: Create UUID token
    GenerateToken --> StoreToken: Save token → userId mapping
    StoreToken --> LoggedIn: Return token
```

### Product Browsing

```mermaid
flowchart LR
    A["Client"] -->|"GET /api/products?keyword=phone&category=electronics"| B["Gateway"]
    B -->|"Proxy"| C["Product Service"]
    C -->|"Search by keyword,<br/>category, price range"| D["Product Store"]
    D -->|"Filtered results"| C
    C -->|"Product[]"| B
    B -->|"200 OK"| A
```

Search supports the following query parameters:
- `keyword` — matches against product name and description (case-insensitive)
- `category` — exact category match
- `minPrice` / `maxPrice` — price range filter

### Cart Management

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant CART as Cart Service
    participant PROD as Product Service

    Note over C, PROD: Add Item to Cart
    C->>GW: POST /api/cart/items<br/>{productId, quantity}
    GW->>GW: Validate token, inject x-user-id
    GW->>CART: POST /items<br/>x-user-id header
    CART->>PROD: GET /internal/{productId}
    PROD-->>CART: Product details (name, price, stock)
    CART->>CART: Validate stock >= quantity
    CART->>CART: Add/update item in cart
    CART-->>GW: Updated Cart
    GW-->>C: 200 OK

    Note over C, PROD: Update Quantity
    C->>GW: PUT /api/cart/items/{productId}<br/>{quantity}
    GW->>CART: PUT /items/{productId}
    CART->>PROD: GET /internal/{productId}
    PROD-->>CART: Product details
    CART->>CART: Validate stock >= new quantity
    CART->>CART: Update quantity
    CART-->>GW: Updated Cart
    GW-->>C: 200 OK
```

### Order Creation

This is one of the most complex flows, involving three services:

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant ORD as Order Service
    participant CART as Cart Service
    participant PROD as Product Service

    C->>GW: POST /api/orders<br/>{shippingAddress}
    GW->>ORD: POST / (x-user-id)

    ORD->>CART: GET /internal/{userId}
    CART-->>ORD: Cart with items

    ORD->>ORD: Validate cart is not empty

    loop For each item in cart
        ORD->>PROD: GET /internal/{productId}
        PROD-->>ORD: Product (with current stock)
        ORD->>ORD: Validate stock >= quantity
    end

    loop For each item in cart
        ORD->>PROD: PUT /internal/stock/{productId}<br/>{stock: stock - quantity}
        PROD-->>ORD: Updated product
    end

    ORD->>ORD: Create order<br/>status = "pending"

    ORD->>CART: DELETE /internal/{userId}
    CART-->>ORD: Cart cleared

    ORD-->>GW: Order created
    GW-->>C: 201 Created
```

**Order Status Lifecycle:**

```mermaid
stateDiagram-v2
    [*] --> pending: Order created
    pending --> confirmed: Payment completed
    confirmed --> shipped: Shipping update
    shipped --> delivered: Delivery confirmed
    pending --> cancelled: User cancels /<br/>Payment refunded
    confirmed --> cancelled: Order cancelled

    note right of pending: Stock decremented<br/>Cart cleared
    note right of confirmed: Payment processed
    note right of cancelled: Stock restored<br/>(if refunded)
```

### Payment Processing

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant PAY as Payment Service
    participant ORD as Order Service

    C->>GW: POST /api/payments<br/>{orderId, method}
    GW->>PAY: POST / (x-user-id)

    PAY->>ORD: GET /internal/{orderId}
    ORD-->>PAY: Order details

    PAY->>PAY: Validate order belongs to user
    PAY->>PAY: Validate order status = "pending"
    PAY->>PAY: Validate no existing payment

    PAY->>PAY: Simulate payment processing<br/>Generate transactionId

    alt Payment Succeeds
        PAY->>PAY: Set payment status = "completed"
        PAY->>ORD: PUT /internal/{orderId}/status<br/>{status: "confirmed"}
        ORD-->>PAY: Order updated
    else Payment Fails
        PAY->>PAY: Set payment status = "failed"
    end

    PAY-->>GW: Payment result
    GW-->>C: 201 Created
```

### Refund Processing

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant PAY as Payment Service
    participant ORD as Order Service
    participant PROD as Product Service

    C->>GW: POST /api/payments/{id}/refund
    GW->>PAY: POST /{id}/refund (x-user-id)

    PAY->>PAY: Validate payment belongs to user
    PAY->>PAY: Validate payment status = "completed"

    PAY->>PAY: Set payment status = "refunded"

    PAY->>ORD: GET /internal/{orderId}
    ORD-->>PAY: Order with items

    PAY->>ORD: PUT /internal/{orderId}/status<br/>{status: "cancelled"}
    ORD-->>PAY: Order updated

    loop For each item in order
        PAY->>PROD: GET /internal/{productId}
        PROD-->>PAY: Product (current stock)
        PAY->>PROD: PUT /internal/stock/{productId}<br/>{stock: stock + quantity}
        PROD-->>PAY: Stock restored
    end

    PAY-->>GW: Refund completed
    GW-->>C: 200 OK
```

---

## Data Architecture

### Domain Model

```mermaid
classDiagram
    class User {
        +string id
        +string email
        +string name
        +string passwordHash
        +Date createdAt
    }

    class Product {
        +string id
        +string name
        +string description
        +number price
        +string category
        +number stock
        +string imageUrl
        +Date createdAt
    }

    class Cart {
        +string id
        +string userId
        +CartItem[] items
        +Date updatedAt
    }

    class CartItem {
        +string productId
        +string productName
        +number price
        +number quantity
    }

    class Order {
        +string id
        +string userId
        +OrderItem[] items
        +number totalAmount
        +OrderStatus status
        +string shippingAddress
        +string paymentId
        +Date createdAt
        +Date updatedAt
    }

    class OrderItem {
        +string productId
        +string productName
        +number price
        +number quantity
    }

    class Payment {
        +string id
        +string orderId
        +string userId
        +number amount
        +PaymentMethod method
        +PaymentStatus status
        +string transactionId
        +Date createdAt
    }

    User "1" --> "0..1" Cart : owns
    User "1" --> "*" Order : places
    User "1" --> "*" Payment : makes
    Cart "1" --> "*" CartItem : contains
    Order "1" --> "*" OrderItem : contains
    Order "1" --> "0..1" Payment : paid by
    Product "1" --> "*" CartItem : referenced in
    Product "1" --> "*" OrderItem : referenced in
```

### Entity Relationships

```mermaid
erDiagram
    USER ||--o| CART : "has"
    USER ||--o{ ORDER : "places"
    USER ||--o{ PAYMENT : "makes"
    CART ||--o{ CART_ITEM : "contains"
    ORDER ||--o{ ORDER_ITEM : "contains"
    ORDER ||--o| PAYMENT : "paid by"
    PRODUCT ||--o{ CART_ITEM : "in"
    PRODUCT ||--o{ ORDER_ITEM : "in"

    USER {
        string id PK
        string email UK
        string name
        string passwordHash
        date createdAt
    }

    PRODUCT {
        string id PK
        string name
        string description
        number price
        string category
        number stock
        string imageUrl
        date createdAt
    }

    CART {
        string id PK
        string userId FK
        date updatedAt
    }

    CART_ITEM {
        string productId FK
        string productName
        number price
        number quantity
    }

    ORDER {
        string id PK
        string userId FK
        number totalAmount
        string status
        string shippingAddress
        string paymentId FK
        date createdAt
        date updatedAt
    }

    ORDER_ITEM {
        string productId FK
        string productName
        number price
        number quantity
    }

    PAYMENT {
        string id PK
        string orderId FK
        string userId FK
        number amount
        string method
        string status
        string transactionId
        date createdAt
    }
```

### Data Ownership

Each service owns its data exclusively. No service reads or writes another service's store directly.

```mermaid
graph TB
    subgraph AuthService["Auth Service"]
        AU["Users (Map)"]
        AT["Tokens (Map)"]
    end

    subgraph ProductService["Product Service"]
        PP["Products (Map)"]
    end

    subgraph CartService["Cart Service"]
        CC["Carts (Map)"]
    end

    subgraph OrderService["Order Service"]
        OO["Orders (Map)"]
    end

    subgraph PaymentService["Payment Service"]
        PM["Payments (Map)<br/>+ OrderId Index (Map)"]
    end

    style AuthService fill:#FFF3E0,stroke:#E8A838
    style ProductService fill:#E8F5E9,stroke:#50C878
    style CartService fill:#F3E5F5,stroke:#9B59B6
    style OrderService fill:#FFEBEE,stroke:#E74C3C
    style PaymentService fill:#E0F2F1,stroke:#1ABC9C
```

### Enumerations

**OrderStatus:**
| Value | Description |
|-------|-------------|
| `pending` | Order created, awaiting payment |
| `confirmed` | Payment completed successfully |
| `shipped` | Order has been shipped |
| `delivered` | Order delivered to customer |
| `cancelled` | Order cancelled (by user or refund) |

**PaymentStatus:**
| Value | Description |
|-------|-------------|
| `pending` | Payment initiated |
| `completed` | Payment processed successfully |
| `failed` | Payment processing failed |
| `refunded` | Payment has been refunded |

**PaymentMethod:**
| Value | Description |
|-------|-------------|
| `credit_card` | Credit card payment |
| `debit_card` | Debit card payment |
| `paypal` | PayPal payment |

---

## Service Details

### API Gateway

| | |
|---|---|
| **Port** | 3000 |
| **Owns Data** | None |
| **Responsibilities** | Request routing, authentication enforcement, request proxying |

The gateway is the single entry point for all client requests. It:

1. Receives incoming HTTP requests
2. Determines if the route is public or protected
3. For protected routes, validates the Bearer token via the Auth Service
4. Injects the `x-user-id` header into authenticated requests
5. Proxies the request to the appropriate downstream service
6. Returns the response to the client

### Auth Service

| | |
|---|---|
| **Port** | 3001 |
| **Owns Data** | Users, Tokens |
| **Responsibilities** | User registration, login, token generation & validation |

**Key behaviors:**
- Email must be unique and match a valid email pattern
- Password must be at least 8 characters, stored as bcrypt hash
- Tokens are UUID v4 strings mapped to user IDs
- The `/validate-token` endpoint is internal-only (used by Gateway)

### Product Service

| | |
|---|---|
| **Port** | 3002 |
| **Owns Data** | Products |
| **Responsibilities** | Product CRUD, catalog search, stock management |

**Key behaviors:**
- Products require name, description, price (> 0), category, and stock (>= 0)
- Search supports keyword (name/description), category, and price range filters
- Internal endpoints allow other services to look up products and update stock
- Stock validation and updates are central to order/payment flows

### Cart Service

| | |
|---|---|
| **Port** | 3003 |
| **Owns Data** | Carts |
| **Dependencies** | Product Service |
| **Responsibilities** | Cart CRUD, item management |

**Key behaviors:**
- Each user has at most one cart (created on first item add)
- Adding a product calls the Product Service to validate existence and stock
- Product name and price are denormalized into cart items
- If quantity is set to 0, the item is removed from the cart

### Order Service

| | |
|---|---|
| **Port** | 3004 |
| **Owns Data** | Orders |
| **Dependencies** | Cart Service, Product Service |
| **Responsibilities** | Order creation, lifecycle management |

**Key behaviors:**
- Creating an order pulls items from the user's cart
- Stock is validated and decremented for each item
- Cart is cleared after successful order creation
- Users can cancel orders that are in `pending` or `confirmed` status
- Stock is restored upon cancellation

### Payment Service

| | |
|---|---|
| **Port** | 3005 |
| **Owns Data** | Payments |
| **Dependencies** | Order Service, Product Service |
| **Responsibilities** | Payment processing, refund handling |

**Key behaviors:**
- Payment can only be made for orders in `pending` status
- Each order can have at most one payment
- Successful payment updates order status to `confirmed`
- Refunds restore stock for all items in the order and cancel the order
- Payment method must be one of: `credit_card`, `debit_card`, `paypal`

---

## Inter-Service Communication

All service-to-service communication uses **synchronous HTTP calls** through typed client interfaces.

### Communication Architecture

```mermaid
graph TB
    subgraph Interfaces["Client Interfaces (shared/types.ts)"]
        I1["ProductServiceClient"]
        I2["CartServiceClient"]
        I3["OrderServiceClient"]
    end

    subgraph HttpClients["HTTP Implementations (shared/http-clients.ts)"]
        H1["HttpProductClient"]
        H2["HttpCartClient"]
        H3["HttpOrderClient"]
    end

    subgraph MockClients["Mock Implementations (test files)"]
        M1["MockProductClient"]
        M2["MockCartClient"]
        M3["MockOrderClient"]
    end

    I1 -.->|implements| H1
    I1 -.->|implements| M1
    I2 -.->|implements| H2
    I2 -.->|implements| M2
    I3 -.->|implements| H3
    I3 -.->|implements| M3

    H1 -->|"HTTP"| PROD["Product Service"]
    H2 -->|"HTTP"| CART["Cart Service"]
    H3 -->|"HTTP"| ORD["Order Service"]
```

### Internal Endpoints

These endpoints are used exclusively for service-to-service communication and are not exposed through the API Gateway.

| Service | Method | Endpoint | Called By | Purpose |
|---------|--------|----------|-----------|---------|
| Auth | `POST` | `/validate-token` | Gateway | Validate auth token and return userId |
| Product | `GET` | `/internal/:id` | Cart, Order, Payment | Fetch product details |
| Product | `PUT` | `/internal/stock/:id` | Order, Payment | Update product stock level |
| Cart | `GET` | `/internal/:userId` | Order | Retrieve a user's cart |
| Cart | `DELETE` | `/internal/:userId` | Order | Clear a user's cart |
| Order | `GET` | `/internal/:id` | Payment | Fetch order details |
| Order | `PUT` | `/internal/:id/status` | Payment | Update order status |

---

## Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **API Gateway** | `gateway/app.ts` | Single entry point for all clients; centralizes auth, routing, and cross-cutting concerns |
| **Dependency Injection** | All services | Services accept client interfaces in constructors, enabling mock-based testing |
| **Factory Pattern** | `createApp()` in each service | Produces Express apps with injected dependencies for testability |
| **Service Result** | `ServiceResult<T>` | Consistent `{success, data?, error?, statusCode}` pattern across all service methods |
| **Data Denormalization** | CartItem, OrderItem | Product name/price copied into cart/order items to reduce cross-service calls at read time |
| **Database per Service** | All services | Each service owns its data store; no shared state between services |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Language** | TypeScript (ES2020) |
| **Runtime** | Node.js |
| **Web Framework** | Express.js 4.x |
| **Authentication** | bcryptjs (password hashing) + UUID tokens |
| **ID Generation** | UUID v4 |
| **Testing** | Vitest + Supertest |
| **Linting** | ESLint + typescript-eslint |
| **Dev Server** | ts-node-dev (hot reload) |
| **Process Manager** | concurrently (multi-service dev) |
| **Storage** | In-memory (JavaScript `Map`) |

---

## Testing Architecture

```mermaid
graph TB
    subgraph UnitTests["Unit Tests (73 tests)"]
        UT_AUTH["Auth Service<br/>11 tests"]
        UT_PROD["Product Service<br/>16 tests"]
        UT_CART["Cart Service<br/>16 tests"]
        UT_ORD["Order Service<br/>15 tests"]
        UT_PAY["Payment Service<br/>15 tests"]
    end

    subgraph IntegTests["Integration Tests (10 tests)"]
        IT["Full E2E Flows<br/>All services running<br/>on random ports"]
    end

    UT_AUTH --- MOCK_NONE["No mocks needed"]
    UT_CART --- MOCK_PROD["MockProductClient"]
    UT_ORD --- MOCK_CART_PROD["MockCartClient<br/>MockProductClient"]
    UT_PAY --- MOCK_ORD_PROD["MockOrderClient<br/>MockProductClient"]

    IT --- REAL["All real services<br/>+ real HTTP clients"]
```

| Test Type | Count | Framework | Approach |
|-----------|-------|-----------|----------|
| **Unit** | 73 | Vitest + Supertest | Each service tested in isolation with mock dependencies |
| **Integration** | 10 | Vitest + Supertest | All services started on random ports, tested end-to-end |
| **Total** | **83** | | |

### Running Tests

```bash
npm test                 # All tests (unit + integration)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

---

## Known Limitations & Future Improvements

### Current Limitations

| Area | Limitation |
|------|-----------|
| **Storage** | In-memory only — all data lost on restart |
| **Token Expiry** | Tokens never expire |
| **Rate Limiting** | No rate limiting on any endpoint |
| **Caching** | No caching layer |
| **Communication** | Synchronous HTTP only (no async messaging) |
| **Observability** | No distributed tracing, structured logging, or metrics |
| **Health Checks** | Only basic `/health` on gateway |
| **RBAC** | No role-based access control (e.g., admin vs. customer) |
| **Pagination** | Product search returns all matching results |
| **Idempotency** | No idempotency keys for payment/order operations |

### Suggested Improvements

```mermaid
graph LR
    subgraph Phase1["Phase 1: Persistence"]
        DB["Add PostgreSQL / MongoDB"]
        REDIS["Add Redis for caching & sessions"]
    end

    subgraph Phase2["Phase 2: Resilience"]
        MQ["Add message queue (RabbitMQ / Kafka)"]
        CB["Circuit breaker pattern"]
        RETRY["Retry with backoff"]
    end

    subgraph Phase3["Phase 3: Production"]
        DOCKER["Dockerize all services"]
        K8S["Kubernetes deployment"]
        MON["Monitoring (Prometheus + Grafana)"]
        TRACE["Distributed tracing (Jaeger)"]
    end

    Phase1 --> Phase2 --> Phase3
```
