# API Documentation

**Base URL:** `http://localhost:3000`

All requests go through the API Gateway. Protected endpoints require an `Authorization: Bearer <token>` header obtained from the login endpoint.

---

## Table of Contents

- [Quick Reference](#quick-reference)
- [Authentication](#authentication)
  - [Register](#register)
  - [Login](#login)
- [Products](#products)
  - [Search Products](#search-products)
  - [Get Product by ID](#get-product-by-id)
  - [Create Product](#create-product)
- [Cart](#cart)
  - [Get Cart](#get-cart)
  - [Add Item to Cart](#add-item-to-cart)
  - [Update Item Quantity](#update-item-quantity)
  - [Remove Item from Cart](#remove-item-from-cart)
  - [Clear Cart](#clear-cart)
- [Orders](#orders)
  - [Create Order](#create-order)
  - [List Orders](#list-orders)
  - [Get Order by ID](#get-order-by-id)
  - [Cancel Order](#cancel-order)
- [Payments](#payments)
  - [Process Payment](#process-payment)
  - [Get Payment by ID](#get-payment-by-id)
  - [Get Payment by Order](#get-payment-by-order)
  - [Refund Payment](#refund-payment)
- [Error Handling](#error-handling)
- [Complete Usage Example](#complete-usage-example)

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/health` | — | Gateway health check |
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login and get token |
| `GET` | `/api/products` | — | Search/list products |
| `GET` | `/api/products/:id` | — | Get product by ID |
| `POST` | `/api/products` | — | Create a product |
| `GET` | `/api/cart` | Yes | Get user's cart |
| `POST` | `/api/cart/items` | Yes | Add item to cart |
| `PUT` | `/api/cart/items/:productId` | Yes | Update item quantity |
| `DELETE` | `/api/cart/items/:productId` | Yes | Remove item from cart |
| `DELETE` | `/api/cart` | Yes | Clear entire cart |
| `POST` | `/api/orders` | Yes | Create order from cart |
| `GET` | `/api/orders` | Yes | List user's orders |
| `GET` | `/api/orders/:id` | Yes | Get order details |
| `POST` | `/api/orders/:id/cancel` | Yes | Cancel an order |
| `POST` | `/api/payments` | Yes | Process payment |
| `GET` | `/api/payments/:id` | Yes | Get payment details |
| `GET` | `/api/payments/order/:orderId` | Yes | Get payment by order |
| `POST` | `/api/payments/:id/refund` | Yes | Refund a payment |

---

## Authentication

### Register

Create a new user account.

```
POST /api/auth/register
```

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|------------|
| `email` | string | Yes | Must be a valid email format, must be unique |
| `name` | string | Yes | Must not be empty |
| `password` | string | Yes | Minimum 8 characters |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice Johnson",
    "password": "securepass123"
  }'
```

**Success Response — `201 Created`:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "alice@example.com",
  "name": "Alice Johnson",
  "createdAt": "2026-02-23T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing or empty fields | `{ "error": "Email, name, and password are required" }` |
| `400` | Invalid email format | `{ "error": "Invalid email format" }` |
| `400` | Short password | `{ "error": "Password must be at least 8 characters" }` |
| `409` | Email already exists | `{ "error": "Email already registered" }` |

---

### Login

Authenticate and receive a bearer token.

```
POST /api/auth/login
```

**Request Body:**

| Field | Type | Required |
|-------|------|:--------:|
| `email` | string | Yes |
| `password` | string | Yes |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepass123"
  }'
```

**Success Response — `200 OK`:**

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "alice@example.com",
  "token": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

> Save the `token` value. Use it in the `Authorization` header for all protected endpoints:
> `Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479`

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing fields | `{ "error": "Email and password are required" }` |
| `401` | Wrong email or password | `{ "error": "Invalid credentials" }` |

---

## Products

### Search Products

List and search products with optional filters.

```
GET /api/products
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `keyword` | string | No | Searches product `name` and `description` (case-insensitive) |
| `category` | string | No | Exact match on product category |
| `minPrice` | number | No | Minimum price (inclusive) |
| `maxPrice` | number | No | Maximum price (inclusive) |

**Example Requests:**

```bash
# List all products
curl http://localhost:3000/api/products

# Search by keyword
curl "http://localhost:3000/api/products?keyword=phone"

# Filter by category and price range
curl "http://localhost:3000/api/products?category=electronics&minPrice=100&maxPrice=500"
```

**Success Response — `200 OK`:**

```json
[
  {
    "id": "prod-001",
    "name": "Wireless Headphones",
    "description": "Noise-cancelling over-ear headphones",
    "price": 79.99,
    "category": "electronics",
    "stock": 50,
    "imageUrl": "https://example.com/headphones.jpg",
    "createdAt": "2026-02-23T08:00:00.000Z"
  },
  {
    "id": "prod-002",
    "name": "Phone Case",
    "description": "Durable silicone phone case",
    "price": 14.99,
    "category": "accessories",
    "stock": 200,
    "imageUrl": "https://example.com/case.jpg",
    "createdAt": "2026-02-23T08:05:00.000Z"
  }
]
```

Returns an empty array `[]` if no products match the filters.

---

### Get Product by ID

Fetch a single product by its unique identifier.

```
GET /api/products/:id
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Product UUID |

**Example Request:**

```bash
curl http://localhost:3000/api/products/prod-001
```

**Success Response — `200 OK`:**

```json
{
  "id": "prod-001",
  "name": "Wireless Headphones",
  "description": "Noise-cancelling over-ear headphones",
  "price": 79.99,
  "category": "electronics",
  "stock": 50,
  "imageUrl": "https://example.com/headphones.jpg",
  "createdAt": "2026-02-23T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `404` | Product not found | `{ "error": "Product not found" }` |

---

### Create Product

Add a new product to the catalog.

```
POST /api/products
```

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|------------|
| `name` | string | Yes | Must not be empty |
| `description` | string | Yes | Must not be empty |
| `price` | number | Yes | Must be greater than 0 |
| `category` | string | Yes | Must not be empty |
| `stock` | number | Yes | Must be 0 or greater |
| `imageUrl` | string | No | Optional product image URL |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "Noise-cancelling over-ear headphones",
    "price": 79.99,
    "category": "electronics",
    "stock": 50,
    "imageUrl": "https://example.com/headphones.jpg"
  }'
```

**Success Response — `201 Created`:**

```json
{
  "id": "prod-001",
  "name": "Wireless Headphones",
  "description": "Noise-cancelling over-ear headphones",
  "price": 79.99,
  "category": "electronics",
  "stock": 50,
  "imageUrl": "https://example.com/headphones.jpg",
  "createdAt": "2026-02-23T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing required fields | `{ "error": "Name, description, price, category, and stock are required" }` |
| `400` | Price <= 0 | `{ "error": "Price must be greater than 0" }` |
| `400` | Negative stock | `{ "error": "Stock cannot be negative" }` |

---

## Cart

All cart endpoints require authentication.

### Get Cart

Retrieve the current user's shopping cart.

```
GET /api/cart
```

**Headers:**

```
Authorization: Bearer <token>
```

**Example Request:**

```bash
curl http://localhost:3000/api/cart \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

```json
{
  "id": "cart-001",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "items": [
    {
      "productId": "prod-001",
      "productName": "Wireless Headphones",
      "price": 79.99,
      "quantity": 2
    }
  ],
  "updatedAt": "2026-02-23T10:30:00.000Z"
}
```

Returns a cart with an empty `items` array if the user has no cart yet.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing or invalid token | `{ "error": "Unauthorized" }` |

---

### Add Item to Cart

Add a product to the user's shopping cart. If the product already exists in the cart, its quantity is updated.

```
POST /api/cart/items
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|------------|
| `productId` | string | Yes | Must be a valid product ID |
| `quantity` | number | Yes | Must be greater than 0 |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-001",
    "quantity": 2
  }'
```

**Success Response — `200 OK`:**

```json
{
  "id": "cart-001",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "items": [
    {
      "productId": "prod-001",
      "productName": "Wireless Headphones",
      "price": 79.99,
      "quantity": 2
    }
  ],
  "updatedAt": "2026-02-23T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing fields | `{ "error": "Product ID and quantity are required" }` |
| `400` | Quantity <= 0 | `{ "error": "Quantity must be greater than 0" }` |
| `400` | Insufficient stock | `{ "error": "Insufficient stock. Available: 5" }` |
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `404` | Product not found | `{ "error": "Product not found" }` |

---

### Update Item Quantity

Change the quantity of a product already in the cart.

```
PUT /api/cart/items/:productId
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | string | The product's ID in the cart |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|------------|
| `quantity` | number | Yes | Must be >= 0 (0 removes the item) |

**Example Request:**

```bash
curl -X PUT http://localhost:3000/api/cart/items/prod-001 \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 3 }'
```

**Success Response — `200 OK`:**

Returns the updated cart object.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing quantity | `{ "error": "Quantity is required" }` |
| `400` | Insufficient stock | `{ "error": "Insufficient stock. Available: 5" }` |
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `404` | Item not in cart | `{ "error": "Item not found in cart" }` |

---

### Remove Item from Cart

Remove a specific product from the cart.

```
DELETE /api/cart/items/:productId
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | string | The product's ID to remove |

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/cart/items/prod-001 \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

Returns the updated cart object.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `404` | Item not in cart | `{ "error": "Item not found in cart" }` |

---

### Clear Cart

Remove all items from the user's cart.

```
DELETE /api/cart
```

**Headers:**

```
Authorization: Bearer <token>
```

**Example Request:**

```bash
curl -X DELETE http://localhost:3000/api/cart \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

Returns the cart object with an empty `items` array.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |

---

## Orders

All order endpoints require authentication.

### Create Order

Create a new order from the items currently in the user's cart. This operation:
1. Validates that the cart is not empty
2. Checks stock availability for every item
3. Decrements stock for each product
4. Creates the order with status `pending`
5. Clears the user's cart

```
POST /api/orders
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|:--------:|------------|
| `shippingAddress` | string | Yes | Must not be empty |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Content-Type: application/json" \
  -d '{ "shippingAddress": "123 Main St, Springfield, IL 62701" }'
```

**Success Response — `201 Created`:**

```json
{
  "id": "order-001",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "items": [
    {
      "productId": "prod-001",
      "productName": "Wireless Headphones",
      "price": 79.99,
      "quantity": 2
    }
  ],
  "totalAmount": 159.98,
  "status": "pending",
  "shippingAddress": "123 Main St, Springfield, IL 62701",
  "createdAt": "2026-02-23T11:00:00.000Z",
  "updatedAt": "2026-02-23T11:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing shipping address | `{ "error": "Shipping address is required" }` |
| `400` | Cart is empty | `{ "error": "Cart is empty" }` |
| `400` | Insufficient stock | `{ "error": "Insufficient stock for Wireless Headphones" }` |
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |

---

### List Orders

Get all orders for the authenticated user.

```
GET /api/orders
```

**Headers:**

```
Authorization: Bearer <token>
```

**Example Request:**

```bash
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

```json
[
  {
    "id": "order-001",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Wireless Headphones",
        "price": 79.99,
        "quantity": 2
      }
    ],
    "totalAmount": 159.98,
    "status": "confirmed",
    "shippingAddress": "123 Main St, Springfield, IL 62701",
    "paymentId": "pay-001",
    "createdAt": "2026-02-23T11:00:00.000Z",
    "updatedAt": "2026-02-23T11:05:00.000Z"
  }
]
```

Returns an empty array `[]` if the user has no orders.

---

### Get Order by ID

Fetch details of a specific order.

```
GET /api/orders/:id
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Order UUID |

**Example Request:**

```bash
curl http://localhost:3000/api/orders/order-001 \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

Returns the full order object.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `403` | Order belongs to another user | `{ "error": "Order not found" }` |
| `404` | Order does not exist | `{ "error": "Order not found" }` |

---

### Cancel Order

Cancel an existing order. Only orders in `pending` or `confirmed` status can be cancelled. Cancelling an order restores the stock for all items.

```
POST /api/orders/:id/cancel
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Order UUID |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/orders/order-001/cancel \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

Returns the order object with `status: "cancelled"`.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Order cannot be cancelled (shipped/delivered) | `{ "error": "Order cannot be cancelled" }` |
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `403` | Order belongs to another user | `{ "error": "Order not found" }` |
| `404` | Order does not exist | `{ "error": "Order not found" }` |

---

## Payments

All payment endpoints require authentication.

### Process Payment

Submit a payment for a pending order.

**Constraints:**
- The order must be in `pending` status
- The order must belong to the authenticated user
- The order must not already have a payment

```
POST /api/payments
```

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

| Field | Type | Required | Allowed Values |
|-------|------|:--------:|----------------|
| `orderId` | string | Yes | Valid order ID |
| `method` | string | Yes | `credit_card`, `debit_card`, `paypal` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "method": "credit_card"
  }'
```

**Success Response — `201 Created`:**

```json
{
  "id": "pay-001",
  "orderId": "order-001",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 159.98,
  "method": "credit_card",
  "status": "completed",
  "transactionId": "txn_a1b2c3d4e5f6",
  "createdAt": "2026-02-23T11:05:00.000Z"
}
```

On successful payment, the associated order's status is automatically updated to `confirmed`.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing fields | `{ "error": "Order ID and payment method are required" }` |
| `400` | Invalid payment method | `{ "error": "Invalid payment method" }` |
| `400` | Order not pending | `{ "error": "Order is not in pending status" }` |
| `400` | Payment already exists | `{ "error": "Payment already exists for this order" }` |
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `403` | Order belongs to another user | `{ "error": "Order not found" }` |
| `404` | Order does not exist | `{ "error": "Order not found" }` |

---

### Get Payment by ID

Fetch details of a specific payment.

```
GET /api/payments/:id
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Payment UUID |

**Example Request:**

```bash
curl http://localhost:3000/api/payments/pay-001 \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

Returns the full payment object.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `403` | Payment belongs to another user | `{ "error": "Payment not found" }` |
| `404` | Payment does not exist | `{ "error": "Payment not found" }` |

---

### Get Payment by Order

Look up the payment associated with a specific order.

```
GET /api/payments/order/:orderId
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderId` | string | Order UUID |

**Example Request:**

```bash
curl http://localhost:3000/api/payments/order/order-001 \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

Returns the payment object for the given order.

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `403` | Payment belongs to another user | `{ "error": "Payment not found" }` |
| `404` | No payment for this order | `{ "error": "Payment not found" }` |

---

### Refund Payment

Refund a completed payment. This operation:
1. Marks the payment as `refunded`
2. Updates the order status to `cancelled`
3. Restores product stock for all items in the order

```
POST /api/payments/:id/refund
```

**Headers:**

```
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Payment UUID |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/payments/pay-001/refund \
  -H "Authorization: Bearer f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Success Response — `200 OK`:**

```json
{
  "id": "pay-001",
  "orderId": "order-001",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 159.98,
  "method": "credit_card",
  "status": "refunded",
  "transactionId": "txn_a1b2c3d4e5f6",
  "createdAt": "2026-02-23T11:05:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Payment not in completed status | `{ "error": "Payment cannot be refunded" }` |
| `401` | Missing/invalid token | `{ "error": "Unauthorized" }` |
| `403` | Payment belongs to another user | `{ "error": "Payment not found" }` |
| `404` | Payment does not exist | `{ "error": "Payment not found" }` |

---

## Error Handling

All error responses follow a consistent JSON format:

```json
{
  "error": "Human-readable error message"
}
```

### Standard HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | OK | Successful read, update, or delete |
| `201` | Created | Successful resource creation (register, create product, create order, process payment) |
| `400` | Bad Request | Validation errors, business rule violations |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Attempting to access another user's resource |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Duplicate resource (e.g., email already registered) |
| `500` | Internal Server Error | Unexpected server error |

### Business Rule Errors (returned as 400)

| Domain | Rule |
|--------|------|
| Auth | Email must be unique |
| Auth | Password must be at least 8 characters |
| Product | Price must be greater than 0 |
| Product | Stock cannot be negative |
| Cart | Cannot add more items than available stock |
| Order | Cannot create order with empty cart |
| Order | Cannot cancel shipped or delivered orders |
| Payment | Only `pending` orders can be paid |
| Payment | Each order can only have one payment |
| Payment | Only `completed` payments can be refunded |

---

## Complete Usage Example

Here's the full purchase lifecycle from registration to refund, step by step.

### Step 1: Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice Johnson",
    "password": "securepass123"
  }'
```

### Step 2: Log in to get a token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepass123"
  }'
# Save the "token" from the response
```

### Step 3: Create a product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "Premium noise-cancelling headphones",
    "price": 79.99,
    "category": "electronics",
    "stock": 100
  }'
# Save the product "id" from the response
```

### Step 4: Browse products

```bash
curl "http://localhost:3000/api/products?keyword=headphones"
```

### Step 5: Add product to cart

```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "<product-id>",
    "quantity": 2
  }'
```

### Step 6: View cart

```bash
curl http://localhost:3000/api/cart \
  -H "Authorization: Bearer <token>"
```

### Step 7: Place an order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "shippingAddress": "123 Main St, Springfield, IL 62701" }'
# Save the order "id" from the response
```

### Step 8: Pay for the order

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "<order-id>",
    "method": "credit_card"
  }'
# Save the payment "id" from the response
```

### Step 9: Check order status (should be "confirmed")

```bash
curl http://localhost:3000/api/orders/<order-id> \
  -H "Authorization: Bearer <token>"
```

### Step 10: Request a refund (optional)

```bash
curl -X POST http://localhost:3000/api/payments/<payment-id>/refund \
  -H "Authorization: Bearer <token>"
```
