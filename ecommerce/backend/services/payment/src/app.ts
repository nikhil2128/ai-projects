import express from "express";
import { OrderServiceClient, ProductServiceClient } from "../../../shared/types";
import { HttpOrderClient, HttpProductClient } from "../../../shared/http-clients";
import { PaymentStore } from "./store";
import { PaymentService } from "./service";
import { createPaymentRoutes } from "./routes";

const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL ?? "http://localhost:3004";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? "http://localhost:3002";

export function createApp(
  store?: PaymentStore,
  orderClient?: OrderServiceClient,
  productClient?: ProductServiceClient
) {
  const app = express();
  const appStore = store ?? new PaymentStore();
  const order = orderClient ?? new HttpOrderClient(ORDER_SERVICE_URL);
  const product = productClient ?? new HttpProductClient(PRODUCT_SERVICE_URL);
  const paymentService = new PaymentService(appStore, order, product);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "payment" });
  });

  app.use("/", createPaymentRoutes(paymentService));

  return { app, store: appStore, service: paymentService };
}
