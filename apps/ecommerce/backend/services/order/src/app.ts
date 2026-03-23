import express from "express";
import { Pool } from "pg";
import {
  CartServiceClient,
  ProductServiceClient,
  OrderEventPublisher,
} from "../../../shared/types";
import { HttpCartClient, HttpProductClient } from "../../../shared/http-clients";
import {
  SnsOrderEventPublisher,
  LocalOrderEventPublisher,
} from "../../../shared/event-publisher";
import { OrderStore } from "./store";
import { OrderService } from "./service";
import { createOrderRoutes } from "./routes";

const CART_SERVICE_URL =
  process.env.CART_SERVICE_URL ?? "http://localhost:3003";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL ?? "http://localhost:3002";
const ORDER_EVENTS_TOPIC_ARN = process.env.ORDER_EVENTS_TOPIC_ARN;

export function createApp(
  pool: Pool,
  cartClient?: CartServiceClient,
  productClient?: ProductServiceClient,
  eventPublisher?: OrderEventPublisher
) {
  const app = express();
  const store = new OrderStore(pool);
  const cart = cartClient ?? new HttpCartClient(CART_SERVICE_URL);
  const product = productClient ?? new HttpProductClient(PRODUCT_SERVICE_URL);
  const publisher =
    eventPublisher ??
    (ORDER_EVENTS_TOPIC_ARN
      ? new SnsOrderEventPublisher(ORDER_EVENTS_TOPIC_ARN)
      : new LocalOrderEventPublisher());
  const service = new OrderService(store, cart, product, publisher);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order" });
  });

  app.use("/", createOrderRoutes(service));

  return { app, store, service };
}
