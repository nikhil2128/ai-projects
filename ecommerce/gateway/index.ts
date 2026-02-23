import { createGateway } from "./app";

const PORT = process.env.PORT ?? 3000;

const { app } = createGateway();

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log("Routing to microservices:");
  console.log("  /api/auth     -> Auth Service     (3001)");
  console.log("  /api/products -> Product Service   (3002)");
  console.log("  /api/cart     -> Cart Service      (3003)");
  console.log("  /api/orders   -> Order Service     (3004)");
  console.log("  /api/payments -> Payment Service   (3005)");
});
